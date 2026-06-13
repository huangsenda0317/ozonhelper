"""认证依赖注入 — JWT Bearer 验证 + API Key Header 验证"""

import uuid

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.api_key import get_current_user_from_api_key
from src.auth.jwt import get_current_user_id
from src.database import get_db
from src.models.user import User


async def get_current_user(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT 认证依赖: 从 Token 中获取当前用户完整信息。"""
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='用户不存在或已禁用',
        )
    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """可选认证: JWT 或 API Key 均可，不强制要求登录。"""
    # 尝试 JWT
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            user_id = await get_current_user_id(request)
            stmt = select(User).where(User.id == user_id, User.is_active == True)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()
        except HTTPException:
            pass

    # 尝试 API Key
    api_key = request.headers.get('X-API-Key', '')
    if api_key:
        try:
            user_id = await get_current_user_from_api_key(x_api_key=api_key, db=db)
            stmt = select(User).where(User.id == user_id, User.is_active == True)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()
        except HTTPException:
            pass

    return None
