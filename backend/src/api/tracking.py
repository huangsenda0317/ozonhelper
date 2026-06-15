"""店铺跟踪 API 路由"""

from fastapi import APIRouter, Depends, Query

from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.common import ApiResponse, PaginationMeta
from src.schemas.tracking import TrackingProductDetail, TrackingProductListParams, TrackingProductSummary
from src.services.tracker.product_service import tracking_product_service

router = APIRouter(prefix='/api/v1/tracking', tags=['店铺跟踪'])


@router.get('/products', response_model=ApiResponse[list[TrackingProductSummary]])
async def list_tracking_products(
    search: str | None = Query(default=None),
    visibility: str = Query(default='ALL'),
    status: str | None = Query(default=None),
    has_stock: bool | None = Query(default=None),
    sort_by: str = Query(default='updated_at'),
    sort_order: str = Query(default='desc'),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    refresh: bool = Query(default=False, description='为 true 时跳过缓存，强制从 Ozon 重新拉取'),
    current_user: User = Depends(get_current_user),
):
    """获取 Ozon 店铺在线商品列表。"""
    params = TrackingProductListParams(
        search=search,
        visibility=visibility,
        status=status,
        has_stock=has_stock,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
    )
    items, total, cached_at = await tracking_product_service.list_products(params, refresh=refresh)
    return ApiResponse(
        success=True,
        data=items,
        meta=PaginationMeta(total=total, page=page, limit=limit, cached_at=cached_at),
    )


@router.get('/products/{product_id}', response_model=ApiResponse[TrackingProductDetail])
async def get_tracking_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
):
    """获取单个 Ozon 在线商品详情。"""
    detail = await tracking_product_service.get_product_detail(product_id)
    return ApiResponse(success=True, data=detail)
