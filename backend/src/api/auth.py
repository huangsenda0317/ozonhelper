"""认证 API 路由 — 注册、登录、API 密钥管理"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.api.exceptions import DuplicateException, NotFoundException, UnauthorizedException, ValidationException
from src.auth.api_key import generate_api_key, KEY_PREFIX
from src.auth.jwt import create_access_token
from src.auth.password import hash_password, verify_password
from src.bootstrap.admin_user import normalize_login_account
from src.database import get_db
from src.models.api_key import ApiKey
from src.models.user import User
from src.schemas.auth import (
    ApiKeyCreateRequest,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.schemas.common import ApiResponse

router = APIRouter(prefix='/api/v1/auth', tags=['认证'])


@router.post('/register', response_model=ApiResponse[UserResponse], status_code=201)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """注册新用户。"""
    # 检查邮箱是否已注册
    stmt = select(func.count()).select_from(User).where(User.email == request.email)
    result = await db.execute(stmt)
    if result.scalar() > 0:
        raise DuplicateException('该邮箱已注册')

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
    )
    db.add(user)
    await db.flush()

    return ApiResponse(
        success=True,
        data=UserResponse(
            user_id=str(user.id),
            email=user.email,
            name=user.name,
            created_at=user.created_at,
        ),
    )


@router.post('/login', response_model=ApiResponse[TokenResponse])
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录。"""
    login_email = normalize_login_account(request.email)
    stmt = select(User).where(User.email == login_email, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise UnauthorizedException('邮箱或密码错误')

    access_token = create_access_token(user.id)
    return ApiResponse(
        success=True,
        data=TokenResponse(
            access_token=access_token,
            expires_in=86400,
        ),
    )


@router.post('/api-keys', response_model=ApiResponse[ApiKeyCreatedResponse], status_code=201)
async def create_api_key(
    request: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建 API 密钥（仅返回一次完整密钥）。"""
    full_key, key_hash, prefix = generate_api_key()

    api_key = ApiKey(
        user_id=current_user.id,
        name=request.name,
        key_hash=key_hash,
        key_prefix=prefix,
    )
    db.add(api_key)
    await db.flush()

    return ApiResponse(
        success=True,
        data=ApiKeyCreatedResponse(
            id=str(api_key.id),
            name=api_key.name,
            key_prefix=api_key.key_prefix,
            key=full_key,
            is_active=True,
            last_used_at=None,
            created_at=api_key.created_at,
        ),
    )


@router.get('/api-keys', response_model=ApiResponse[list[ApiKeyResponse]])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取 API 密钥列表（不返回完整密钥）。"""
    stmt = select(ApiKey).where(
        ApiKey.user_id == current_user.id,
        ApiKey.revoked_at.is_(None),
    ).order_by(ApiKey.created_at.desc())
    result = await db.execute(stmt)
    keys = result.scalars().all()

    return ApiResponse(
        success=True,
        data=[
            ApiKeyResponse(
                id=str(k.id),
                name=k.name,
                key_prefix=k.key_prefix,
                is_active=k.is_active,
                last_used_at=k.last_used_at,
                created_at=k.created_at,
            )
            for k in keys
        ],
    )


@router.delete('/api-keys/{key_id}', response_model=ApiResponse[None])
async def revoke_api_key(
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """吊销 API 密钥。"""
    stmt = select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    result = await db.execute(stmt)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise NotFoundException('API 密钥', str(key_id))

    api_key.is_active = False
    api_key.revoked_at = func.now()
    await db.flush()

    return ApiResponse(success=True, data=None)
