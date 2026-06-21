"""Celery 店铺同步任务"""

import uuid

from celery.exceptions import MaxRetriesExceededError

from src.models.tracking_sync import SyncJob
from src.services.sync.engine import execute_sync_job, fail_sync_job
from src.worker.app import celery_app
from src.worker.async_runner import run_async_task

_CELERY_FAIL_MSG = 'Celery 同步任务未能启动，请确认 Worker 已运行并重试'


def _fail_sync_job(job_id: str, message: str) -> None:
    async def _run(db):
        await fail_sync_job(db, uuid.UUID(job_id), message)

    try:
        run_async_task(_run)
    except Exception:
        pass


@celery_app.task(name='sync_store_job', bind=True, max_retries=5)
def sync_store_job(self, job_id: str):
    async def _run(db):
        await execute_sync_job(db, uuid.UUID(job_id))

    try:
        run_async_task(_run)
    except LookupError as exc:
        try:
            raise self.retry(exc=exc, countdown=2, max_retries=5) from exc
        except MaxRetriesExceededError:
            _fail_sync_job(job_id, '同步任务未找到（可能入队早于数据库提交），请重试')
            raise
    except Exception as exc:
        try:
            raise self.retry(exc=exc, countdown=60) from exc
        except MaxRetriesExceededError:
            _fail_sync_job(job_id, _CELERY_FAIL_MSG)
            raise


@celery_app.task(name='sync_all_active_stores')
def sync_all_active_stores():
    from sqlalchemy import select

    from src.models.store import Store

    async def _run(db):
        stores = (await db.execute(select(Store).where(Store.is_active == True))).scalars().all()
        job_ids: list[str] = []
        for store in stores:
            job = SyncJob(store_id=store.id, job_type='scheduled', scope='all', status='pending')
            db.add(job)
            await db.flush()
            job_ids.append(str(job.id))
        return job_ids

    job_ids = run_async_task(_run)
    for job_id in job_ids:
        sync_store_job.delay(job_id)
