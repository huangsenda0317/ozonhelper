"""Ozon Seller API HTTP 客户端"""

from functools import lru_cache

import httpx

from src.api.exceptions import AppException
from src.config import Settings, get_settings


class OzonSellerClient:
    """Ozon Seller API 异步客户端。"""

    def __init__(self, settings: Settings):
        self.base_url = settings.ozon_api_base_url.rstrip('/')
        self.client_id = settings.ozon_client_id
        self.api_key = settings.ozon_api_key
        self._http: httpx.AsyncClient | None = None

    def _get_http(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return self._http

    async def close(self) -> None:
        if self._http is not None and not self._http.is_closed:
            await self._http.aclose()
        self._http = None

    def _ensure_configured(self) -> None:
        if not self.client_id or not self.api_key:
            raise AppException(
                code='OZON_NOT_CONFIGURED',
                message='请在后端 .env 中配置 OZON_CLIENT_ID 与 OZON_API_KEY',
                http_status=503,
            )

    async def _post(self, path: str, body: dict) -> dict:
        self._ensure_configured()
        url = f'{self.base_url}{path}'
        headers = {
            'Client-Id': self.client_id,
            'Api-Key': self.api_key,
            'Content-Type': 'application/json',
        }
        try:
            response = await self._get_http().post(url, json=body, headers=headers)
        except httpx.TimeoutException as exc:
            raise AppException(
                code='OZON_API_ERROR',
                message='Ozon 服务请求超时，请稍后重试',
                http_status=502,
            ) from exc
        except httpx.RequestError as exc:
            raise AppException(
                code='OZON_API_ERROR',
                message='Ozon 服务连接失败，请稍后重试',
                http_status=502,
            ) from exc

        if response.status_code in (401, 403):
            raise AppException(
                code='OZON_AUTH_FAILED',
                message='Ozon API 认证失败，请检查 OZON_CLIENT_ID 与 OZON_API_KEY',
                http_status=502,
            )
        if response.status_code == 429:
            raise AppException(
                code='OZON_RATE_LIMIT',
                message='Ozon API 限流，请稍后重试',
                http_status=429,
            )
        if response.status_code >= 400:
            detail = response.text[:200] if response.text else ''
            raise AppException(
                code='OZON_API_ERROR',
                message=f'Ozon API 错误 ({response.status_code}){": " + detail if detail else ""}',
                http_status=502,
            )

        return response.json()

    async def product_list(
        self,
        *,
        visibility: str = 'ALL',
        last_id: str = '',
        limit: int = 100,
    ) -> dict:
        """POST /v3/product/list — 获取商品 ID 列表。"""
        body: dict = {
            'filter': {'visibility': visibility},
            'limit': min(limit, 1000),
        }
        if last_id:
            body['last_id'] = last_id
        return await self._post('/v3/product/list', body)

    async def product_info_list(
        self,
        *,
        product_ids: list[str] | None = None,
        offer_ids: list[str] | None = None,
        skus: list[str] | None = None,
    ) -> dict:
        """POST /v3/product/info/list — 批量获取商品详情。"""
        body: dict = {}
        if product_ids:
            body['product_id'] = product_ids
        if offer_ids:
            body['offer_id'] = offer_ids
        if skus:
            body['sku'] = skus
        return await self._post('/v3/product/info/list', body)


@lru_cache()
def get_ozon_client() -> OzonSellerClient:
    return OzonSellerClient(get_settings())


async def close_ozon_client() -> None:
    await get_ozon_client().close()
