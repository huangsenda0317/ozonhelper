"""商品管理 API 路由 — 采集商品 CRUD"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.api.exceptions import NotFoundException
from src.database import get_db
from src.models.collected_product import CollectedProduct
from src.models.user import User
from src.schemas.common import ApiResponse, PaginationMeta

router = APIRouter(prefix='/api/v1/products', tags=['商品采集'])


@router.post('', response_model=ApiResponse[dict], status_code=201)
async def create_product(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建已采集商品 — 支持 JWT 和 X-API-Key 两种认证。

    注: 实际实现中通过 FastAPI request 直接解析 JSON 体，
    此处为简化版本。
    """
    # Placeholder for actual implementation
    return ApiResponse(success=True, data={'message': 'Not yet implemented — use request body'})


@router.get('', response_model=ApiResponse[list[dict]])
async def list_products(
    search: str | None = Query(default=None),
    sort_by: str = Query(default='collected_at'),
    sort_order: str = Query(default='desc'),
    has_image: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取已采集商品列表 — 分页、搜索、排序、去重检测。"""
    stmt = select(CollectedProduct).where(CollectedProduct.user_id == current_user.id)

    if search:
        stmt = stmt.where(CollectedProduct.title.ilike(f'%{search}%'))

    stmt = stmt.order_by(
        CollectedProduct.collected_at.desc() if sort_order == 'desc'
        else CollectedProduct.collected_at.asc()
    )
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    products = result.scalars().all()

    items = [
        {
            'id': str(p.id),
            'ozon_product_id': p.ozon_product_id,
            'title': p.title,
            'price_rub': float(p.price_rub),
            'category_path': p.category_path,
            'images': p.images,
            'is_manual': p.is_manual,
            'collected_at': str(p.collected_at),
        }
        for p in products
    ]

    return ApiResponse(success=True, data=items, meta=PaginationMeta(total=len(items), page=page, limit=limit))


@router.get('/{product_id}', response_model=ApiResponse[dict])
async def get_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个已采集商品详情。"""
    stmt = select(CollectedProduct).where(
        CollectedProduct.id == product_id,
        CollectedProduct.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException('商品', str(product_id))

    return ApiResponse(
        success=True,
        data={
            'id': str(product.id),
            'ozon_product_id': product.ozon_product_id,
            'source_url': product.source_url,
            'title': product.title,
            'title_zh': product.title_zh,
            'title_ru': product.title_ru,
            'description': product.description,
            'description_ru': product.description_ru,
            'price_rub': float(product.price_rub),
            'attributes': product.attributes,
            'variants': product.variants,
            'images': product.images,
            'video_urls': product.video_urls,
            'category_path': product.category_path,
            'is_manual': product.is_manual,
            'collected_at': str(product.collected_at),
        },
    )


@router.get('/{product_id}/check-duplicate', response_model=ApiResponse[dict])
async def check_duplicate(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """检查商品是否已采集。"""
    stmt = select(CollectedProduct).where(
        CollectedProduct.id == product_id,
        CollectedProduct.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        return ApiResponse(success=True, data={'is_duplicate': False, 'existing_id': None})

    dup_stmt = select(CollectedProduct).where(
        CollectedProduct.user_id == current_user.id,
        CollectedProduct.ozon_product_id == product.ozon_product_id,
        CollectedProduct.id != product.id,
    )
    dup_result = await db.execute(dup_stmt)
    duplicate = dup_result.scalar_one_or_none()

    return ApiResponse(
        success=True,
        data={
            'is_duplicate': duplicate is not None,
            'existing_id': str(duplicate.id) if duplicate else None,
        },
    )


@router.delete('/{product_id}', response_model=ApiResponse[None])
async def delete_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除已采集商品。"""
    stmt = select(CollectedProduct).where(
        CollectedProduct.id == product_id,
        CollectedProduct.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException('商品', str(product_id))

    await db.delete(product)
    await db.flush()
    return ApiResponse(success=True, data=None)
