"""店铺生命周期 — 删除时级联清理同步数据"""

import uuid

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.store import Store
from src.models.tracking_sync import (
    Alert,
    AnalyticsDaily,
    ExchangeRate,
    FinanceTransaction,
    InventoryAlertConfig,
    InventorySnapshot,
    ListingItem,
    ListingJob,
    LogisticsAlertConfig,
    LogisticsAlertEvent,
    OperationLog,
    PriceSnapshot,
    ProfitConfig,
    ReturnOrder,
    ReviewAlert,
    SyncedOrder,
    SyncedProduct,
    SyncJob,
)

from src.services.sync.cancel import (
    cancel_store_sync_jobs,
    clear_store_sync_cancel,
    force_fail_running_sync_jobs,
    revoke_sync_celery_tasks_for_jobs,
    wait_store_sync_quiescent,
)

# 直接含 store_id 的子表；ListingItem 经 listing_jobs 关联，需单独处理
_STORE_CHILD_MODELS = (
    Alert,
    SyncedProduct,
    InventorySnapshot,
    SyncedOrder,
    AnalyticsDaily,
    SyncJob,
    InventoryAlertConfig,
    PriceSnapshot,
    ProfitConfig,
    ExchangeRate,
    FinanceTransaction,
    ReturnOrder,
    LogisticsAlertConfig,
    LogisticsAlertEvent,
    ReviewAlert,
    OperationLog,
    ListingJob,
)


async def delete_store_with_data(db: AsyncSession, store: Store) -> None:
    """删除店铺及其全部 ERP 同步子表数据。进行中的同步会先被取消。"""
    store_id: uuid.UUID = store.id

    await cancel_store_sync_jobs(db, store_id)
    await db.commit()

    await db.execute(
        update(ListingJob)
        .where(
            ListingJob.store_id == store_id,
            ListingJob.status.in_(('pending', 'running')),
        )
        .values(status='failed', error_message='店铺已删除')
    )
    await db.commit()

    # 协作式取消后短暂等待 worker 退出写库循环（通常 1–3 秒）
    await wait_store_sync_quiescent(db, store_id, timeout=5.0)
    revoke_sync_celery_tasks_for_jobs(
        [
            str(jid)
            for jid in (
                await db.execute(
                    select(SyncJob.id).where(
                        SyncJob.store_id == store_id,
                        SyncJob.status.in_(('pending', 'running')),
                    )
                )
            ).scalars().all()
        ],
        terminate=True,
    )
    await force_fail_running_sync_jobs(db, store_id)
    await db.commit()

    await db.execute(
        delete(ListingItem).where(
            ListingItem.job_id.in_(select(ListingJob.id).where(ListingJob.store_id == store_id))
        )
    )
    for model in _STORE_CHILD_MODELS:
        await db.execute(delete(model).where(model.store_id == store_id))
    await db.execute(delete(Store).where(Store.id == store_id))
    await clear_store_sync_cancel(store_id)
