"""榜单相关 Pydantic Schemas"""

from datetime import datetime

from pydantic import BaseModel, Field


class RankingFilterParams(BaseModel):
    """榜单筛选查询参数。"""
    category: str = Field(..., description='商品类目')
    rank_type: str = Field(..., description='榜单类型: hot/rising/new')
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=100)
    price_min: float | None = None
    price_max: float | None = None
    rating_min: float | None = None
    sales_min: int | None = None


class RankedProductResponse(BaseModel):
    """榜单商品响应。"""
    id: str
    ozon_product_id: str
    title: str
    category: str
    price_rub: float
    rating: float | None
    review_count: int
    sales_trend: str | None
    rank_type: str
    rank_position: int
    image_url: str | None
    is_selected: bool = False

    class Config:
        from_attributes = True


class RankingListResponse(BaseModel):
    """榜单列表响应（含分页和缓存时间）。"""
    items: list[RankedProductResponse]
    total: int
    page: int
    limit: int
    cached_at: datetime | None = None


class SelectedProductRequest(BaseModel):
    """加入选品池请求。"""
    ranked_product_id: str
    note: str | None = None


class SelectedProductResponse(BaseModel):
    """选品池商品响应。"""
    id: str
    ranked_product_id: str
    note: str | None
    added_at: datetime
    ozon_product_id: str | None = None
    title: str | None = None
    category: str | None = None
    price_rub: float | None = None
    rating: float | None = None
    image_url: str | None = None

    class Config:
        from_attributes = True


class BatchDeleteRequest(BaseModel):
    """批量删除请求。"""
    ids: list[str]
