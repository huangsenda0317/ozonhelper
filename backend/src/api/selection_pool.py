"""选品池 API 路由"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.api.deps import get_current_user
from src.api.exceptions import NotFoundException
from src.database import get_db
from src.models.ranked_product import RankedProduct
from src.models.selected_product import SelectedProduct
from src.models.user import User
from src.schemas.common import ApiResponse, PaginationMeta
from src.schemas.rankings import BatchDeleteRequest, SelectedProductRequest, SelectedProductResponse

router = APIRouter(prefix='/api/v1/selection-pool', tags=['选品池'])


@router.post('', response_model=ApiResponse[SelectedProductResponse], status_code=201)
async def add_to_selection_pool(
    request: SelectedProductRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将榜单商品加入选品池。"""
    # 检查商品是否存在
    ranked_id = uuid.UUID(request.ranked_product_id)
    ranked_stmt = select(RankedProduct).where(RankedProduct.id == ranked_id)
    ranked_result = await db.execute(ranked_stmt)
    ranked = ranked_result.scalar_one_or_none()
    if not ranked:
        raise NotFoundException('榜单商品', request.ranked_product_id)

    # 检查是否已在选品池
    exist_stmt = select(SelectedProduct).where(
        SelectedProduct.user_id == current_user.id,
        SelectedProduct.ranked_product_id == ranked_id,
    )
    exist_result = await db.execute(exist_stmt)
    if exist_result.scalar_one_or_none():
        raise NotFoundException('选品池商品', request.ranked_product_id)

    item = SelectedProduct(
        user_id=current_user.id,
        ranked_product_id=ranked_id,
        note=request.note,
    )
    db.add(item)
    await db.flush()

    return ApiResponse(
        success=True,
        data=SelectedProductResponse(
            id=str(item.id),
            ranked_product_id=str(item.ranked_product_id),
            note=item.note,
            added_at=item.added_at,
            ozon_product_id=ranked.ozon_product_id,
            title=ranked.title,
            category=ranked.category,
            price_rub=float(ranked.price_rub),
            rating=float(ranked.rating) if ranked.rating else None,
            image_url=ranked.image_url,
        ),
    )


@router.get('', response_model=ApiResponse[list[SelectedProductResponse]])
async def list_selection_pool(
    page: int = 1,
    limit: int = 50,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取选品池列表，支持搜索。"""
    stmt = (
        select(SelectedProduct)
        .options(joinedload(SelectedProduct.ranked_product_id))
        .where(SelectedProduct.user_id == current_user.id)
    )

    if search:
        # 通过关联表搜索
        stmt = stmt.join(RankedProduct).where(RankedProduct.title.ilike(f'%{search}%'))

    stmt = stmt.order_by(SelectedProduct.added_at.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()

    responses = []
    for item in items:
        # 获取关联的榜单商品
        ranked_stmt = select(RankedProduct).where(RankedProduct.id == item.ranked_product_id)
        ranked_result = await db.execute(ranked_stmt)
        ranked = ranked_result.scalar_one_or_none()

        responses.append(SelectedProductResponse(
            id=str(item.id),
            ranked_product_id=str(item.ranked_product_id),
            note=item.note,
            added_at=item.added_at,
            ozon_product_id=ranked.ozon_product_id if ranked else None,
            title=ranked.title if ranked else None,
            category=ranked.category if ranked else None,
            price_rub=float(ranked.price_rub) if ranked else None,
            rating=float(ranked.rating) if ranked and ranked.rating else None,
            image_url=ranked.image_url if ranked else None,
        ))

    return ApiResponse(success=True, data=responses)


@router.delete('/{item_id}', response_model=ApiResponse[None])
async def remove_from_pool(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """从选品池移除商品。"""
    stmt = select(SelectedProduct).where(
        SelectedProduct.id == item_id,
        SelectedProduct.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException('选品池商品', str(item_id))

    await db.delete(item)
    await db.flush()
    return ApiResponse(success=True, data=None)


@router.post('/batch-delete', response_model=ApiResponse[None])
async def batch_remove(
    request: BatchDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量从选品池移除商品。"""
    ids = [uuid.UUID(id_str) for id_str in request.ids]
    stmt = delete(SelectedProduct).where(
        SelectedProduct.id.in_(ids),
        SelectedProduct.user_id == current_user.id,
    )
    await db.execute(stmt)
    await db.flush()
    return ApiResponse(success=True, data=None)
