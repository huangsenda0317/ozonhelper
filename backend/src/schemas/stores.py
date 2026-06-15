"""店铺管理 schemas"""

from pydantic import BaseModel, Field


class StoreSummary(BaseModel):
    id: str
    name: str
    is_active: bool
    last_sync_at: str | None = None
    created_at: str


class StoreCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    client_id: str = Field(min_length=1)
    api_key: str = Field(min_length=1)


class StoreVerifyResponse(BaseModel):
    valid: bool
    reason: str | None = None
