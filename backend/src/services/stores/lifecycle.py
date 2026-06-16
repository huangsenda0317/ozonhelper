"""店铺生命周期 — 删除时级联清理同步数据"""

import uuid

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.store import Store
from src.models.tracking_sync import (
    Alert,
    AnalyticsDaily,
    InventoryAlertConfig,
    InventorySnapshot,
    SyncedOrder,
    SyncedProduct,
    SyncJob,
)

_STORE_CHILD_MODELS = (
    Alert,
    SyncedProduct,
    InventorySnapshot,
    SyncedOrder,
    AnalyticsDaily,
    SyncJob,
    InventoryAlertConfig,
)


async def delete_store_with_data(db: AsyncSession, store: Store) -> None:
    """删除店铺及其全部 ERP 同步子表数据。"""
    store_id: uuid.UUID = store.id
    for model in _STORE_CHILD_MODELS:
        await db.execute(delete(model).where(model.store_id == store_id))
    await db.delete(store)
