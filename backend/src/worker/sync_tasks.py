"""Celery 店铺同步任务"""

import uuid

from src.models.tracking_sync import SyncJob
from src.services.sync.engine import execute_sync_job
from src.worker.app import celery_app
from src.worker.async_runner import run_async_task


@celery_app.task(name='sync_store_job', bind=True, max_retries=5)
def sync_store_job(self, job_id: str):
    async def _run(db):
        await execute_sync_job(db, uuid.UUID(job_id))

    try:
        run_async_task(_run)
    except LookupError as exc:
        # 任务入队早于 DB 提交时短暂不可见，快速重试
        raise self.retry(exc=exc, countdown=2, max_retries=5) from exc
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60) from exc


@celery_app.task(name='sync_all_active_stores')
def sync_all_active_stores():
    from sqlalchemy import select

    from src.models.store import Store

    async def _run(db):
        stores = (await db.execute(select(Store).where(Store.is_active == True))).scalars().all()
        for store in stores:
            job = SyncJob(store_id=store.id, job_type='scheduled', scope='all', status='pending')
            db.add(job)
            await db.flush()
            sync_store_job.delay(str(job.id))

    run_async_task(_run)
