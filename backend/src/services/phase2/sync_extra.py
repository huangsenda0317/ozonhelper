"""Phase2 同步扩展 — 价格、财务、物流、差评"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.store import Store
from src.services.sync.cancel import ensure_store_sync_active
from src.models.tracking_sync import (
    Alert,
    FinanceTransaction,
    LogisticsAlertConfig,
    LogisticsAlertEvent,
    PriceSnapshot,
    ProfitConfig,
    ReturnOrder,
    ReviewAlert,
    SyncedOrder,
    SyncedProduct,
)
from src.services.ozon.client import OzonSellerClient
from src.services.phase2.pricing import calc_suggested_min_price, detect_price_anomalies
from src.services.stores.credentials import ozon_client_for_store

logger = logging.getLogger(__name__)

LOGISTICS_NODE_DEFAULTS = {
    'pending_pack': 2,
    'pending_pickup': 3,
    'transport_stall': 5,
    'pending_delivery': 7,
    'abnormal': 3,
}

# 节点类型 → 触发检测的订单 status 集合
_LOGISTICS_STATUS_BY_NODE: dict[str, frozenset[str]] = {
    'pending_pack': frozenset({'awaiting_packaging'}),
    'pending_pickup': frozenset({'awaiting_deliver', 'awaiting_registration'}),
    'transport_stall': frozenset({'delivering', 'driver_pickup', 'sent_by_seller'}),
    'pending_delivery': frozenset({'driver_pickup'}),
}

_TERMINAL_ORDER_STATUSES = frozenset({'delivered', 'received', 'cancelled', 'not_accepted'})


def _parse_finance_posting(op: dict) -> tuple[str | None, datetime | None, str | None]:
    """从 Ozon 财务 operation 解析货号、下单日与 SKU。"""
    posting = op.get('posting') or {}
    posting_number = op.get('posting_number') or posting.get('posting_number')
    order_dt = None
    order_date_raw = posting.get('order_date')
    if order_date_raw:
        try:
            order_dt = datetime.fromisoformat(str(order_date_raw).replace('Z', '+00:00'))
            if order_dt.tzinfo is None:
                order_dt = order_dt.replace(tzinfo=UTC)
        except ValueError:
            order_dt = None
    sku = op.get('sku')
    if not sku:
        items = op.get('items') or []
        if items:
            sku = str(items[0].get('sku') or '') or None
    return posting_number, order_dt, sku


def _overdue_days(now: datetime, anchor: datetime) -> int:
    """距 anchor 已满的天数（向下取整）。"""
    if anchor.tzinfo is None:
        anchor = anchor.replace(tzinfo=UTC)
    return max(0, (now - anchor).days)


def _order_anchor(order: SyncedOrder, *fields: str) -> datetime | None:
    for name in fields:
        value = getattr(order, name, None)
        if value is not None:
            return value
    return None


def _future_safe_anchor(order: SyncedOrder, now: datetime, *fields: str) -> datetime | None:
    """取锚点时间，跳过晚于当前时刻的字段（如 Ozon 预约 shipment_date）。"""
    for name in fields:
        value = getattr(order, name, None)
        if value is None:
            continue
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        if value <= now:
            return value
    return None


def _tracking_stall_anchor(order: SyncedOrder, now: datetime) -> datetime | None:
    """运输停滞锚点：有多条真实轨迹更新时用 last_tracking_at，否则用发货时间。"""
    events = order.tracking_events or []
    if order.last_tracking_at and len(events) >= 2:
        anchor = order.last_tracking_at
        if anchor.tzinfo is None:
            anchor = anchor.replace(tzinfo=UTC)
        if anchor <= now:
            return anchor
    return _future_safe_anchor(order, now, 'shipped_at', 'shipment_date', 'created_at')


def _compute_logistics_checks(
    order: SyncedOrder,
    configs: dict[str, LogisticsAlertConfig],
    now: datetime,
) -> list[tuple[str, int]]:
    """按当前配置计算订单应触发的物流预警节点。"""
    status = (order.status or '').lower()
    if status in _TERMINAL_ORDER_STATUSES:
        return []

    checks: list[tuple[str, int]] = []

    cfg = configs.get('pending_pack')
    if cfg and cfg.enabled and status in _LOGISTICS_STATUS_BY_NODE['pending_pack']:
        anchor = _future_safe_anchor(order, now, 'created_at', 'shipment_date')
        if anchor is not None:
            overdue = _overdue_days(now, anchor)
            if overdue >= cfg.threshold_days:
                checks.append(('pending_pack', overdue))

    cfg = configs.get('pending_pickup')
    if cfg and cfg.enabled and status in _LOGISTICS_STATUS_BY_NODE['pending_pickup']:
        # 待揽收：以进入该状态的 created_at 为准，不用 packed_at（易被批量同步污染）
        anchor = _future_safe_anchor(order, now, 'created_at', 'shipment_date')
        if anchor is not None:
            overdue = _overdue_days(now, anchor)
            if overdue >= cfg.threshold_days:
                checks.append(('pending_pickup', overdue))

    cfg = configs.get('transport_stall')
    if cfg and cfg.enabled and status in _LOGISTICS_STATUS_BY_NODE['transport_stall'] and not order.delivered_at:
        anchor = _tracking_stall_anchor(order, now)
        if anchor is not None:
            overdue = _overdue_days(now, anchor)
            if overdue >= cfg.threshold_days:
                checks.append(('transport_stall', overdue))

    cfg = configs.get('pending_delivery')
    if cfg and cfg.enabled and status in _LOGISTICS_STATUS_BY_NODE['pending_delivery'] and not order.delivered_at:
        anchor = _future_safe_anchor(order, now, 'shipped_at', 'shipment_date', 'created_at')
        if anchor is not None:
            overdue = _overdue_days(now, anchor)
            if overdue >= cfg.threshold_days:
                checks.append(('pending_delivery', overdue))

    ts = (order.tracking_status or order.status or '').lower()
    cfg = configs.get('abnormal')
    if cfg and cfg.enabled and any(k in ts for k in ('return', 'exception', 'error', 'arbitration')):
        checks.append(('abnormal', 0))

    return checks

PRICE_BATCH = 100


async def ensure_logistics_configs(db: AsyncSession, store_id: uuid.UUID) -> None:
    existing = (
        await db.execute(select(LogisticsAlertConfig.node_type).where(LogisticsAlertConfig.store_id == store_id))
    ).scalars().all()
    for node_type, days in LOGISTICS_NODE_DEFAULTS.items():
        if node_type not in existing:
            db.add(LogisticsAlertConfig(store_id=store_id, node_type=node_type, threshold_days=days))


async def sync_prices(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    stmt = select(SyncedProduct.product_id, SyncedProduct.offer_id).where(SyncedProduct.store_id == store.id)
    rows = (await db.execute(stmt)).all()
    if not rows:
        return 0
    processed = 0
    now = datetime.now(UTC)
    for i in range(0, len(rows), PRICE_BATCH):
        batch = rows[i : i + PRICE_BATCH]
        pids = [r[0] for r in batch]
        resp = await client.product_info_prices(product_ids=pids, limit=len(pids))
        items = resp.get('items') or (resp.get('result') or {}).get('items') or []
        for item in items:
            pid = str(item.get('product_id') or '')
            price_block = item.get('price') or {}
            values = {
                'store_id': store.id,
                'product_id': pid,
                'offer_id': str(item.get('offer_id') or ''),
                'price': Decimal(str(price_block.get('price') or 0)) if price_block.get('price') is not None else None,
                'old_price': Decimal(str(price_block.get('old_price') or 0))
                if price_block.get('old_price') is not None
                else None,
                'min_price_ozon': Decimal(str(price_block.get('min_price') or 0))
                if price_block.get('min_price') is not None
                else None,
                'currency': str(price_block.get('currency_code') or 'RUB'),
                'synced_at': now,
            }
            ins = insert(PriceSnapshot).values(**values)
            ins = ins.on_conflict_do_update(
                constraint='uq_price_snapshots_store_product',
                set_={k: v for k, v in values.items() if k not in ('store_id', 'product_id')},
            )
            await db.execute(ins)
            processed += 1
    await detect_price_anomalies(db, store.id)
    return processed


async def sync_finance(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    since = (datetime.now(UTC) - timedelta(days=30)).strftime('%Y-%m-%dT00:00:00.000Z')
    to = datetime.now(UTC).strftime('%Y-%m-%dT23:59:59.999Z')
    processed = 0
    now = datetime.now(UTC)
    page = 1
    while True:
        await ensure_store_sync_active(store.id)
        resp = await client.finance_transaction_list(date_from=since, date_to=to, page=page, page_size=100)
        result = resp.get('result') or resp
        operations = result.get('operations') or []
        if not operations:
            break
        for op in operations:
            tx_id = str(op.get('operation_id') or op.get('id') or '')
            if not tx_id:
                continue
            op_date = op.get('operation_date') or op.get('date')
            dt = None
            if op_date:
                try:
                    dt = datetime.fromisoformat(str(op_date).replace('Z', '+00:00'))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=UTC)
                except ValueError:
                    dt = None
            posting_number, posting_order_date, sku = _parse_finance_posting(op)
            values = {
                'store_id': store.id,
                'transaction_id': tx_id,
                'tx_type': str(op.get('operation_type') or op.get('type') or ''),
                'amount': Decimal(str(op.get('amount') or 0)),
                'currency': str(op.get('currency_code') or 'RUB'),
                'posting_number': posting_number,
                'posting_order_date': posting_order_date,
                'sku': sku,
                'operation_date': dt,
                'description': op.get('name') or op.get('description'),
                'synced_at': now,
            }
            ins = insert(FinanceTransaction).values(**values)
            ins = ins.on_conflict_do_update(
                constraint='uq_finance_tx_store_tx',
                set_={k: v for k, v in values.items() if k not in ('store_id', 'transaction_id')},
            )
            await db.execute(ins)
            processed += 1
        if len(operations) < 100:
            break
        page += 1
    return processed


async def sync_returns(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    last_id = ''
    processed = 0
    now = datetime.now(UTC)
    while True:
        try:
            resp = await client.returns_list(last_id=last_id, limit=100)
        except Exception as exc:
            logger.warning('returns sync skipped: %s', exc)
            break
        result = resp.get('result') or resp
        items = result.get('returns') or result.get('items') or []
        if not items:
            break
        for item in items:
            rid = str(item.get('id') or item.get('return_id') or '')
            if not rid:
                continue
            created = item.get('created_at')
            dt = None
            if created:
                try:
                    dt = datetime.fromisoformat(str(created).replace('Z', '+00:00'))
                except ValueError:
                    dt = None
            values = {
                'store_id': store.id,
                'return_id': rid,
                'posting_number': item.get('posting_number'),
                'status': str(item.get('status') or ''),
                'reason': item.get('return_reason') or item.get('reason'),
                'created_at': dt,
                'synced_at': now,
            }
            ins = insert(ReturnOrder).values(**values)
            ins = ins.on_conflict_do_update(
                constraint='uq_return_orders_store_return',
                set_={k: v for k, v in values.items() if k not in ('store_id', 'return_id')},
            )
            await db.execute(ins)
            processed += 1
        last_id = result.get('last_id') or ''
        if not last_id or len(items) < 100:
            break
    return processed


async def sync_order_tracking(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    stmt = (
        select(SyncedOrder)
        .where(
            SyncedOrder.store_id == store.id,
            SyncedOrder.fulfillment_type == 'FBS',
            SyncedOrder.status.notin_(tuple(_TERMINAL_ORDER_STATUSES)),
        )
        .order_by(SyncedOrder.synced_at.desc())
        .limit(100)
    )
    orders = (await db.execute(stmt)).scalars().all()
    processed = 0
    now = datetime.now(UTC)
    for order in orders:
        try:
            resp = await client.posting_fbs_get(posting_number=order.posting_number)
        except Exception:
            continue
        result = resp.get('result') or resp
        analytics = result.get('analytics_data') or {}
        tracking = result.get('tracking_number') or analytics.get('tracking_number')
        status = (result.get('status') or order.status or '').lower()
        prev_status = (order.tracking_status or order.status or '').lower()
        prev_tracking = order.tracking_events[-1].get('tracking_number') if order.tracking_events else None
        status_changed = status != prev_status
        tracking_changed = bool(tracking) and tracking != prev_tracking
        order.tracking_status = status
        if status != order.status:
            order.status = status
        if status_changed or tracking_changed:
            events = list(order.tracking_events or [])
            events.append({'at': now.isoformat(), 'status': status, 'tracking_number': tracking})
            order.tracking_events = events
            order.last_tracking_at = now
        if status in {'delivering', 'driver_pickup', 'sent_by_seller'} and order.shipped_at is None:
            order.shipped_at = order.shipment_date or now
        if status in {'delivered', 'received'}:
            order.delivered_at = order.delivered_at or now
        processed += 1
    return processed


async def sync_review_alerts(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    last_id = ''
    processed = 0
    while True:
        try:
            resp = await client.review_list(last_id=last_id, limit=50)
        except Exception as exc:
            logger.warning('review sync skipped: %s', exc)
            break
        result = resp.get('result') or resp
        reviews = result.get('reviews') or result.get('items') or []
        if not reviews:
            break
        for review in reviews:
            rating = int(review.get('rating') or review.get('score') or 5)
            if rating > 2:
                continue
            review_id = str(review.get('id') or review.get('review_id') or '')
            if not review_id:
                continue
            existing = (
                await db.execute(
                    select(ReviewAlert).where(
                        ReviewAlert.store_id == store.id,
                        ReviewAlert.review_id == review_id,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                continue
            ra = ReviewAlert(
                store_id=store.id,
                review_id=review_id,
                product_id=str(review.get('product_id') or '') or None,
                sku=str(review.get('sku') or '') or None,
                rating=rating,
                text=review.get('text') or review.get('comment'),
            )
            db.add(ra)
            db.add(
                Alert(
                    store_id=store.id,
                    alert_type='bad_review',
                    reference_id=review_id,
                    title=f'差评提醒（{rating} 星）',
                    message=(review.get('text') or '')[:200],
                    severity='warning',
                )
            )
            processed += 1
        last_id = result.get('last_id') or ''
        if not last_id or len(reviews) < 50:
            break
    return processed


async def run_logistics_alert_check(db: AsyncSession, store: Store) -> int:
    """拉取在途订单轨迹并执行物流节点超时检测。"""
    try:
        await sync_order_tracking(db, store)
    except Exception as exc:
        logger.warning('order tracking sync skipped: %s', exc)
    return await check_logistics_alerts(db, store)


async def check_logistics_alerts(db: AsyncSession, store: Store) -> int:
    await ensure_logistics_configs(db, store.id)
    configs = {
        c.node_type: c
        for c in (await db.execute(select(LogisticsAlertConfig).where(LogisticsAlertConfig.store_id == store.id)))
        .scalars()
        .all()
    }
    now = datetime.now(UTC)
    count = 0
    active_keys: set[tuple[str, str]] = set()

    orders = (await db.execute(select(SyncedOrder).where(SyncedOrder.store_id == store.id))).scalars().all()
    for order in orders:
        checks = _compute_logistics_checks(order, configs, now)
        for node_type, overdue_days in checks:
            active_keys.add((order.posting_number, node_type))
            existing = (
                await db.execute(
                    select(LogisticsAlertEvent).where(
                        LogisticsAlertEvent.store_id == store.id,
                        LogisticsAlertEvent.posting_number == order.posting_number,
                        LogisticsAlertEvent.node_type == node_type,
                    )
                )
            ).scalar_one_or_none()
            values = {
                'store_id': store.id,
                'posting_number': order.posting_number,
                'node_type': node_type,
                'overdue_days': overdue_days,
                'status': 'unhandled',
                'triggered_at': now,
            }
            ins = insert(LogisticsAlertEvent).values(**values)
            ins = ins.on_conflict_do_update(
                constraint='uq_logistics_events',
                set_={'overdue_days': overdue_days, 'triggered_at': now, 'status': 'unhandled'},
            )
            await db.execute(ins)
            if existing is None:
                db.add(
                    Alert(
                        store_id=store.id,
                        alert_type='logistics',
                        reference_id=f'{order.posting_number}:{node_type}',
                        title=f'物流预警：{order.posting_number}',
                        message=f'节点 {node_type} 超时 {overdue_days} 天',
                        severity='critical',
                    )
                )
            count += 1

    stale_events = (
        await db.execute(
            select(LogisticsAlertEvent).where(
                LogisticsAlertEvent.store_id == store.id,
                LogisticsAlertEvent.status == 'unhandled',
            )
        )
    ).scalars().all()
    for event in stale_events:
        if (event.posting_number, event.node_type) not in active_keys:
            event.status = 'ignored'
            event.note = '未达当前阈值或订单状态已变更，自动关闭'
            event.handled_at = now

    return count
