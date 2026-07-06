"""DeepPick 原始响应 → 标准化 schema 映射。"""

from typing import Any

from src.schemas.deeppick_rankings import (
    AggregatedRankingItem,
    ProductRankingItem,
    RankingSummary,
)

PRODUCT_VIEWS = frozenset({'product', 'opportunity'})


def map_product_item(item: dict[str, Any]) -> ProductRankingItem:
    reasons = item.get('opportunity_reasons')
    if isinstance(reasons, str):
        reasons = [reasons] if reasons else None
    elif reasons is not None and not isinstance(reasons, list):
        reasons = None

    return ProductRankingItem(
        rank_no=item.get('rank_no'),
        sku=item.get('sku'),
        name=item.get('name'),
        brand=item.get('brand'),
        photo_url=item.get('photo_url'),
        product_url=item.get('product_url'),
        category_path_zh=item.get('category_path_zh'),
        seller_name=item.get('seller_name'),
        sales_schema=item.get('sales_schema'),
        gmv_sum=_to_float(item.get('gmv_sum')),
        sold_count=_to_int(item.get('sold_count')),
        sold_sum=_to_float(item.get('sold_sum')),
        avg_price=_to_float(item.get('avg_price')),
        session_count=_to_int(item.get('session_count')),
        session_count_search=_to_int(item.get('session_count_search')),
        views=_to_int(item.get('views')),
        conv_to_cart_search=_to_float(item.get('conv_to_cart_search')),
        pdp_to_cart_conversion=_to_float(item.get('pdp_to_cart_conversion')),
        stock=_to_int(item.get('stock')),
        updated_at=item.get('updated_at'),
        opportunity_score=_to_float(item.get('opportunity_score')),
        opportunity_reasons=reasons,
    )


def map_aggregated_item(item: dict[str, Any]) -> AggregatedRankingItem:
    brands = item.get('sample_brands')
    sellers = item.get('sample_sellers')
    if isinstance(brands, str):
        brands = [brands]
    if isinstance(sellers, str):
        sellers = [sellers]

    return AggregatedRankingItem(
        rank_no=item.get('rank_no'),
        label=item.get('label'),
        secondary_label=item.get('secondary_label'),
        total_gmv=_to_float(item.get('total_gmv')),
        total_sold_count=_to_int(item.get('total_sold_count')),
        total_search_sessions=_to_int(item.get('total_search_sessions')),
        total_views=_to_int(item.get('total_views')),
        avg_price=_to_float(item.get('avg_price')),
        avg_search_cart_conversion=_to_float(item.get('avg_search_cart_conversion')),
        avg_pdp_cart_conversion=_to_float(item.get('avg_pdp_cart_conversion')),
        item_count=_to_int(item.get('item_count')),
        sku_count=_to_int(item.get('sku_count')),
        top_product_name=item.get('top_product_name'),
        top_product_url=item.get('top_product_url'),
        top_photo_url=item.get('top_photo_url'),
        sample_brands=brands,
        sample_sellers=sellers,
    )


def map_summary(raw: dict[str, Any] | None) -> RankingSummary | None:
    if not raw:
        return None
    return RankingSummary(
        total_gmv=_to_float(raw.get('total_gmv')),
        total_sold_count=_to_int(raw.get('total_sold_count')),
        total_items=_to_int(raw.get('total_items')),
        top_category=raw.get('top_category'),
        top_product_name=raw.get('top_product_name'),
        top_product_gmv=_to_float(raw.get('top_product_gmv')),
        top_product_sku=raw.get('top_product_sku'),
        max_session_count_search=_to_int(raw.get('max_session_count_search')),
    )


def map_items(view: str, items: list[dict[str, Any]]) -> list[ProductRankingItem | AggregatedRankingItem]:
    if view in PRODUCT_VIEWS:
        return [map_product_item(i) for i in items]
    return [map_aggregated_item(i) for i in items]


def _to_float(value: Any) -> float | None:
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    if value is None or value == '':
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
