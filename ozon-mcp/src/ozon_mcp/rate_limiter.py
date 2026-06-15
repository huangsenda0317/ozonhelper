from __future__ import annotations

import asyncio
import time

from ozon_mcp.errors import OzonRateLimitError


class TokenBucketRateLimiter:
    """每 Client-Id 每秒最多 max_per_second 次请求。"""

    def __init__(self, max_per_second: int = 50) -> None:
        self.max_per_second = max_per_second
        self._tokens = float(max_per_second)
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._tokens = min(self.max_per_second, self._tokens + elapsed * self.max_per_second)
            self._last_refill = now
            if self._tokens < 1:
                raise OzonRateLimitError()
            self._tokens -= 1
