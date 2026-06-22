"""店铺结算货币探测 — 基于已同步商品价格/财务流水"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tracking_sync import FinanceTransaction, PriceSnapshot, SyncedProduct

DEFAULT_SETTLEMENT_CURRENCY = 'RUB'


async def _dominant_currency(
    db: AsyncSession,
    store_id: uuid.UUID,
    model,
    column,
) -> str | None:
    stmt = (
        select(column, func.count().label('cnt'))
        .where(
            model.store_id == store_id,
            column.isnot(None),
            column != '',
        )
        .group_by(column)
        .order_by(func.count().desc())
        .limit(1)
    )
    row = (await db.execute(stmt)).first()
    if not row or not row[0]:
        return None
    return str(row[0]).upper()


async def get_store_settlement_currency(db: AsyncSession, store_id: uuid.UUID) -> str:
    """按价格快照 → 财务流水 → 商品表顺序取众数货币。"""
    for model, column in (
        (PriceSnapshot, PriceSnapshot.currency),
        (FinanceTransaction, FinanceTransaction.currency),
        (SyncedProduct, SyncedProduct.currency),
    ):
        currency = await _dominant_currency(db, store_id, model, column)
        if currency:
            return currency
    return DEFAULT_SETTLEMENT_CURRENCY
