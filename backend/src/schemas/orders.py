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
