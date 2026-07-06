"""DeepPick 选品排行榜 API 模型"""

from typing import Literal

from pydantic import BaseModel, Field

RankingView = Literal['product', 'category', 'brand', 'seller', 'opportunity']


class RankingQueryParams(BaseModel):
    """榜单查询参数。"""

    view: RankingView = 'product'
    sort_key: str = 'sum_gmv_desc'
    keyword: str = ''
    category: str = ''
    sales_schema: str = ''
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=100)


class RankingSummary(BaseModel):
    """KPI 摘要。"""

    total_gmv: float | None = None
    total_sold_count: int | None = None
    total_items: int | None = None
    top_category: str | None = None
    top_product_name: str | None = None
    top_product_gmv: float | None = None
    top_product_sku: str | None = None
    max_session_count_search: int | None = None


class ProductRankingItem(BaseModel):
    """商品榜 / 机会榜条目。"""

    rank_no: int | None = None
    sku: str | None = None
    name: str | None = None
    brand: str | None = None
    photo_url: str | None = None
    product_url: str | None = None
    category_path_zh: str | None = None
    seller_name: str | None = None
    sales_schema: str | None = None
    gmv_sum: float | None = None
    sold_count: int | None = None
    sold_sum: float | None = None
    avg_price: float | None = None
    session_count: int | None = None
    session_count_search: int | None = None
    views: int | None = None
    conv_to_cart_search: float | None = None
    pdp_to_cart_conversion: float | None = None
    stock: int | None = None
    updated_at: str | None = None
    opportunity_score: float | None = None
    opportunity_reasons: list[str] | None = None


class AggregatedRankingItem(BaseModel):
    """类目 / 品牌 / 卖家榜条目。"""

    rank_no: int | None = None
    label: str | None = None
    secondary_label: str | None = None
    total_gmv: float | None = None
    total_sold_count: int | None = None
    total_search_sessions: int | None = None
    total_views: int | None = None
    avg_price: float | None = None
    avg_search_cart_conversion: float | None = None
    avg_pdp_cart_conversion: float | None = None
    item_count: int | None = None
    sku_count: int | None = None
    top_product_name: str | None = None
    top_product_url: str | None = None
    top_photo_url: str | None = None
    sample_brands: list[str] | None = None
    sample_sellers: list[str] | None = None


class RankingListMeta(BaseModel):
    """榜单列表分页与缓存元数据。"""

    total: int
    page: int
    limit: int
    cached_at: str | None = None
    stale: bool = False


class RankingListResponse(BaseModel):
    """榜单列表响应体。"""

    items: list[ProductRankingItem | AggregatedRankingItem]
    summary: RankingSummary | None = None


class CategoryOptionNode(BaseModel):
    """级联类目节点。"""

    value: str
    label: str
    path_zh: str | None = None
    is_leaf: bool = False
    children: list['CategoryOptionNode'] | None = None


class CategoryOptionsResponse(BaseModel):
    """类目级联选项。"""

    options: list[CategoryOptionNode]
    total: int = 0


CategoryOptionNode.model_rebuild()
