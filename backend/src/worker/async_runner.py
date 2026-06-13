"""Celery Worker 内安全运行 async 代码 — 每次任务使用独立 engine，避免 event loop 冲突"""

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.cache import close_redis
from src.config import get_settings

T = TypeVar('T')


async def _run_with_session(fn: Callable[[AsyncSession], Awaitable[T]]) -> T:
    settings = get_settings()
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_size=5,
        max_overflow=10,
    )
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with session_factory() as session:
            try:
                result = await fn(session)
                await session.commit()
                return result
            except Exception:
                await session.rollback()
                raise
    finally:
        await engine.dispose()
        await close_redis()


def run_async_task(fn: Callable[[AsyncSession], Awaitable[T]]) -> T:
    """在 Celery prefork worker 中运行 async 数据库任务。"""
    return asyncio.run(_run_with_session(fn))
