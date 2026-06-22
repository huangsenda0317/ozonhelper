"""店铺管理 schemas"""

from typing import Literal

from pydantic import BaseModel, Field

OrderSyncInitialDays = Literal[7, 14, 30]


class StoreSummary(BaseModel):
    id: str
    name: str
    is_active: bool
    order_sync_initial_days: int = 7
    settlement_currency: str = 'RUB'
    last_sync_at: str | None = None
    created_at: str


class StoreCreateResponse(StoreSummary):
    sync_job_id: str


class StoreCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    client_id: str = Field(min_length=1)
    api_key: str = Field(min_length=1)


class StoreVerifyResponse(BaseModel):
    valid: bool
    reason: str | None = None


class StoreOrderSyncDaysRequest(BaseModel):
    order_sync_initial_days: OrderSyncInitialDays


class StoreOrderSyncDaysResponse(StoreSummary):
    sync_job_id: str
