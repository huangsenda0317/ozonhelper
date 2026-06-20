"""看板聚合服务"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.store import Store
from src.models.tracking_sync import Alert, AnalyticsDaily, SyncedOrder, SyncedProduct
from src.schemas.dashboard import AlertCounts, DashboardKPI, TrendPoint
from src.services.ozon.dates import ozon_local_date


async def get_dashboard_kpi(db: AsyncSession, store: Store) -> DashboardKPI:
    total_products = (
        await db.execute(
            select(func.count()).select_from(SyncedProduct).where(SyncedProduct.store_id == store.id)
        )
    ).scalar_one()

    now = datetime.now(UTC)
    today = ozon_local_date()
    week_start = today - timedelta(days=7)
    month_start = today - timedelta(days=30)

    def _order_count_since(since: date) -> int:
        return (
            select(func.count())
            .select_from(SyncedOrder)
            .where(SyncedOrder.store_id == store.id, func.date(SyncedOrder.created_at) >= since)
        )

    orders_today = (await db.execute(_order_count_since(today))).scalar_one()
    orders_week = (await db.execute(_order_count_since(week_start))).scalar_one()
    orders_month = (await db.execute(_order_count_since(month_start))).scalar_one()

    def _units_since(since: date):
        return select(func.coalesce(func.sum(AnalyticsDaily.units_sold), 0)).where(
            AnalyticsDaily.store_id == store.id,
            AnalyticsDaily.day >= since,
        )

    units_today = (
        await db.execute(
            select(func.coalesce(AnalyticsDaily.units_sold, 0)).where(
                AnalyticsDaily.store_id == store.id,
                AnalyticsDaily.day == today,
            )
        )
    ).scalar_one_or_none() or 0
    units_week = (await db.execute(_units_since(week_start))).scalar_one()
    units_month = (await db.execute(_units_since(month_start))).scalar_one()

    hits = (
        await db.execute(
            select(func.coalesce(func.sum(AnalyticsDaily.hits_view), 0)).where(
                AnalyticsDaily.store_id == store.id,
                AnalyticsDaily.day >= month_start,
            )
        )
    ).scalar_one()
    conversion_rate = round(units_month / hits, 4) if hits else None

    low_stock = (
        await db.execute(
            select(func.count()).select_from(Alert).where(
                Alert.store_id == store.id,
                Alert.alert_type == 'low_stock',
                Alert.status == 'unread',
            )
        )
    ).scalar_one()
    overdue = (
        await db.execute(
            select(func.count()).select_from(Alert).where(
                Alert.store_id == store.id,
                Alert.alert_type == 'overdue_order',
                Alert.status == 'unread',
            )
        )
    ).scalar_one()
    exceptions = (
        await db.execute(
            select(func.count()).select_from(SyncedProduct).where(
                SyncedProduct.store_id == store.id,
                SyncedProduct.is_exception == True,
            )
        )
    ).scalar_one()

    def _alert_count_stmt(alert_type: str):
        return select(func.count()).select_from(Alert).where(
            Alert.store_id == store.id,
            Alert.alert_type == alert_type,
            Alert.status == 'unread',
        )

    logistics = (await db.execute(_alert_count_stmt('logistics'))).scalar_one()
    bad_review = (await db.execute(_alert_count_stmt('bad_review'))).scalar_one()
    price_anomaly = (await db.execute(_alert_count_stmt('price_anomaly'))).scalar_one()

    alert_counts = AlertCounts(
        low_stock=low_stock,
        overdue_orders=overdue,
        exception_products=exceptions,
        logistics=logistics,
        bad_review=bad_review,
        price_anomaly=price_anomaly,
        total=low_stock + overdue + exceptions + logistics + bad_review + price_anomaly,
    )

    finance_kpi = {}
    try:
        from src.services.phase2.finance import dashboard_finance_kpi

        finance_kpi = await dashboard_finance_kpi(db, store)
    except Exception:
        finance_kpi = {}

    return DashboardKPI(
        total_products=total_products,
        orders_today=orders_today,
        orders_week=orders_week,
        orders_month=orders_month,
        units_sold_today=int(units_today),
        units_sold_week=int(units_week),
        units_sold_month=int(units_month),
        conversion_rate=conversion_rate,
        last_synced_at=store.last_sync_at.isoformat() if store.last_sync_at else None,
        sync_required=total_products == 0,
        alert_counts=alert_counts,
        revenue_month=finance_kpi.get('revenue_month'),
        fees_month=finance_kpi.get('fees_month'),
        gross_profit_month=finance_kpi.get('gross_profit_month'),
    )


async def get_dashboard_trends(db: AsyncSession, store: Store, days: int = 7) -> list[TrendPoint]:
    since = ozon_local_date() - timedelta(days=days - 1)
    stmt = (
        select(AnalyticsDaily)
        .where(AnalyticsDaily.store_id == store.id, AnalyticsDaily.day >= since)
        .order_by(AnalyticsDaily.day.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()

    order_stmt = (
        select(func.date(SyncedOrder.created_at).label('day'), func.count().label('cnt'))
        .where(
            SyncedOrder.store_id == store.id,
            SyncedOrder.created_at.isnot(None),
            func.date(SyncedOrder.created_at) >= since,
        )
        .group_by(func.date(SyncedOrder.created_at))
    )
    order_rows = (await db.execute(order_stmt)).all()
    orders_by_day = {row.day: int(row.cnt) for row in order_rows}

    return [
        TrendPoint(
            date=row.day.isoformat(),
            orders=orders_by_day.get(row.day, row.orders),
            units_sold=row.units_sold,
            revenue=float(row.revenue) if row.revenue is not None else None,
        )
        for row in rows
    ]
