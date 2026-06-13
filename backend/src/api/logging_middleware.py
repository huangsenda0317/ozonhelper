"""请求日志中间件 — 结构化 JSON 日志"""

import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class LoggingMiddleware(BaseHTTPMiddleware):
    """记录每个 HTTP 请求的方法、路径、状态码和耗时。"""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        start_time = time.monotonic()

        response = await call_next(request)

        elapsed = (time.monotonic() - start_time) * 1000
        response.headers['X-Request-ID'] = request_id

        # 结构化日志输出
        print(
            f'[REQ {request_id}] {request.method} {request.url.path} '
            f'→ {response.status_code} ({elapsed:.1f}ms)'
        )
        return response
