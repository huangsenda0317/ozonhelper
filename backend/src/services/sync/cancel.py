"""同步任务取消 — 删除店铺时终止进行中的 Celery / 内联同步"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.cache import cache_delete, cache_get, cache_set
from src.models.tracking_sync import SyncJob

logger = logging.getLogger(__name__)

STORE_SYNC_CANCEL_PREFIX = 'store_sync_cancel:'
SYNC_JOB_CELERY_PREFIX = 'sync_job_celery:'
_CELERY_KEY_TTL = 86_400


class SyncCancelledError(Exception):
    """店铺删除或用户取消导致同步中断。"""


def sync_job_celery_key(job_id: str | uuid.UUID) -> str:
    return f'{SYNC_JOB_CELERY_PREFIX}{job_id}'


def store_sync_cancel_key(store_id: str | uuid.UUID) -> str:
    return f'{STORE_SYNC_CANCEL_PREFIX}{store_id}'


def register_sync_celery_task_sync(job_id: str, celery_task_id: str) -> None:
    """同步派发路径注册 Celery task id（dispatch 为 sync 上下文）。"""
    import redis

    from src.config import get_settings

    client = redis.from_url(get_settings().redis_url, decode_responses=True)
    client.setex(sync_job_celery_key(job_id), _CELERY_KEY_TTL, celery_task_id)


async def register_sync_celery_task(job_id: str, celery_task_id: str) -> None:
    await cache_set(sync_job_celery_key(job_id), celery_task_id, expire_seconds=_CELERY_KEY_TTL)


def revoke_celery_task(celery_task_id: str, *, terminate: bool = False) -> None:
    from src.worker.app import celery_app

    celery_app.control.revoke(celery_task_id, terminate=terminate)


def revoke_sync_celery_tasks_for_jobs(job_ids: list[str], *, terminate: bool = True) -> int:
    """通过 Celery inspect 按 job_id 参数 revoke（Redis 未记录 task id 时的兜底）。"""
    from src.worker.app import celery_app

    if not job_ids:
        return 0
    job_id_set = set(job_ids)
    revoked = 0
    try:
        inspect = celery_app.control.inspect(timeout=3.0)
        for fetch in (inspect.active, inspect.reserved, inspect.scheduled):
            buckets = fetch() or {}
            for tasks in buckets.values():
                for task in tasks or []:
                    if task.get('name') != 'sync_store_job':
                        continue
                    args = task.get('args') or []
                    if not args or str(args[0]) not in job_id_set:
                        continue
                    task_id = task.get('id')
                    if task_id:
                        revoke_celery_task(task_id, terminate=terminate)
                        revoked += 1
    except Exception:
        logger.exception('inspect celery sync tasks failed')
    return revoked


async def cancel_store_sync_jobs(
    db: AsyncSession,
    store_id: uuid.UUID,
    *,
    reason: str = '店铺已删除，同步已取消',
) -> int:
    """取消店铺 pending/running 同步：Redis 标记 + Celery revoke + inspect 兜底。"""
    await cache_set(store_sync_cancel_key(store_id), '1', expire_seconds=_CELERY_KEY_TTL)

    jobs = (
        await db.execute(
            select(SyncJob).where(
                SyncJob.store_id == store_id,
                SyncJob.status.in_(('pending', 'running')),
            )
        )
    ).scalars().all()

    now = datetime.now(UTC)
    job_id_strs = [str(job.id) for job in jobs]
    for job in jobs:
        was_running = job.status == 'running'
        job.status = 'failed'
        job.error_message = reason
        job.finished_at = now
        celery_id = await cache_get(sync_job_celery_key(str(job.id)))
        if celery_id:
            try:
                revoke_celery_task(celery_id, terminate=was_running)
            except Exception:
                logger.warning('revoke sync celery task failed: job=%s celery=%s', job.id, celery_id)
            await cache_delete(sync_job_celery_key(str(job.id)))

    revoke_sync_celery_tasks_for_jobs(job_id_strs, terminate=True)
    return len(jobs)


async def force_fail_running_sync_jobs(db: AsyncSession, store_id: uuid.UUID) -> None:
    """等待超时后强制标记 running 任务失败，便于继续删除。"""
    now = datetime.now(UTC)
    await db.execute(
        update(SyncJob)
        .where(
            SyncJob.store_id == store_id,
            SyncJob.status.in_(('pending', 'running')),
        )
        .values(
            status='failed',
            error_message='店铺已删除，同步已取消',
            finished_at=now,
        )
    )


async def wait_store_sync_quiescent(
    db: AsyncSession,
    store_id: uuid.UUID,
    *,
    timeout: float = 30.0,
    poll_interval: float = 0.25,
) -> bool:
    """等待店铺无 pending/running 同步任务（协作式取消或 Celery 终止后）。"""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        db.expire_all()
        running = (
            await db.execute(
                select(func.count())
                .select_from(SyncJob)
                .where(
                    SyncJob.store_id == store_id,
                    SyncJob.status.in_(('pending', 'running')),
                )
            )
        ).scalar_one()
        if running == 0:
            return True
        await asyncio.sleep(poll_interval)
    return False


async def ensure_store_sync_active(store_id: uuid.UUID) -> None:
    """同步循环内调用：店铺已标记取消则中断。"""
    if await is_store_sync_cancelled(store_id):
        raise SyncCancelledError()


async def is_store_sync_cancelled(store_id: uuid.UUID) -> bool:
    return bool(await cache_get(store_sync_cancel_key(store_id)))


async def clear_store_sync_cancel(store_id: uuid.UUID) -> None:
    await cache_delete(store_sync_cancel_key(store_id))
