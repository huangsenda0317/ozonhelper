"""库存 schemas"""

from pydantic import BaseModel, Field


class InventoryItem(BaseModel):
    product_id: str
    offer_id: str
    name: str | None = None
    warehouse_id: str
    present: int
    reserved: int
    is_low_stock: bool = False
    synced_at: str | None = None


class InventoryBatchItem(BaseModel):
    product_id: str
    warehouse_id: str = 'default'
    stock: int = Field(ge=0)


class InventoryBatchUpdateRequest(BaseModel):
    items: list[InventoryBatchItem]


class InventoryBatchResultItem(BaseModel):
    product_id: str
    success: bool
    message: str | None = None


class InventoryAlertConfigRequest(BaseModel):
    low_stock_threshold: int = Field(default=5, ge=0, le=9999)
    order_overdue_hours: int = Field(default=48, ge=1, le=720)


class InventoryAlertConfigResponse(BaseModel):
    low_stock_threshold: int
    order_overdue_hours: int
