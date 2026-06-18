"""财务服务"""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tracking_sync import FinanceTransaction
from src.models.store import Store
from src.services.phase2.pricing import get_profit_config


async def finance_summary(db: AsyncSession, store: Store, range_key: str = 'month') -> dict:
    days = {'7': 7, '30': 30, 'month': 30}.get(range_key, 30)
    since = datetime.now(UTC) - timedelta(days=days)
    stmt = select(FinanceTransaction).where(
        FinanceTransaction.store_id == store.id,
        FinanceTransaction.operation_date >= since,
    )
    txs = (await db.execute(stmt)).scalars().all()
    revenue = Decimal('0')
    fees = Decimal('0')
    refunds = Decimal('0')
    for tx in txs:
        amt = tx.amount
        t = tx.tx_type.lower()
        if 'sale' in t or 'orders' in t or amt > 0:
            revenue += amt if amt > 0 else Decimal('0')
        elif 'fee' in t or 'commission' in t:
            fees += abs(amt)
        elif 'return' in t or 'refund' in t:
            refunds += abs(amt)
    net = revenue - fees - refunds
    default_cfg = await get_profit_config(db, store.id)
    gross_profit = net * (Decimal('1') - default_cfg.platform_fee_rate)
    return {
        'total_revenue': float(revenue),
        'total_fees': float(fees),
        'total_refunds': float(refunds),
        'net_settlement': float(net),
        'gross_profit': float(gross_profit),
        'transaction_count': len(txs),
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
