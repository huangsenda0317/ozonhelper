"""Ozon API per-Client-Id 限流"""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict


class TokenBucketRateLimiter:
    """每 Client-Id 每秒最多 max_per_second 次请求。"""

    def __init__(self, max_per_second: int = 50) -> None:
        self.max_per_second = max_per_second
        self._buckets: dict[str, tuple[float, float]] = {}
        self._locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def acquire(self, client_id: str) -> None:
        lock = self._locks[client_id]
        async with lock:
            now = time.monotonic()
            tokens, last_refill = self._buckets.get(client_id, (float(self.max_per_second), now))
            elapsed = now - last_refill
            tokens = min(self.max_per_second, tokens + elapsed * self.max_per_second)
            if tokens < 1:
                wait = (1 - tokens) / self.max_per_second
                await asyncio.sleep(wait)
                now = time.monotonic()
                tokens = min(self.max_per_second, tokens + wait * self.max_per_second)
            self._buckets[client_id] = (tokens - 1, now)


_ozon_rate_limiter = TokenBucketRateLimiter()


def get_ozon_rate_limiter() -> TokenBucketRateLimiter:
    return _ozon_rate_limiter
