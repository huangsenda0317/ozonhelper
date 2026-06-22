"""Ozon Seller API HTTP 客户端"""

from __future__ import annotations

import asyncio

import httpx

from src.api.exceptions import AppException
from src.config import Settings, get_settings
from src.services.ozon.rate_limiter import get_ozon_rate_limiter


class OzonSellerClient:
    """Ozon Seller API 异步客户端。"""

    def __init__(
        self,
        settings: Settings,
        *,
        client_id: str,
        api_key: str,
    ):
        self.base_url = settings.ozon_api_base_url.rstrip('/')
        self.client_id = client_id
        self.api_key = api_key
        self._http: httpx.AsyncClient | None = None
        self._rate_limiter = get_ozon_rate_limiter()

    @classmethod
    def from_credentials(cls, *, client_id: str, api_key: str) -> OzonSellerClient:
        return cls(get_settings(), client_id=client_id, api_key=api_key)

    @classmethod
    def from_store(cls, store) -> OzonSellerClient:
        from src.services.stores.credentials import decrypt_store_api_key, decrypt_store_client_id

        return cls.from_credentials(
            client_id=decrypt_store_client_id(store),
            api_key=decrypt_store_api_key(store),
        )

    def _get_http(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=45.0, read=60.0, write=30.0, pool=30.0),
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
                message='尚未绑定 Ozon 店铺，请前往设置页添加店铺 Client-Id 与 Api-Key',
                http_status=503,
            )

    async def _post(self, path: str, body: dict, *, retries: int = 3) -> dict:
        self._ensure_configured()
        url = f'{self.base_url}{path}'
        headers = {
            'Client-Id': self.client_id,
            'Api-Key': self.api_key,
            'Content-Type': 'application/json',
        }
        last_exc: AppException | None = None
        for attempt in range(retries):
            await self._rate_limiter.acquire(self.client_id)
            try:
                response = await self._get_http().post(url, json=body, headers=headers)
            except httpx.TimeoutException as exc:
                last_exc = AppException(
                    code='OZON_API_ERROR',
                    message='Ozon 服务连接超时，请检查网络或代理后重试',
                    http_status=502,
                )
                if attempt < retries - 1:
                    await asyncio.sleep(2**attempt)
                    continue
                raise last_exc from exc
            except httpx.RequestError as exc:
                last_exc = AppException(
                    code='OZON_API_ERROR',
                    message='Ozon 服务连接失败，请检查网络或代理后重试',
                    http_status=502,
                )
                if attempt < retries - 1:
                    await asyncio.sleep(2**attempt)
                    continue
                raise last_exc from exc

            if response.status_code in (401, 403):
                raise AppException(
                    code='OZON_AUTH_FAILED',
                    message='Ozon API 认证失败，请检查 Client-Id 与 Api-Key',
                    http_status=502,
                )
            if response.status_code == 429:
                last_exc = AppException(
                    code='OZON_RATE_LIMIT',
                    message='Ozon API 限流，请稍后重试',
                    http_status=429,
                )
                await asyncio.sleep(2**attempt)
                continue
            if response.status_code >= 400:
                detail = response.text[:200] if response.text else ''
                raise AppException(
                    code='OZON_API_ERROR',
                    message=f'Ozon API 错误 ({response.status_code}){": " + detail if detail else ""}',
                    http_status=502,
                )
            try:
                return response.json()
            except ValueError as exc:
                detail = response.text[:200] if response.text else ''
                raise AppException(
                    code='OZON_API_ERROR',
                    message='Ozon API 返回无效 JSON'
                    + (f': {detail}' if detail else ''),
                    http_status=502,
                ) from exc

        if last_exc:
            raise last_exc
        raise AppException(code='OZON_API_ERROR', message='Ozon API 请求失败', http_status=502)

    async def product_list(
        self,
        *,
        visibility: str = 'ALL',
        last_id: str = '',
        limit: int = 100,
    ) -> dict:
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
        body: dict = {}
        if product_ids:
            body['product_id'] = product_ids
        if offer_ids:
            body['offer_id'] = offer_ids
        if skus:
            body['sku'] = skus
        return await self._post('/v3/product/info/list', body)

    async def product_stocks_info(
        self,
        *,
        product_ids: list[str] | None = None,
        offer_ids: list[str] | None = None,
        limit: int = 100,
        cursor: str = '',
    ) -> dict:
        filt: dict = {'visibility': 'ALL'}
        if product_ids:
            filt['product_id'] = [str(pid) for pid in product_ids]
        if offer_ids:
            filt['offer_id'] = offer_ids
        body: dict = {
            'filter': filt,
            'limit': min(max(limit, 1), 1000),
        }
        if cursor:
            body['cursor'] = cursor
        return await self._post('/v4/product/info/stocks', body)

    async def update_stocks(self, *, stocks: list[dict]) -> dict:
        return await self._post('/v2/products/stocks', {'stocks': stocks})

    async def posting_fbs_list(
        self,
        *,
        since: str,
        to: str,
        limit: int = 100,
        offset: int = 0,
        status: str | None = None,
    ) -> dict:
        filt: dict = {'since': since, 'to': to}
        if status:
            filt['status'] = status
        return await self._post(
            '/v4/posting/fbs/list',
            {'filter': filt, 'limit': limit, 'offset': offset, 'with': {'financial_data': True}},
        )

    async def posting_fbo_list(
        self,
        *,
        since: str,
        to: str,
        limit: int = 100,
        offset: int = 0,
        status: str | None = None,
    ) -> dict:
        filt: dict = {'since': since, 'to': to}
        if status:
            filt['status'] = status
        return await self._post(
            '/v3/posting/fbo/list',
            {'filter': filt, 'limit': limit, 'offset': offset, 'with': {'financial_data': True}},
        )

    async def analytics_data(
        self,
        *,
        date_from: str,
        date_to: str,
        metrics: list[str],
        dimension: list[str] | None = None,
        filters: list[dict] | None = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> dict:
        body: dict = {
            'date_from': date_from,
            'date_to': date_to,
            'metrics': metrics,
            'dimension': dimension or ['day'],
            'filters': filters or [],
            'limit': min(max(limit, 1), 1000),
            'offset': max(offset, 0),
        }
        return await self._post('/v1/analytics/data', body)

    async def product_archive(self, *, product_ids: list[int]) -> dict:
        return await self._post('/v1/product/archive', {'product_id': product_ids})

    async def product_unarchive(self, *, product_ids: list[int]) -> dict:
        return await self._post('/v1/product/unarchive', {'product_id': product_ids})

    async def seller_info(self) -> dict:
        return await self._post('/v1/seller/info', {})

    async def product_info_prices(
        self,
        *,
        product_ids: list[str] | None = None,
        offer_ids: list[str] | None = None,
        limit: int = 100,
    ) -> dict:
        filt: dict = {}
        if product_ids:
            filt['product_id'] = [int(pid) for pid in product_ids if str(pid).isdigit()]
        if offer_ids:
            filt['offer_id'] = offer_ids
        return await self._post('/v5/product/info/prices', {'filter': filt, 'limit': min(limit, 1000)})

    async def price_import(self, *, prices: list[dict]) -> dict:
        return await self._post('/v1/product/import/prices', {'prices': prices})

    async def product_import(self, *, items: list[dict]) -> dict:
        return await self._post('/v3/product/import', {'items': items})

    async def product_import_info(self, *, task_id: int | str) -> dict:
        return await self._post('/v1/product/import/info', {'task_id': int(task_id)})

    async def posting_fbs_get(self, *, posting_number: str) -> dict:
        return await self._post('/v3/posting/fbs/get', {'posting_number': posting_number})

    async def posting_fbs_ship(self, *, posting_number: str, packages: list[dict]) -> dict:
        return await self._post('/v4/posting/fbs/ship', {'posting_number': posting_number, 'packages': packages})

    async def set_tracking_number(self, *, posting_number: str, tracking_number: str) -> dict:
        return await self._post(
            '/v2/fbs/posting/tracking-number/set',
            {'posting_number': posting_number, 'tracking_number': tracking_number},
        )

    async def finance_transaction_list(
        self,
        *,
        date_from: str,
        date_to: str,
        page: int = 1,
        page_size: int = 100,
    ) -> dict:
        return await self._post(
            '/v3/finance/transaction/list',
            {
                'filter': {'date': {'from': date_from, 'to': date_to}, 'transaction_type': 'all'},
                'page': page,
                'page_size': min(page_size, 1000),
            },
        )

    async def returns_list(
        self,
        *,
        last_id: str = '',
        limit: int = 100,
    ) -> dict:
        body: dict = {'limit': min(limit, 500)}
        if last_id:
            body['last_id'] = last_id
        return await self._post('/v1/returns/list', body)

    async def review_list(
        self,
        *,
        last_id: str = '',
        limit: int = 100,
        sort_dir: str = 'DESC',
    ) -> dict:
        body: dict = {'limit': min(limit, 100), 'sort_dir': sort_dir}
        if last_id:
            body['last_id'] = last_id
        return await self._post('/v2/review/list', body)
