"""DeepPick 选品排行榜 API 路由"""

from fastapi import APIRouter, Depends, Query

from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.common import ApiResponse
from src.schemas.deeppick_rankings import (
    CategoryOptionsResponse,
    RankingListResponse,
    RankingQueryParams,
    RankingView,
)
from src.services.deeppick.ranking_service import deeppick_ranking_service

router = APIRouter(prefix='/api/v1/ozon-rankings', tags=['选品排行榜'])


@router.get('', response_model=ApiResponse[RankingListResponse])
async def get_ozon_rankings(
    view: RankingView = Query(default='product', description='榜单视图'),
    sort_key: str = Query(default='sum_gmv_desc', description='排序字段'),
    keyword: str = Query(default='', description='关键词'),
    category: str = Query(default='', description='类目筛选'),
    sales_schema: str = Query(default='', description='发货方式 FBO/FBS'),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """获取 DeepPick 选品排行榜（代理）。"""
    params = RankingQueryParams(
        view=view,
        sort_key=sort_key,
        keyword=keyword,
        category=category,
        sales_schema=sales_schema,
        page=page,
        limit=limit,
    )
    data, meta = await deeppick_ranking_service.get_rankings(params)
    return ApiResponse(success=True, data=data, meta=meta.model_dump())


@router.get('/category-options', response_model=ApiResponse[CategoryOptionsResponse])
async def get_category_options(
    sort_key: str = Query(default='sum_gmv_desc', description='排序字段'),
    current_user: User = Depends(get_current_user),
):
    """获取 DeepPick 类目级联筛选选项。"""
    data = await deeppick_ranking_service.get_category_options(sort_key=sort_key)
    return ApiResponse(success=True, data=data)
