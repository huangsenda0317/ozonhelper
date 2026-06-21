"""店铺生命周期 — 删除时级联清理同步数据"""

import uuid

from sqlalchemy import delete, select
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
    """删除店铺及其全部 ERP 同步子表数据。"""
    store_id: uuid.UUID = store.id
    await db.execute(
        delete(ListingItem).where(
            ListingItem.job_id.in_(select(ListingJob.id).where(ListingJob.store_id == store_id))
        )
    )
    for model in _STORE_CHILD_MODELS:
        await db.execute(delete(model).where(model.store_id == store_id))
    await db.delete(store)
