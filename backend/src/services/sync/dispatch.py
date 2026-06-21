"""同步任务派发 — Celery 或 API 进程内后台执行"""

import logging
import time
import uuid

from fastapi import BackgroundTasks

from src.config import get_settings
from src.services.sync.engine import execute_sync_job, fail_sync_job
from src.worker.async_runner import run_async_task
from src.worker.sync_tasks import sync_store_job

logger = logging.getLogger(__name__)

_INLINE_FAIL_MSG = '内联同步未能启动，请查看 API 日志或改用 SYNC_INLINE=false 并启动 Celery Worker'


def _fail_sync_job_blocking(job_id: str, message: str) -> None:
    async def _run(db):
        await fail_sync_job(db, uuid.UUID(job_id), message)

    try:
        run_async_task(_run)
    except Exception:
        logger.exception('标记 SyncJob %s 失败状态时出错', job_id)


def run_sync_job_blocking(job_id: str) -> None:
    """在后台线程中执行同步（供 BackgroundTasks / 本地开发使用）。"""

    async def _run(db):
        await execute_sync_job(db, uuid.UUID(job_id))

    for attempt in range(5):
        try:
            run_async_task(_run)
            return
        except LookupError:
            if attempt < 4:
                time.sleep(0.2 * (attempt + 1))
                continue
            logger.error('SyncJob %s 在重试后仍不存在，跳过执行', job_id)
            _fail_sync_job_blocking(job_id, '同步任务未找到，请重试')
        except Exception:
            logger.exception('SyncJob %s 内联同步失败', job_id)
            _fail_sync_job_blocking(job_id, _INLINE_FAIL_MSG)
            return


def dispatch_sync_job(job_id: str, background_tasks: BackgroundTasks | None = None) -> None:
    """提交后调用：优先 Celery；本地 sync_inline 时走 API 后台任务。"""
    settings = get_settings()
    if settings.sync_inline and background_tasks is not None:
        background_tasks.add_task(run_sync_job_blocking, job_id)
        return
    sync_store_job.apply_async(args=[job_id], countdown=1)
