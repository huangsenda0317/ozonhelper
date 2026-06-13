"""Redis 缓存工具 — 连接管理与缓存装饰器"""

import json
from functools import wraps
from typing import Any, Callable

import redis.asyncio as aioredis

from src.config import get_settings

settings = get_settings()

redis_client: aioredis.Redis | None = None


async def close_redis() -> None:
    """关闭 Redis 连接并释放单例（Celery 每次 asyncio.run 结束后必须调用）。"""
    global redis_client
    if redis_client is not None:
        try:
            await redis_client.aclose()
        except Exception:
            pass
        redis_client = None


async def get_redis() -> aioredis.Redis:
    """获取 Redis 客户端（惰性初始化，自动丢弃已关闭 event loop 上的旧连接）。"""
    global redis_client
    if redis_client is not None:
        pool = redis_client.connection_pool
        pool_loop = getattr(pool, '_loop', None)
        if pool_loop is not None and pool_loop.is_closed():
            redis_client = None
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.redis_url,
            encoding='utf-8',
            decode_responses=True,
        )
    return redis_client


async def cache_get(key: str) -> str | None:
    """从缓存中获取值。"""
    r = await get_redis()
    return await r.get(key)


async def cache_set(key: str, value: Any, expire_seconds: int = 3600) -> None:
    """设置缓存值，支持自动 JSON 序列化。"""
    r = await get_redis()
    if not isinstance(value, str):
        value = json.dumps(value, ensure_ascii=False)
    await r.setex(key, expire_seconds, value)


async def cache_delete(key: str) -> None:
    """删除缓存键。"""
    r = await get_redis()
    await r.delete(key)
