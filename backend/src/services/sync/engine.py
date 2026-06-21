"""Ozon 店铺数据同步引擎"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.exceptions import AppException
from src.config import get_settings
from src.models.store import Store
from src.models.tracking_sync import (
    Alert,
    AnalyticsDaily,
    InventoryAlertConfig,
    InventorySnapshot,
    SyncJob,
    SyncedOrder,
    SyncedProduct,
)
from src.services.ozon.client import OzonSellerClient
from src.services.ozon.dates import ozon_local_date
from src.services.stores.credentials import ozon_client_for_store
from src.services.tracker.product_service import detect_exception, map_to_summary

logger = logging.getLogger(__name__)

INFO_BATCH = 1000
STOCK_BATCH = 100

# 增量 FBS 同步仅拉取未完结履约状态（按状态分次请求，避免单页全量翻页）
FBS_ACTIVE_STATUSES = (
    'awaiting_packaging',
    'awaiting_deliver',
    'delivering',
    'awaiting_registration',
    'acceptance_in_progress',
)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None


async def _get_alert_config(db: AsyncSession, store_id: uuid.UUID) -> InventoryAlertConfig:
    stmt = select(InventoryAlertConfig).where(InventoryAlertConfig.store_id == store_id)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row:
        return row
    row = InventoryAlertConfig(store_id=store_id)
    db.add(row)
    await db.flush()
    return row


async def sync_products(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    last_id = ''
    product_ids: list[str] = []
    while True:
        resp = await client.product_list(last_id=last_id, limit=100)
        result = resp.get('result') or {}
        items = result.get('items') or []
        for item in items:
            pid = item.get('product_id')
            if pid is not None:
                product_ids.append(str(pid))
        last_id = result.get('last_id') or ''
        if not items or not last_id:
            break

    processed = 0
    now = datetime.now(UTC)
    for i in range(0, len(product_ids), INFO_BATCH):
        batch = product_ids[i : i + INFO_BATCH]
        info_resp = await client.product_info_list(product_ids=batch)
        for raw in info_resp.get('items') or info_resp.get('result', {}).get('items') or []:
            summary = map_to_summary(raw)
            is_exc, exc_reason = detect_exception(raw)
            values = {
                'store_id': store.id,
                'product_id': summary.product_id,
                'offer_id': summary.offer_id,
                'sku': summary.sku,
                'name': summary.name,
                'price': summary.price,
                'currency': summary.currency,
                'stock_present': summary.stock_present,
                'status_name': summary.status_name,
                'visibility': raw.get('visibility') or (raw.get('statuses') or {}).get('visibility'),
                'is_exception': is_exc,
                'exception_reason': exc_reason,
                'primary_image_url': summary.primary_image_url,
                'ordered_units': int(raw.get('ordered_units') or 0),
                'hits_view': int(raw.get('hits_view') or 0),
                'conversion_rate': None,
                'ozon_updated_at': _parse_dt(summary.updated_at),
                'synced_at': now,
            }
            hits = values['hits_view']
            orders = values['ordered_units']
            if hits > 0:
                values['conversion_rate'] = Decimal(str(round(orders / hits, 4)))
            stmt = insert(SyncedProduct).values(**values)
            stmt = stmt.on_conflict_do_update(
                constraint='uq_synced_products_store_product',
                set_={k: v for k, v in values.items() if k not in ('store_id', 'product_id')},
            )
            await db.execute(stmt)
            processed += 1
    return processed


async def sync_inventory(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    stmt = select(SyncedProduct.product_id, SyncedProduct.offer_id).where(SyncedProduct.store_id == store.id)
    rows = (await db.execute(stmt)).all()
    if not rows:
        return 0

    product_ids = [r[0] for r in rows]
    offer_map = {r[0]: r[1] for r in rows}
    processed = 0
    now = datetime.now(UTC)
    for i in range(0, len(product_ids), STOCK_BATCH):
        batch = product_ids[i : i + STOCK_BATCH]
        resp = await client.product_stocks_info(product_ids=batch, limit=len(batch))
        items = resp.get('items') or (resp.get('result') or {}).get('items') or []
        for item in items:
            pid = str(item.get('product_id') or '')
            stocks = item.get('stocks') or []
            if not stocks:
                stocks = [{'warehouse_id': 'default', 'present': 0, 'reserved': 0}]
            for stock in stocks:
                wh = str(stock.get('warehouse_id') or stock.get('warehouse_name') or 'default')
                values = {
                    'store_id': store.id,
                    'product_id': pid,
                    'offer_id': offer_map.get(pid, ''),
                    'warehouse_id': wh,
                    'present': int(stock.get('present') or 0),
                    'reserved': int(stock.get('reserved') or 0),
                    'synced_at': now,
                }
                ins = insert(InventorySnapshot).values(**values)
                ins = ins.on_conflict_do_update(
                    constraint='uq_inventory_snapshots_store_product_wh',
                    set_={k: v for k, v in values.items() if k not in ('store_id', 'product_id', 'warehouse_id')},
                )
                await db.execute(ins)
                processed += 1
    return processed


def _parse_price_value(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, dict):
        value = value.get('price') or value.get('total_price')
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _parse_decimal_price(value: object) -> Decimal | None:
    parsed = _parse_price_value(value)
    return Decimal(str(parsed)) if parsed is not None else None


def _map_order_posting(posting: dict, fulfillment_type: str) -> dict:
    products = []
    for p in posting.get('products') or []:
        products.append(
            {
                'sku': str(p.get('sku') or ''),
                'name': p.get('name'),
                'quantity': int(p.get('quantity') or 0),
                'price': _parse_price_value(p.get('price')),
            }
        )
    return {
        'posting_number': posting.get('posting_number') or '',
        'order_id': str(posting.get('order_id') or posting.get('order_number') or ''),
        'status': posting.get('status') or '',
        'fulfillment_type': fulfillment_type,
        'created_at': _parse_dt(posting.get('in_process_at') or posting.get('created_at')),
        'shipment_date': _parse_dt(posting.get('shipment_date')),
        'products': products,
        'total_price': _parse_decimal_price(posting.get('total_price')),
    }


async def _upsert_order_posting(
    db: AsyncSession,
    store: Store,
    posting: dict,
    fulfillment_type: str,
    *,
    config: InventoryAlertConfig,
    now: datetime,
    overdue_delta: timedelta,
) -> None:
    mapped = _map_order_posting(posting, fulfillment_type)
    created_at = mapped['created_at']
    is_overdue = False
    if fulfillment_type == 'FBS' and mapped['status'] in {'awaiting_packaging', 'awaiting_deliver'}:
        if created_at and now - created_at > overdue_delta:
            is_overdue = True
    values = {
        'store_id': store.id,
        'posting_number': mapped['posting_number'],
        'order_id': mapped['order_id'],
        'status': mapped['status'],
        'fulfillment_type': fulfillment_type,
        'created_at': created_at,
        'shipment_date': mapped['shipment_date'],
        'products': mapped['products'],
        'total_price': mapped['total_price'],
        'is_overdue': is_overdue,
        'synced_at': now,
    }
    ins = insert(SyncedOrder).values(**values)
    ins = ins.on_conflict_do_update(
        constraint='uq_synced_orders_store_posting',
        set_={k: v for k, v in values.items() if k not in ('store_id', 'posting_number')},
    )
    await db.execute(ins)


async def _sync_posting_pages(
    db: AsyncSession,
    store: Store,
    fetch,
    fulfillment_type: str,
    *,
    since: str,
    to: str,
    config: InventoryAlertConfig,
    now: datetime,
    overdue_delta: timedelta,
    status: str | None = None,
) -> int:
    processed = 0
    offset = 0
    while True:
        resp = await fetch(since=since, to=to, limit=100, offset=offset, status=status)
        result = resp.get('result') or resp
        postings = result.get('postings') or result.get('posting') or []
        if not postings:
            break
        for posting in postings:
            await _upsert_order_posting(
                db,
                store,
                posting,
                fulfillment_type,
                config=config,
                now=now,
                overdue_delta=overdue_delta,
            )
            processed += 1
        if len(postings) < 100:
            break
        offset += 100
    return processed


async def sync_orders(
    db: AsyncSession,
    store: Store,
    client: OzonSellerClient | None = None,
    *,
    since_dt: datetime | None = None,
    fbs_active_only: bool = False,
) -> int:
    client = client or ozon_client_for_store(store)
    config = await _get_alert_config(db, store.id)
    settings = get_settings()
    if since_dt is None:
        initial_days = store.order_sync_initial_days or settings.order_sync_initial_days
        since_dt = store.last_sync_at or (datetime.now(UTC) - timedelta(days=initial_days))
    since = since_dt.isoformat().replace('+00:00', 'Z')
    to = datetime.now(UTC).isoformat().replace('+00:00', 'Z')
    now = datetime.now(UTC)
    overdue_delta = timedelta(hours=config.order_overdue_hours)
    processed = 0

    if fbs_active_only:
        for status in FBS_ACTIVE_STATUSES:
            processed += await _sync_posting_pages(
                db,
                store,
                client.posting_fbs_list,
                'FBS',
                since=since,
                to=to,
                config=config,
                now=now,
                overdue_delta=overdue_delta,
                status=status,
            )
    else:
        processed += await _sync_posting_pages(
            db,
            store,
            client.posting_fbs_list,
            'FBS',
            since=since,
            to=to,
            config=config,
            now=now,
            overdue_delta=overdue_delta,
        )

    processed += await _sync_posting_pages(
        db,
        store,
        client.posting_fbo_list,
        'FBO',
        since=since,
        to=to,
        config=config,
        now=now,
        overdue_delta=overdue_delta,
    )
    return processed


async def sync_analytics(db: AsyncSession, store: Store, client: OzonSellerClient | None = None) -> int:
    client = client or ozon_client_for_store(store)
    today = ozon_local_date()
    date_from = (today - timedelta(days=30)).isoformat()
    date_to = today.isoformat()
    resp = await client.analytics_data(
        date_from=date_from,
        date_to=date_to,
        metrics=['ordered_units', 'revenue', 'hits_view'],
        dimension=['day'],
        limit=31,
    )
    result = resp.get('result') or resp
    data = result.get('data') or []
    processed = 0
    now = datetime.now(UTC)
    date_from_day = today - timedelta(days=30)
    order_stmt = (
        select(func.date(SyncedOrder.created_at).label('day'), func.count().label('cnt'))
        .where(
            SyncedOrder.store_id == store.id,
            SyncedOrder.created_at.isnot(None),
            func.date(SyncedOrder.created_at) >= date_from_day,
        )
        .group_by(func.date(SyncedOrder.created_at))
    )
    order_rows = (await db.execute(order_stmt)).all()
    orders_by_day = {row.day: int(row.cnt) for row in order_rows}
    for row in data:
        dims = row.get('dimensions') or []
        metrics = row.get('metrics') or []
        if not dims:
            continue
        day_str = dims[0].get('id') or dims[0].get('name') or ''
        try:
            day = date.fromisoformat(day_str[:10])
        except ValueError:
            continue
        units = int(metrics[0]) if len(metrics) > 0 else 0
        revenue = Decimal(str(metrics[1])) if len(metrics) > 1 and metrics[1] is not None else None
        hits = int(metrics[2]) if len(metrics) > 2 else 0
        values = {
            'store_id': store.id,
            'day': day,
            'orders': orders_by_day.get(day, 0),
            'units_sold': units,
            'revenue': revenue,
            'hits_view': hits,
            'synced_at': now,
        }
        ins = insert(AnalyticsDaily).values(**values)
        ins = ins.on_conflict_do_update(
            constraint='uq_analytics_daily_store_day',
            set_={k: v for k, v in values.items() if k not in ('store_id', 'day')},
        )
        await db.execute(ins)
        processed += 1
    return processed


async def rebuild_alerts(db: AsyncSession, store: Store) -> int:
    config = await _get_alert_config(db, store.id)
    await db.execute(delete(Alert).where(Alert.store_id == store.id))

    count = 0
    low_stock_stmt = select(SyncedProduct).where(
        SyncedProduct.store_id == store.id,
        SyncedProduct.stock_present < config.low_stock_threshold,
        SyncedProduct.stock_present >= 0,
    )
    for product in (await db.execute(low_stock_stmt)).scalars():
        db.add(
            Alert(
                store_id=store.id,
                alert_type='low_stock',
                reference_id=product.product_id,
                title=f'低库存：{product.name[:80]}',
                message=f'当前库存 {product.stock_present}，低于阈值 {config.low_stock_threshold}',
                severity='warning',
            )
        )
        count += 1

    overdue_stmt = select(SyncedOrder).where(SyncedOrder.store_id == store.id, SyncedOrder.is_overdue == True)
    for order in (await db.execute(overdue_stmt)).scalars():
        db.add(
            Alert(
                store_id=store.id,
                alert_type='overdue_order',
                reference_id=order.posting_number,
                title=f'超时未发货：{order.posting_number}',
                message=f'订单状态 {order.status}，已超过 {config.order_overdue_hours} 小时',
                severity='critical',
            )
        )
        count += 1

    exc_stmt = select(SyncedProduct).where(SyncedProduct.store_id == store.id, SyncedProduct.is_exception == True)
    for product in (await db.execute(exc_stmt)).scalars():
        db.add(
            Alert(
                store_id=store.id,
                alert_type='exception_product',
                reference_id=product.product_id,
                title=f'异常商品：{product.name[:80]}',
                message=product.exception_reason,
                severity='warning',
            )
        )
        count += 1
    return count


async def run_sync_scope(db: AsyncSession, store: Store, scope: str) -> int:
    total = 0
    client = ozon_client_for_store(store)
    settings = get_settings()
    order_count = (
        await db.execute(select(func.count()).select_from(SyncedOrder).where(SyncedOrder.store_id == store.id))
    ).scalar_one()
    initial_days = store.order_sync_initial_days or settings.order_sync_initial_days
    if order_count == 0:
        orders_since = datetime.now(UTC) - timedelta(days=initial_days)
    else:
        orders_since = store.last_sync_at or (datetime.now(UTC) - timedelta(days=initial_days))
    fbs_active_only = order_count > 0

    if scope in ('products', 'all', 'quick'):
        total += await sync_products(db, store, client)
    if scope in ('inventory', 'all', 'quick'):
        total += await sync_inventory(db, store, client)
    if scope in ('orders', 'all'):
        total += await sync_orders(
            db, store, client, since_dt=orders_since, fbs_active_only=fbs_active_only
        )
    if scope in ('all', 'quick'):
        try:
            total += await sync_analytics(db, store, client)
        except AppException as exc:
            logger.warning('analytics sync skipped: %s', exc.message)
        total += await rebuild_alerts(db, store)
        if scope == 'all':
            try:
                from src.services.phase2.sync_extra import (
                    run_logistics_alert_check,
                    sync_finance,
                    sync_prices,
                    sync_returns,
                    sync_review_alerts,
                )

                total += await sync_prices(db, store, client)
                total += await sync_finance(db, store, client)
                total += await sync_returns(db, store, client)
                total += await sync_review_alerts(db, store, client)
                total += await run_logistics_alert_check(db, store)
            except Exception as exc:
                logger.warning('phase2 sync skipped: %s', exc)
    store.last_sync_at = datetime.now(UTC)
    return total


async def fail_sync_job(db: AsyncSession, job_id: uuid.UUID, message: str) -> None:
    """将未开始的同步任务标记为失败（派发/重试耗尽时调用）。"""
    job = (await db.execute(select(SyncJob).where(SyncJob.id == job_id))).scalar_one_or_none()
    if job is None or job.status != 'pending':
        return
    job.status = 'failed'
    job.error_message = message[:500]
    job.finished_at = datetime.now(UTC)
    await db.commit()


async def execute_sync_job(db: AsyncSession, job_id: uuid.UUID) -> None:
    job = (await db.execute(select(SyncJob).where(SyncJob.id == job_id))).scalar_one_or_none()
    if not job:
        raise LookupError(f'SyncJob {job_id} 不存在（可能尚未提交到数据库）')
    store = (await db.execute(select(Store).where(Store.id == job.store_id))).scalar_one_or_none()
    if not store:
        job.status = 'failed'
        job.error_message = '店铺不存在'
        job.finished_at = datetime.now(UTC)
        await db.commit()
        return

    job.status = 'running'
    job.started_at = datetime.now(UTC)
    await db.flush()
    # Celery/内联同步可能耗时数分钟，先提交 running 供前端轮询
    await db.commit()
    try:
        job.records_processed = await run_sync_scope(db, store, job.scope)
        job.status = 'succeeded'
    except Exception as exc:
        logger.exception('sync job failed: %s', job_id)
        job.status = 'failed'
        if isinstance(exc, AppException):
            job.error_message = exc.message[:500]
        else:
            job.error_message = str(exc)[:500] or repr(exc)[:500]
    job.finished_at = datetime.now(UTC)
