"""智谱 GLM Chat Completions 客户端"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from src.api.exceptions import AppException
from src.config import get_settings

GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'


class GlmClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def _ensure_configured(self) -> str:
        if not self._settings.glm_api_key:
            raise AppException(
                code='GLM_NOT_CONFIGURED',
                message='未配置智谱 GLM API Key，请在 backend/.env 设置 GLM_API_KEY',
                http_status=503,
            )
        return self._settings.glm_api_key

    def _headers(self, api_key: str) -> dict[str, str]:
        return {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }

    async def stream_completion(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """流式调用，yield 解析后的 chunk dict。"""
        api_key = self._ensure_configured()
        body: dict[str, Any] = {
            'model': model,
            'messages': messages,
            'stream': True,
        }
        if tools:
            body['tools'] = tools

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                async with client.stream(
                    'POST',
                    GLM_API_URL,
                    headers=self._headers(api_key),
                    json=body,
                ) as response:
                    if response.status_code >= 400:
                        detail = (await response.aread()).decode()[:300]
                        raise AppException(
                            code='GLM_API_ERROR',
                            message=f'智谱 API 错误 ({response.status_code}): {detail}',
                            http_status=502,
                        )
                    async for line in response.aiter_lines():
                        if not line or not line.startswith('data:'):
                            continue
                        payload = line[5:].strip()
                        if payload == '[DONE]':
                            break
                        try:
                            yield json.loads(payload)
                        except json.JSONDecodeError:
                            continue
        except httpx.TimeoutException as exc:
            raise AppException(
                code='GLM_API_ERROR',
                message='智谱 API 请求超时',
                http_status=502,
            ) from exc
        except httpx.RequestError as exc:
            raise AppException(
                code='GLM_API_ERROR',
                message='智谱 API 连接失败',
                http_status=502,
            ) from exc


glm_client = GlmClient()
