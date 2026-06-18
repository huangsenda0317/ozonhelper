"""刊登 Celery 处理"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tracking_sync import ListingItem, ListingJob, SyncedProduct
from src.models.store import Store
from src.services.stores.credentials import ozon_client_for_store

logger = logging.getLogger(__name__)


def _build_import_item(row: ListingItem) -> dict:
    item: dict = {
        'offer_id': row.offer_id,
        'name': row.name,
        'description_category_id': int(row.category_id) if row.category_id and row.category_id.isdigit() else 0,
        'price': str(row.price or 0),
        'currency_code': 'RUB',
        'vat': '0',
        'images': [row.primary_image_url] if row.primary_image_url else [],
    }
    if row.attributes_json:
        item['attributes'] = row.attributes_json
    return item


async def process_listing_job(db: AsyncSession, job_id: uuid.UUID) -> None:
    job = (await db.execute(select(ListingJob).where(ListingJob.id == job_id))).scalar_one_or_none()
    if not job:
        return
    store = (await db.execute(select(Store).where(Store.id == job.store_id))).scalar_one_or_none()
    if not store:
        job.status = 'failed'
        job.error_message = '店铺不存在'
        return

    job.status = 'running'
    await db.flush()
    client = ozon_client_for_store(store)
    items = (
        await db.execute(
            select(ListingItem).where(ListingItem.job_id == job_id, ListingItem.status.in_(['pending', 'failed']))
        )
    ).scalars().all()

    success = job.success_count
    failed = job.failed_count
    for i in range(0, len(items), 100):
        batch = items[i : i + 100]
        payload = [_build_import_item(it) for it in batch]
        for it in batch:
            it.status = 'importing'
        await db.flush()
        try:
            resp = await client.product_import(items=payload)
            task_id = (resp.get('result') or resp).get('task_id')
            for it in batch:
                it.ozon_task_id = str(task_id) if task_id else None
            if task_id:
                info = await client.product_import_info(task_id=task_id)
                result_items = (info.get('result') or info).get('items') or []
                by_offer = {str(r.get('offer_id')): r for r in result_items}
                for it in batch:
                    ri = by_offer.get(it.offer_id) or {}
                    if ri.get('status') == 'failed':
                        it.status = 'failed'
                        it.error_message = str(ri.get('errors') or 'import failed')
                        failed += 1
                    else:
                        it.status = 'success'
                        success += 1
                        sp = SyncedProduct(
                            store_id=store.id,
                            product_id=str(ri.get('product_id') or it.offer_id),
                            offer_id=it.offer_id,
                            name=it.name,
                            price=it.price,
                            listing_job_id=job.id,
                        )
                        db.add(sp)
            else:
                for it in batch:
                    it.status = 'success'
                    success += 1
        except Exception as exc:
            logger.exception('listing batch failed')
            for it in batch:
                it.status = 'failed'
                it.error_message = str(exc)[:500]
                failed += 1

    job.success_count = success
    job.failed_count = failed
    job.status = 'succeeded' if failed == 0 else ('partial' if success > 0 else 'failed')
    job.finished_at = datetime.now(UTC)
