"""店铺相关依赖注入"""

import uuid

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.database import get_db
from src.models.store import Store
from src.models.user import User


async def get_user_store(
    store_id: uuid.UUID | None = Query(default=None, description='Ozon 店铺 ID'),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Store:
    """解析并校验用户所属店铺，未传 store_id 时使用最近创建的活跃店铺。"""
    if store_id is not None:
        stmt = select(Store).where(Store.id == store_id, Store.user_id == current_user.id, Store.is_active == True)
        store = (await db.execute(stmt)).scalar_one_or_none()
        if not store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='店铺不存在')
        return store

    stmt = (
        select(Store)
        .where(Store.user_id == current_user.id, Store.is_active == True)
        .order_by(Store.created_at.desc())
        .limit(1)
    )
    store = (await db.execute(stmt)).scalar_one_or_none()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='尚未绑定 Ozon 店铺，请前往设置页添加',
        )
    return store


async def get_user_store_optional(
    store_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Store | None:
    try:
        return await get_user_store(store_id=store_id, current_user=current_user, db=db)
    except HTTPException:
        return None
