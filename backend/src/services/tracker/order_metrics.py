"""订单按日汇总 — 看板趋势用卖家结算口径"""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Mapping

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tracking_sync import SyncedOrder, SyncedProduct
from src.services.ozon.dates import to_ozon_business_date


def _parse_line_price(raw: object) -> Decimal | None:
    if raw is None:
        return None
    try:
        return Decimal(str(raw))
    except (TypeError, ValueError):
        return None


def order_revenue_amount(
    order: SyncedOrder,
    *,
    sku_prices: Mapping[str, float | Decimal] | None = None,
) -> Decimal:
    """卖家结算口径：total_price → 商品行 price×quantity → 商品库 SKU 价兜底。"""
    if order.total_price is not None:
        total = Decimal(str(order.total_price))
        if total > 0:
            return total
    total = Decimal('0')
    for item in order.products or []:
        if not isinstance(item, dict):
            continue
        qty = int(item.get('quantity') or 0)
        if qty <= 0:
            continue
        unit = _parse_line_price(item.get('price'))
        if unit is None and sku_prices:
            sku = str(item.get('sku') or '')
            if sku and sku in sku_prices:
                unit = _parse_line_price(sku_prices[sku])
        if unit is None:
            continue
        total += unit * qty
    return total


def aggregate_order_daily_stats(
    orders: list[SyncedOrder],
    *,
    sku_prices: Mapping[str, float | Decimal] | None = None,
) -> dict[date, tuple[int, float]]:
    """按 Ozon 莫斯科业务日汇总：订单数、卖家结算金额。"""
    stats: dict[date, tuple[int, Decimal]] = {}
    for order in orders:
        day = to_ozon_business_date(order.created_at)
        if day is None:
            continue
        count, revenue = stats.get(day, (0, Decimal('0')))
        stats[day] = (count + 1, revenue + order_revenue_amount(order, sku_prices=sku_prices))
    return {day: (count, float(revenue)) for day, (count, revenue) in stats.items()}


def build_sku_price_map(rows: list[tuple[str | None, object]]) -> dict[str, float]:
    """从 (sku, price) 行构建 SKU→价格映射。"""
    prices: dict[str, float] = {}
    for sku, price in rows:
        if not sku or price is None:
            continue
        try:
            val = float(price)
        except (TypeError, ValueError):
            continue
        if val > 0:
            prices[str(sku)] = val
    return prices


async def load_store_sku_prices(db: AsyncSession, store_id: uuid.UUID) -> dict[str, float]:
    rows = (
        await db.execute(
            select(SyncedProduct.sku, SyncedProduct.price).where(
                SyncedProduct.store_id == store_id,
                SyncedProduct.sku.isnot(None),
                SyncedProduct.price.isnot(None),
            )
        )
    ).all()
    return build_sku_price_map(list(rows))


async def backfill_order_prices_from_catalog(db: AsyncSession, store_id: uuid.UUID) -> int:
    """用商品库 SKU 价回填缺失的订单行价与 total_price。"""
    sku_prices = await load_store_sku_prices(db, store_id)
    if not sku_prices:
        return 0
    orders = (
        await db.execute(select(SyncedOrder).where(SyncedOrder.store_id == store_id))
    ).scalars().all()
    updated = 0
    for order in orders:
        amount = order_revenue_amount(order, sku_prices=sku_prices)
        if amount <= 0:
            continue
        products: list[dict] = []
        changed = False
        for item in order.products or []:
            if not isinstance(item, dict):
                continue
            copy = dict(item)
            if copy.get('price') is None:
                sku = str(copy.get('sku') or '')
                if sku in sku_prices:
                    copy['price'] = sku_prices[sku]
                    changed = True
            products.append(copy)
        if order.total_price is None or Decimal(str(order.total_price or 0)) <= 0:
            order.total_price = amount
            changed = True
        elif changed:
            pass
        elif not any(isinstance(i, dict) and i.get('price') is None for i in (order.products or [])):
            continue
        if changed:
            order.products = products
            updated += 1
    return updated
