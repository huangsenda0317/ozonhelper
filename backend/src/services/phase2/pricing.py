"""价格中心服务"""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tracking_sync import Alert, PriceSnapshot, ProfitConfig, SyncedProduct
from src.models.store import Store
from src.services.stores.credentials import ozon_client_for_store

DEFAULT_OFFER = '__default__'


def calc_suggested_min_price(config: ProfitConfig) -> Decimal | None:
    cost = (config.purchase_cost + config.logistics_cost) * config.exchange_rate
    fee = Decimal(str(config.platform_fee_rate))
    margin = Decimal(str(config.margin_buffer))
    denom = Decimal('1') - fee - margin
    if denom <= 0:
        return None
    return (cost / denom).quantize(Decimal('0.01'))


async def get_profit_config(db: AsyncSession, store_id: uuid.UUID, offer_id: str = DEFAULT_OFFER) -> ProfitConfig:
    stmt = select(ProfitConfig).where(ProfitConfig.store_id == store_id, ProfitConfig.offer_id == offer_id)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row:
        return row
    row = ProfitConfig(store_id=store_id, offer_id=offer_id)
    db.add(row)
    await db.flush()
    return row


async def list_pricing(
    db: AsyncSession,
    store: Store,
    *,
    page: int = 1,
    limit: int = 20,
    price_anomaly: bool | None = None,
) -> tuple[list[dict], int]:
    default_cfg = await get_profit_config(db, store.id)
    stmt = (
        select(SyncedProduct, PriceSnapshot)
        .join(
            PriceSnapshot,
            (PriceSnapshot.store_id == SyncedProduct.store_id)
            & (PriceSnapshot.product_id == SyncedProduct.product_id),
            isouter=True,
        )
        .where(SyncedProduct.store_id == store.id)
    )
    rows = (await db.execute(stmt)).all()
    items: list[dict] = []
    for product, snap in rows:
        cfg_stmt = select(ProfitConfig).where(
            ProfitConfig.store_id == store.id,
            ProfitConfig.offer_id.in_([product.offer_id, DEFAULT_OFFER]),
        )
        cfgs = (await db.execute(cfg_stmt)).scalars().all()
        cfg = next((c for c in cfgs if c.offer_id == product.offer_id), None) or default_cfg
        min_price = calc_suggested_min_price(cfg)
        price = float(snap.price) if snap and snap.price is not None else float(product.price or 0)
        is_anomaly = min_price is not None and Decimal(str(price)) < min_price
        if price_anomaly is True and not is_anomaly:
            continue
        if price_anomaly is False and is_anomaly:
            continue
        items.append(
            {
                'product_id': product.product_id,
                'offer_id': product.offer_id,
                'name': product.name,
                'price': price,
                'old_price': float(snap.old_price) if snap and snap.old_price else None,
                'suggested_min_price': float(min_price) if min_price else None,
                'currency': snap.currency if snap else product.currency,
                'is_price_anomaly': is_anomaly,
            }
        )
    total = len(items)
    start = (page - 1) * limit
    return items[start : start + limit], total


async def batch_update_prices(db: AsyncSession, store: Store, items: list[dict]) -> list[dict]:
    client = ozon_client_for_store(store)
    prices_payload = []
    for item in items:
        entry: dict = {
            'offer_id': item['offer_id'],
            'price': str(item['price']),
            'currency_code': 'RUB',
        }
        if item.get('old_price') is not None:
            entry['old_price'] = str(item['old_price'])
        if item.get('product_id') and str(item['product_id']).isdigit():
            entry['product_id'] = int(item['product_id'])
        prices_payload.append(entry)
    results: list[dict] = []
    for i in range(0, len(prices_payload), 1000):
        batch = prices_payload[i : i + 1000]
        try:
            await client.price_import(prices=batch)
            for p in batch:
                results.append({'offer_id': p['offer_id'], 'success': True})
        except Exception as exc:
            for p in batch:
                results.append({'offer_id': p['offer_id'], 'success': False, 'message': str(exc)})
    await detect_price_anomalies(db, store.id)
    return results


async def detect_price_anomalies(db: AsyncSession, store_id: uuid.UUID) -> int:
    default_cfg = await get_profit_config(db, store_id)
    stmt = select(SyncedProduct, PriceSnapshot).join(
        PriceSnapshot,
        (PriceSnapshot.store_id == SyncedProduct.store_id)
        & (PriceSnapshot.product_id == SyncedProduct.product_id),
        isouter=True,
    ).where(SyncedProduct.store_id == store_id)
    count = 0
    for product, snap in (await db.execute(stmt)).all():
        cfg = await get_profit_config(db, store_id, product.offer_id)
        if cfg.offer_id == DEFAULT_OFFER and default_cfg.offer_id == DEFAULT_OFFER:
            cfg = default_cfg
        min_price = calc_suggested_min_price(cfg)
        price_val = snap.price if snap and snap.price is not None else product.price
        if min_price is None or price_val is None:
            continue
        if price_val >= min_price:
            continue
        ref = product.product_id
        existing = (
            await db.execute(
                select(Alert).where(
                    Alert.store_id == store_id,
                    Alert.alert_type == 'price_anomaly',
                    Alert.reference_id == ref,
                    Alert.status == 'unread',
                )
            )
        ).scalar_one_or_none()
        if existing:
            continue
        db.add(
            Alert(
                store_id=store_id,
                alert_type='price_anomaly',
                reference_id=ref,
                title=f'价格异常：{product.name[:60]}',
                message=f'当前价 {price_val} 低于保本价 {min_price}',
                severity='warning',
            )
        )
        count += 1
    return count
