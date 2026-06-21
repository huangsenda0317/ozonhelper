"""店铺跟踪 Pydantic schemas"""

from pydantic import BaseModel, Field


class TrackingProductSummary(BaseModel):
    product_id: str
    offer_id: str
    sku: str | None = None
    name: str
    price: float | None = None
    currency: str = 'RUB'
    price_rub: float | None = None
    price_rub_estimated: bool = False
    price_rub_source: str | None = None
    stock_present: int = 0
    status_name: str | None = None
    primary_image_url: str | None = None
    updated_at: str | None = None
    ordered_units: int = 0
    hits_view: int = 0
    conversion_rate: float | None = None
    synced_at: str | None = None
    is_exception: bool = False


class TrackingProductDetail(BaseModel):
    product_id: str
    offer_id: str
    sku: str | None = None
    name: str
    barcode: str | None = None
    price: float | None = None
    old_price: float | None = None
    min_price: float | None = None
    currency: str = 'RUB'
    price_rub: float | None = None
    price_rub_estimated: bool = False
    old_price_rub: float | None = None
    min_price_rub: float | None = None
    stock_present: int = 0
    stock_reserved: int = 0
    has_stock: bool = False
    status_name: str | None = None
    status_description: str | None = None
    moderate_status: str | None = None
    validation_status: str | None = None
    primary_image: str | None = None
    images: list[str] = Field(default_factory=list)
    created_at: str | None = None
    updated_at: str | None = None
    ozon_url: str | None = None
    ordered_units: int = 0
    hits_view: int = 0
    conversion_rate: float | None = None
    is_exception: bool = False
    exception_reason: str | None = None
    synced_at: str | None = None


class TrackingProductListParams(BaseModel):
    search: str | None = None
    visibility: str = 'ALL'
    status: str | None = None
    has_stock: bool | None = None
    is_exception: bool | None = None
    sort_by: str = 'updated_at'
    sort_order: str = 'desc'
    page: int = 1
    limit: int = 20


class BatchVisibilityRequest(BaseModel):
    product_ids: list[str] = Field(min_length=1)
    action: str = Field(pattern='^(archive|unarchive)$')
