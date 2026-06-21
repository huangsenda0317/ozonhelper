"""Phase2 Celery 任务"""

import uuid

from src.config import get_settings
from src.services.phase2.listing_worker import process_listing_job
from src.services.phase2.sync_extra import (
    run_logistics_alert_check,
    sync_finance,
    sync_prices,
    sync_returns,
    sync_review_alerts,
)
from src.services.sync.engine import run_sync_scope
from src.worker.app import celery_app
from src.worker.async_runner import run_async_task


@celery_app.task(name='process_listing_job_task', bind=True, max_retries=3)
def process_listing_job_task(self, job_id: str):
    async def _run(db):
        await process_listing_job(db, uuid.UUID(job_id))
        await db.commit()

    try:
        run_async_task(_run)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30) from exc


@celery_app.task(name='sync_store_prices')
def sync_store_prices_task(store_id: str):
    from sqlalchemy import select

    from src.models.store import Store

    async def _run(db):
        store = (await db.execute(select(Store).where(Store.id == uuid.UUID(store_id)))).scalar_one_or_none()
        if store:
            await sync_prices(db, store)
            await db.commit()

    run_async_task(_run)


@celery_app.task(name='sync_store_finance')
def sync_store_finance_task(store_id: str):
    from sqlalchemy import select

    from src.models.store import Store

    async def _run(db):
        store = (await db.execute(select(Store).where(Store.id == uuid.UUID(store_id)))).scalar_one_or_none()
        if store:
            await sync_finance(db, store)
            await sync_returns(db, store)
            await db.commit()

    run_async_task(_run)


@celery_app.task(name='check_logistics_alerts_task')
def check_logistics_alerts_task(store_id: str):
    from sqlalchemy import select

    from src.models.store import Store

    async def _run(db):
        store = (await db.execute(select(Store).where(Store.id == uuid.UUID(store_id)))).scalar_one_or_none()
        if store:
            await run_logistics_alert_check(db, store)
            await sync_review_alerts(db, store)
            await db.commit()

    run_async_task(_run)


@celery_app.task(name='phase2_sync_all_stores')
def phase2_sync_all_stores():
    from sqlalchemy import select

    from src.models.store import Store

    async def _run(db):
        stores = (await db.execute(select(Store).where(Store.is_active == True))).scalars().all()
        for store in stores:
            sync_store_prices_task.delay(str(store.id))
            sync_store_finance_task.delay(str(store.id))
            check_logistics_alerts_task.delay(str(store.id))

    run_async_task(_run)


def dispatch_listing_job(job_id: str) -> None:
    settings = get_settings()
    if settings.sync_inline:
        async def _run(db):
            await process_listing_job(db, uuid.UUID(job_id))
            await db.commit()

        run_async_task(_run)
    else:
        process_listing_job_task.delay(job_id)
