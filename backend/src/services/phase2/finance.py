"""财务服务"""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from openpyxl import Workbook
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from zoneinfo import ZoneInfo

from src.models.tracking_sync import FinanceTransaction, SyncedOrder
from src.models.store import Store
from src.services.ozon.dates import ozon_local_date
from src.services.phase2.pricing import get_profit_config

# Ozon 财务流水中「送达客户」类型
DELIVERED_TX_TYPE = 'OperationAgentDeliveredToCustomer'


def _range_days(range_key: str) -> int:
    return {'7': 7, '30': 30, 'month': 30}.get(range_key, 30)


def _finance_period_bounds(range_key: str) -> tuple[datetime, datetime, int]:
    """财务汇总周期：按莫斯科日历，过滤 posting_order_date。"""
    today = ozon_local_date()
    moscow = ZoneInfo('Europe/Moscow')
    if range_key == 'month':
        since_local = today.replace(day=1)
        days = (today - since_local).days + 1
    else:
        days = _range_days(range_key)
        since_local = today - timedelta(days=days - 1)
    since = datetime(since_local.year, since_local.month, since_local.day, tzinfo=moscow).astimezone(UTC)
    period_end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=moscow).astimezone(UTC)
    return since, period_end, days


def _is_fee_transaction(tx: FinanceTransaction) -> bool:
    if tx.tx_type == DELIVERED_TX_TYPE or tx.amount >= 0:
        return False
    t = tx.tx_type.lower()
    if 'return' in t or 'refund' in t:
        return False
    return (
        'fee' in t
        or 'commission' in t
        or 'agency' in t
        or 'delivery' in t
        or 'acquiring' in t
    )


def _aggregate_finance_transactions(
    txs: list[FinanceTransaction],
) -> tuple[Decimal, Decimal, Decimal, Decimal, int]:
    revenue = Decimal('0')
    fees = Decimal('0')
    refunds = Decimal('0')
    delivery_count = 0
    for tx in txs:
        amt = tx.amount
        if tx.tx_type == DELIVERED_TX_TYPE:
            if amt > 0:
                revenue += amt
            delivery_count += 1
        elif _is_fee_transaction(tx):
            fees += abs(amt)
        elif 'return' in tx.tx_type.lower() or 'refund' in tx.tx_type.lower():
            refunds += abs(amt)
    net = revenue - fees - refunds
    return revenue, fees, refunds, net, delivery_count


async def _finance_posting_metadata_stale(
    db: AsyncSession,
    store_id,
    since: datetime,
) -> bool:
    """送达类流水缺少 posting 元数据，需重新拉取 Ozon 财务 API 回填。"""
    stale_count = (
        await db.execute(
            select(func.count())
            .select_from(FinanceTransaction)
            .where(
                FinanceTransaction.store_id == store_id,
                FinanceTransaction.tx_type == DELIVERED_TX_TYPE,
                FinanceTransaction.operation_date >= since,
                FinanceTransaction.posting_order_date.is_(None),
            )
        )
    ).scalar_one()
    return stale_count > 0


async def _count_actual_delivered_orders(
    db: AsyncSession,
    store_id,
    since: datetime,
) -> int:
    finance_count = (
        await db.execute(
            select(func.count(func.distinct(FinanceTransaction.posting_number)))
            .select_from(FinanceTransaction)
            .where(
                FinanceTransaction.store_id == store_id,
                FinanceTransaction.tx_type == DELIVERED_TX_TYPE,
                FinanceTransaction.posting_order_date >= since,
                FinanceTransaction.posting_number.isnot(None),
            )
        )
    ).scalar_one()
    if finance_count > 0:
        return finance_count
    return (
        await db.execute(
            select(func.count(func.distinct(SyncedOrder.posting_number)))
            .select_from(SyncedOrder)
            .where(
                SyncedOrder.store_id == store_id,
                SyncedOrder.status.in_(('delivered', 'received')),
                SyncedOrder.posting_number.isnot(None),
                or_(
                    SyncedOrder.delivered_at >= since,
                    and_(SyncedOrder.delivered_at.is_(None), SyncedOrder.synced_at >= since),
                ),
            )
        )
    ).scalar_one()


async def finance_summary(db: AsyncSession, store: Store, range_key: str = 'month') -> dict:
    since, period_end, days = _finance_period_bounds(range_key)

    if await _finance_posting_metadata_stale(db, store.id, since):
        from src.services.phase2.sync_extra import sync_finance

        await sync_finance(db, store)
        await db.commit()

    stmt = select(FinanceTransaction).where(
        FinanceTransaction.store_id == store.id,
        FinanceTransaction.posting_order_date >= since,
        FinanceTransaction.posting_order_date <= period_end,
    )
    txs = (await db.execute(stmt)).scalars().all()
    revenue, fees, refunds, net, delivery_count = _aggregate_finance_transactions(txs)
    default_cfg = await get_profit_config(db, store.id)
    gross_profit = net * (Decimal('1') - default_cfg.platform_fee_rate)
    actual_delivered_order_count = await _count_actual_delivered_orders(db, store.id, since)
    synced_order_count = (
        await db.execute(
            select(func.count())
            .select_from(SyncedOrder)
            .where(
                SyncedOrder.store_id == store.id,
                SyncedOrder.created_at >= since,
            )
        )
    ).scalar_one()
    synced_delivered_order_count = (
        await db.execute(
            select(func.count())
            .select_from(SyncedOrder)
            .where(
                SyncedOrder.store_id == store.id,
                SyncedOrder.created_at >= since,
                SyncedOrder.status.in_(('delivered', 'received')),
            )
        )
    ).scalar_one()
    return {
        'total_revenue': float(revenue),
        'total_fees': float(fees),
        'total_refunds': float(refunds),
        'net_settlement': float(net),
        'gross_profit': float(gross_profit),
        'transaction_count': len(txs),
        'delivery_count': delivery_count,
        'actual_delivered_order_count': actual_delivered_order_count,
        'synced_order_count': synced_order_count,
        'synced_delivered_order_count': synced_delivered_order_count,
        'range_days': days,
        'period_start': since.isoformat(),
        'period_end': period_end.isoformat(),
    }


def export_finance_xlsx(summary: dict, transactions: list[FinanceTransaction]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = 'summary'
    ws.append(['指标', '数值'])
    for k, v in summary.items():
        ws.append([k, v])
    ws2 = wb.create_sheet('transactions')
    ws2.append(['transaction_id', 'type', 'amount', 'currency', 'date', 'description'])
    for tx in transactions:
        ws2.append([
            tx.transaction_id,
            tx.tx_type,
            float(tx.amount),
            tx.currency,
            tx.operation_date.isoformat() if tx.operation_date else '',
            tx.description or '',
        ])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _moscow_month_start_utc() -> datetime:
    since, _, _ = _finance_period_bounds('month')
    return since


async def dashboard_finance_kpi(db: AsyncSession, store: Store) -> dict:
    """看板「本月下单回款」：按订单下单日（莫斯科月）汇总送达类回款。"""
    since, period_end, _ = _finance_period_bounds('month')
    stmt = select(FinanceTransaction).where(
        FinanceTransaction.store_id == store.id,
        FinanceTransaction.posting_order_date >= since,
        FinanceTransaction.posting_order_date <= period_end,
    )
    txs = (await db.execute(stmt)).scalars().all()
    revenue, fees, refunds, net, _ = _aggregate_finance_transactions(txs)
    cfg = await get_profit_config(db, store.id)
    gross = net * (Decimal('1') - cfg.platform_fee_rate)
    return {
        'revenue_month': float(revenue),
        'fees_month': float(fees),
        'gross_profit_month': float(gross),
    }
