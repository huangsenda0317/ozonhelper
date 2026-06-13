"""榜单发现 API 路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.database import get_db
from src.models.user import User
from src.schemas.common import ApiResponse, PaginationMeta
from src.schemas.rankings import RankedProductResponse, RankingFilterParams
from src.services.rank_scraper.service import ranking_service

router = APIRouter(prefix='/api/v1/rankings', tags=['榜单发现'])


@router.get('', response_model=ApiResponse[list[RankedProductResponse]])
async def get_rankings(
    category: str = Query(..., description='商品类目'),
    rank_type: str = Query(..., description='榜单类型: hot/rising/new'),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    price_min: float | None = Query(default=None),
    price_max: float | None = Query(default=None),
    rating_min: float | None = Query(default=None),
    sales_min: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取排行榜商品列表，支持多维度筛选。"""
    products, total, cached_at = await ranking_service.get_rankings(
        db=db,
        category=category,
        rank_type=rank_type,
        page=page,
        limit=limit,
        price_min=price_min,
        price_max=price_max,
        rating_min=rating_min,
        sales_min=sales_min,
    )

    items = [
        RankedProductResponse(
            id=str(p.id),
            ozon_product_id=p.ozon_product_id,
            title=p.title,
            category=p.category,
            price_rub=float(p.price_rub),
            rating=float(p.rating) if p.rating else None,
            review_count=p.review_count,
            sales_trend=p.sales_trend,
            rank_type=p.rank_type,
            rank_position=p.rank_position,
            image_url=p.image_url,
        )
        for p in products
    ]

    return ApiResponse(
        success=True,
        data=items,
        meta=PaginationMeta(total=total, page=page, limit=limit).model_dump() if cached_at else None,
    )


@router.get('/categories', response_model=ApiResponse[list[str]])
async def get_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取可用的商品类目列表。"""
    categories = await ranking_service.get_categories(db)
    return ApiResponse(success=True, data=categories)
