"""API 密钥认证模块 — 生成、验证、HMAC 签名校验"""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.api_key import ApiKey

KEY_PREFIX = 'oz-'


def generate_api_key() -> tuple[str, str, str]:
    """生成新的 API 密钥。返回 (完整密钥, 哈希值, 前缀)。"""
    raw = secrets.token_hex(24)
    full_key = f'{KEY_PREFIX}{raw}'
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    prefix = full_key[:10]
    return full_key, key_hash, prefix


def hash_api_key(key: str) -> str:
    """对 API 密钥进行 SHA-256 哈希。"""
    return hashlib.sha256(key.encode()).hexdigest()


async def verify_api_key(api_key: str, db: AsyncSession) -> ApiKey | None:
    """验证 API 密钥是否有效。返回 ApiKey 记录或 None。"""
    key_hash = hash_api_key(api_key)
    stmt = select(ApiKey).where(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True,
        ApiKey.revoked_at.is_(None),
    )
    result = await db.execute(stmt)
    api_key_record = result.scalar_one_or_none()
    if api_key_record:
        api_key_record.last_used_at = datetime.now(timezone.utc)
    return api_key_record


async def get_current_user_from_api_key(
    x_api_key: str = Header(..., alias='X-API-Key'),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    """从 X-API-Key Header 中验证并提取当前用户 ID。"""
    api_key_record = await verify_api_key(x_api_key, db)
    if not api_key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='无效的 API 密钥',
        )
    return api_key_record.user_id
