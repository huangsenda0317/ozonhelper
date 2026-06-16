"""请求日志中间件 — 纯 ASGI 实现，不破坏 SSE / StreamingResponse"""

from __future__ import annotations

import time
import uuid


class LoggingMiddleware:
    """记录每个 HTTP 请求的方法、路径、状态码和耗时。"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())[:8]
        start_time = time.monotonic()
        method = scope.get('method', '')
        path = scope.get('path', '')
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message['type'] == 'http.response.start':
                status_code = message.get('status', 500)
                headers = list(message.get('headers', []))
                headers.append((b'x-request-id', request_id.encode()))
                message = {**message, 'headers': headers}
            elif message['type'] == 'http.response.body' and not message.get('more_body', False):
                elapsed = (time.monotonic() - start_time) * 1000
                print(
                    f'[REQ {request_id}] {method} {path} '
                    f'→ {status_code} ({elapsed:.1f}ms)'
                )
            await send(message)

        await self.app(scope, receive, send_wrapper)
