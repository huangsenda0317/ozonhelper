"""订单 schemas"""

from pydantic import BaseModel, Field


class OrderProductItem(BaseModel):
    sku: str | None = None
    name: str | None = None
    quantity: int = 0
    price: float | None = None


class OrderSummary(BaseModel):
    posting_number: str
    order_id: str | None = None
    status: str
    fulfillment_type: str
    created_at: str | None = None
    shipment_date: str | None = None
    products: list[OrderProductItem] = Field(default_factory=list)
    total_price: float | None = None
    is_overdue: bool = False
    synced_at: str | None = None


class TrackingEventItem(BaseModel):
    at: str | None = None
    status: str | None = None
    tracking_number: str | None = None


class OrderDetail(OrderSummary):
    packed_at: str | None = None
    shipped_at: str | None = None
    last_tracking_at: str | None = None
    delivered_at: str | None = None
    tracking_status: str | None = None
    tracking_events: list[TrackingEventItem] = Field(default_factory=list)
    seller_note: str | None = None
