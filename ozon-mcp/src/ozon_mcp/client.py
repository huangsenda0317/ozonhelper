from __future__ import annotations

import json

import httpx

from ozon_mcp.config import Settings, get_settings
from ozon_mcp.errors import OzonApiError, OzonAuthFailedError, OzonNotConfiguredError, OzonRateLimitError
from ozon_mcp.rate_limiter import TokenBucketRateLimiter


class OzonApiClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.base_url = self.settings.ozon_api_base_url.rstrip('/')
        self._http: httpx.AsyncClient | None = None
        self._limiter = TokenBucketRateLimiter()

    def _get_http(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(timeout=httpx.Timeout(30.0))
        return self._http

    def _ensure_configured(self) -> None:
        if not self.settings.ozon_client_id or not self.settings.ozon_api_key:
            raise OzonNotConfiguredError()

    def _headers(self) -> dict[str, str]:
        return {
            'Client-Id': self.settings.ozon_client_id,
            'Api-Key': self.settings.ozon_api_key,
            'Content-Type': 'application/json',
        }

    async def _handle_response(self, response: httpx.Response) -> dict:
        if response.status_code in (401, 403):
            raise OzonAuthFailedError()
        if response.status_code == 429:
            raise OzonRateLimitError()
        if response.status_code >= 400:
            detail = response.text[:300] if response.text else ''
            raise OzonApiError(f'Ozon API 错误 ({response.status_code}){": " + detail if detail else ""}')
        if not response.text:
            return {}
        return response.json()

    async def post(self, path: str, body: dict | None = None) -> dict:
        self._ensure_configured()
        await self._limiter.acquire()
        url = f'{self.base_url}{path}'
        try:
            response = await self._get_http().post(url, json=body or {}, headers=self._headers())
        except httpx.TimeoutException as exc:
            raise OzonApiError('Ozon 服务请求超时，请稍后重试') from exc
        except httpx.RequestError as exc:
            raise OzonApiError('Ozon 服务连接失败，请稍后重试') from exc
        return await self._handle_response(response)

    async def get(self, path: str) -> dict:
        self._ensure_configured()
        await self._limiter.acquire()
        url = f'{self.base_url}{path}'
        try:
            response = await self._get_http().get(url, headers=self._headers())
        except httpx.TimeoutException as exc:
            raise OzonApiError('Ozon 服务请求超时，请稍后重试') from exc
        except httpx.RequestError as exc:
            raise OzonApiError('Ozon 服务连接失败，请稍后重试') from exc
        return await self._handle_response(response)

    async def call(self, path: str, method: str = 'POST', body: dict | None = None) -> dict:
        if method.upper() == 'GET':
            return await self.get(path)
        return await self.post(path, body)

    @staticmethod
    def dumps(data: dict) -> str:
        return json.dumps(data, ensure_ascii=False, indent=2)
