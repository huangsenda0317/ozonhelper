"""看板 schemas"""

from pydantic import BaseModel, Field


class AlertCounts(BaseModel):
    low_stock: int = 0
    overdue_orders: int = 0
    exception_products: int = 0
    logistics: int = 0
    bad_review: int = 0
    price_anomaly: int = 0
    total: int = 0


class DashboardKPI(BaseModel):
    total_products: int = 0
    orders_today: int = 0
    orders_week: int = 0
    orders_month: int = 0
    units_sold_today: int = 0
    units_sold_week: int = 0
    units_sold_month: int = 0
    conversion_rate: float | None = None
    last_synced_at: str | None = None
    sync_required: bool = False
    alert_counts: AlertCounts = Field(default_factory=AlertCounts)
    revenue_month: float | None = None
    fees_month: float | None = None
    gross_profit_month: float | None = None


class TrendPoint(BaseModel):
    date: str
    orders: int = 0
    units_sold: int = 0
    revenue: float | None = None
