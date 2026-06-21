"""财务服务"""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from openpyxl import Workbook
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tracking_sync import FinanceTransaction, SyncedOrder
from src.models.store import Store
from src.services.phase2.pricing import get_profit_config

# Ozon 财务流水中「送达客户」类型；按 operation_date 统计为财务入账笔数
DELIVERED_TX_TYPE = 'OperationAgentDeliveredToCustomer'


def _range_days(range_key: str) -> int:
    return {'7': 7, '30': 30, 'month': 30}.get(range_key, 30)


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
    days = _range_days(range_key)
    period_end = datetime.now(UTC)
    since = period_end - timedelta(days=days)

    if await _finance_posting_metadata_stale(db, store.id, since):
        from src.services.phase2.sync_extra import sync_finance

        await sync_finance(db, store)
        await db.commit()

    stmt = select(FinanceTransaction).where(
        FinanceTransaction.store_id == store.id,
        FinanceTransaction.operation_date >= since,
    )
    txs = (await db.execute(stmt)).scalars().all()
    revenue = Decimal('0')
    fees = Decimal('0')
    refunds = Decimal('0')
    finance_delivery_settlement_count = 0
    for tx in txs:
        amt = tx.amount
        t = tx.tx_type.lower()
        if tx.tx_type == DELIVERED_TX_TYPE:
            finance_delivery_settlement_count += 1
        if 'sale' in t or 'orders' in t or amt > 0:
            revenue += amt if amt > 0 else Decimal('0')
        elif 'fee' in t or 'commission' in t:
            fees += abs(amt)
        elif 'return' in t or 'refund' in t:
            refunds += abs(amt)
    net = revenue - fees - refunds
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
        'delivery_count': finance_delivery_settlement_count,
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


async def dashboard_finance_kpi(db: AsyncSession, store: Store) -> dict:
    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    stmt = select(FinanceTransaction).where(
        FinanceTransaction.store_id == store.id,
        FinanceTransaction.operation_date >= month_start,
    )
    txs = (await db.execute(stmt)).scalars().all()
    revenue = sum(float(t.amount) for t in txs if t.amount > 0)
    fees = sum(abs(float(t.amount)) for t in txs if 'fee' in t.tx_type.lower())
    cfg = await get_profit_config(db, store.id)
    gross = revenue - fees - revenue * float(cfg.platform_fee_rate)
    return {'revenue_month': revenue, 'fees_month': fees, 'gross_profit_month': gross}
