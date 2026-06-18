"""Phase2 ERP schemas"""

from pydantic import BaseModel, Field


class ProfitConfigRequest(BaseModel):
    offer_id: str = '__default__'
    purchase_cost: float = 0
    logistics_cost: float = 0
    platform_fee_rate: float = 0.15
    exchange_rate: float = 12.5
    margin_buffer: float = 0.05
    max_price_threshold: float | None = None


class ProfitConfigResponse(BaseModel):
    offer_id: str
    purchase_cost: float
    logistics_cost: float
    platform_fee_rate: float
    exchange_rate: float
    margin_buffer: float
    max_price_threshold: float | None = None


class PricingItem(BaseModel):
    product_id: str
    offer_id: str
    name: str | None = None
    price: float | None = None
    old_price: float | None = None
    suggested_min_price: float | None = None
    currency: str = 'RUB'
    is_price_anomaly: bool = False


class PriceUpdateItem(BaseModel):
    offer_id: str
    product_id: str | None = None
    price: float
    old_price: float | None = None


class BatchPriceUpdateRequest(BaseModel):
    items: list[PriceUpdateItem] | None = None
    adjustment: dict | None = None
    confirm_token: str | None = None


class ListingJobSummary(BaseModel):
    id: str
    filename: str
    status: str
    total_items: int
    success_count: int
    failed_count: int
    created_at: str
    finished_at: str | None = None


class ListingItemRow(BaseModel):
    id: str
    offer_id: str
    name: str
    status: str
    error_message: str | None = None
    rejection_reason: str | None = None


class ListingJobDetail(ListingJobSummary):
    items: list[ListingItemRow] = Field(default_factory=list)


class ShipOrderRequest(BaseModel):
    tracking_number: str
    delivery_method_id: int | None = None


class BatchNoteRequest(BaseModel):
    posting_numbers: list[str]
    note: str


class FinanceSummary(BaseModel):
    total_revenue: float = 0
    total_fees: float = 0
    total_refunds: float = 0
    net_settlement: float = 0
    gross_profit: float = 0
    transaction_count: int = 0


class FinanceTransactionItem(BaseModel):
    transaction_id: str
    tx_type: str
    amount: float
    currency: str
    posting_number: str | None = None
    sku: str | None = None
    operation_date: str | None = None
    description: str | None = None


class LogisticsConfigItem(BaseModel):
    node_type: str
    enabled: bool = True
    threshold_days: int = 3


class LogisticsConfigRequest(BaseModel):
    items: list[LogisticsConfigItem]


class LogisticsAlertRow(BaseModel):
    id: str
    posting_number: str
    node_type: str
    overdue_days: int
    status: str
    note: str | None = None
    triggered_at: str
    handled_at: str | None = None
    order_status: str | None = None


class LogisticsAlertPatch(BaseModel):
    status: str
    note: str | None = None


class ReturnOrderItem(BaseModel):
    return_id: str
    posting_number: str | None = None
    status: str
    reason: str | None = None
    created_at: str | None = None


class AlertBatchPatch(BaseModel):
    alert_ids: list[str]
    status: str
