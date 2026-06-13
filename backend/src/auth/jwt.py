"""JWT 工具模块 — Token 创建、解码、用户依赖注入"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from src.config import get_settings

settings = get_settings()
security_scheme = HTTPBearer()


def create_access_token(user_id: uuid.UUID) -> str:
    """创建 JWT access token。"""
    expire = datetime.now(timezone.utc) + timedelta(seconds=settings.jwt_expire_seconds)
    payload = {
        'sub': str(user_id),
        'exp': expire,
        'iat': datetime.now(timezone.utc),
        'type': 'access',
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """解码并验证 JWT token。返回 payload。"""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='无效的认证凭据',
        )


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> uuid.UUID:
    """从 Bearer Token 中提取当前用户 ID。"""
    payload = decode_token(credentials.credentials)
    user_id_str = payload.get('sub')
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='无效的认证凭据',
        )
    try:
        return uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='无效的用户标识',
        )
