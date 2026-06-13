"""SeedEdit 全局串行锁 — 免费版并发为 1，多任务/多图需排队"""

import asyncio

from src.cache import get_redis

LOCK_KEY = 'ozonhelper:seededit:lock'
LOCK_TTL = 180  # 单次改图最长占用锁时间（秒）
POLL_INTERVAL = 2


class SeedEditLock:
    """Redis 分布式锁，确保同一时刻只有一个 SeedEdit 请求在执行。"""

    async def __aenter__(self) -> 'SeedEditLock':
        redis = await get_redis()
        while True:
            acquired = await redis.set(LOCK_KEY, '1', nx=True, ex=LOCK_TTL)
            if acquired:
                return self
            await asyncio.sleep(POLL_INTERVAL)

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        redis = await get_redis()
        await redis.delete(LOCK_KEY)
