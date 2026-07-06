"""DeepPick API 异步客户端 — 认证、刷新、榜单拉取。"""

from __future__ import annotations

import base64
import json
import logging
import secrets
import time
from typing import Any

import httpx

from src.api.exceptions import ServiceUnavailableException
from src.config import Settings, get_settings

logger = logging.getLogger(__name__)

PRODUCT_VIEWS = frozenset({'product', 'opportunity'})

AUTH_HELP = (
    '请从已登录 DeepPick 浏览器导出 localStorage：'
    'deeppick_admin_auth（accessToken / refreshToken）与 deeppick_admin_device_id，'
    '写入 backend/.env 的 DEEPPICK_ACCESS_TOKEN、DEEPPICK_REFRESH_TOKEN、DEEPPICK_DEVICE_ID'
)


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    payload_b64 = token.split('.')[1]
    padding = '=' * (-len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64 + padding))


def _generate_device_id() -> str:
    return f'web-{int(time.time() * 1000)}-{secrets.token_hex(8)}'


def _extract_device_id(token: str, device_id: str | None) -> str:
    jwt_device_id: str | None = None
    if token:
        try:
            payload = _decode_jwt_payload(token)
            raw = payload.get('device_id')
            if isinstance(raw, str) and raw:
                jwt_device_id = raw
        except (IndexError, json.JSONDecodeError, ValueError):
            pass

    # DeepPick web 会话 ID 形如 web-{timestamp}-{hex}，优先 JWT 内嵌值
    if jwt_device_id and jwt_device_id.startswith('web-'):
        return jwt_device_id
    if device_id and device_id.startswith('web-'):
        return device_id
    if jwt_device_id:
        return jwt_device_id
    if device_id:
        return device_id
    if token:
        return ''
    return _generate_device_id()


def _auth_expired_exception(detail: str = '') -> ServiceUnavailableException:
    msg = f'DeepPick 凭据无效或已过期。{AUTH_HELP}'
    if detail:
        msg = f'{detail}。{AUTH_HELP}'
    return ServiceUnavailableException(code='DEEPPICK_AUTH_EXPIRED', message=msg)


class DeepPickClient:
    """DeepPick Ozon 选品排行榜 API 客户端。"""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self.access_token = self._settings.deeppick_access_token
        self.refresh_token = self._settings.deeppick_refresh_token or None
        self.device_id = _extract_device_id(
            self.access_token,
            self._settings.deeppick_device_id or None,
        )
        self.base_url = self._settings.deeppick_base_url.rstrip('/')

    def _ensure_configured(self) -> None:
        if not self.access_token:
            raise ServiceUnavailableException(
                code='DEEPPICK_NOT_CONFIGURED',
                message=f'未配置 DeepPick 凭据。{AUTH_HELP}',
            )
        if not self.device_id:
            raise ServiceUnavailableException(
                code='DEEPPICK_DEVICE_ID_MISSING',
                message=f'未配置 DEEPPICK_DEVICE_ID。{AUTH_HELP}',
            )

    def _auth_headers(self, token: str | None = None) -> dict[str, str]:
        headers = {
            'Authorization': f'Bearer {token or self.access_token}',
            'x-deeppick-client': 'web',
        }
        if self.device_id:
            headers['x-device-id'] = self.device_id
        return headers

    def _default_headers(self) -> dict[str, str]:
        return {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/149.0.0.0 Safari/537.36'
            ),
            'Referer': f'{self.base_url}/ozon-rankings/products',
        }

    async def refresh_access_token(self, client: httpx.AsyncClient) -> None:
        if not self.refresh_token:
            raise _auth_expired_exception('缺少 DEEPPICK_REFRESH_TOKEN')

        resp = await client.post(
            f'{self.base_url}/api/v1/auth/refresh',
            headers=self._auth_headers(self.refresh_token),
        )
        if resp.status_code == 401:
            raise _auth_expired_exception('refresh_token 已失效')
        try:
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise _auth_expired_exception('刷新 token 请求失败') from exc

        body = resp.json()
        if not body.get('ok'):
            raise _auth_expired_exception('刷新 token 返回错误')

        data = body['data']
        self.access_token = data['access_token']
        self.refresh_token = data.get('refresh_token', self.refresh_token)
        logger.info('DeepPick access_token 已刷新')

    async def _get_json(
        self,
        client: httpx.AsyncClient,
        path: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> Any:
        headers = {**self._default_headers(), **self._auth_headers()}
        url = f'{self.base_url}{path}'
        query = params or {}

        resp = await client.get(url, params=query, headers=headers)
        if resp.status_code == 401:
            if self.refresh_token:
                await self.refresh_access_token(client)
                headers = {**self._default_headers(), **self._auth_headers()}
                resp = await client.get(url, params=query, headers=headers)
            else:
                raise _auth_expired_exception('access_token 已失效且无 refresh_token')

        if resp.status_code == 401:
            raise _auth_expired_exception('access_token 已失效')

        try:
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise ServiceUnavailableException(
                code='DEEPPICK_API_ERROR',
                message='DeepPick 接口请求失败，请稍后重试',
            ) from exc

        body = resp.json()
        if not body.get('ok'):
            raise ServiceUnavailableException(
                code='DEEPPICK_API_ERROR',
                message='DeepPick 返回错误响应',
            )
        return body['data']

    async def fetch_category_options(
        self,
        *,
        sort_key: str = 'sum_gmv_desc',
    ) -> dict[str, Any]:
        """拉取类目筛选选项。"""
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=60.0) as client:
            return await self._get_json(
                client,
                '/api/v1/ozon/rankings/products/category-options',
                params={'sort_key': sort_key},
            )

    async def fetch_rankings_page(
        self,
        *,
        view: str = 'product',
        page: int = 1,
        limit: int = 50,
        sort_key: str = 'sum_gmv_desc',
        keyword: str = '',
        category: str = '',
        sales_schema: str = '',
    ) -> dict[str, Any]:
        """拉取单页榜单原始数据。"""
        self._ensure_configured()

        params = {
            'sort_key': sort_key,
            'view': view,
            'keyword': keyword,
            'category': category,
            'page': page,
            'limit': limit,
        }
        if sales_schema:
            params['sales_schema'] = sales_schema

        async with httpx.AsyncClient(timeout=60.0) as client:
            return await self._get_json(
                client,
                '/api/v1/ozon/rankings/products',
                params=params,
            )


def get_deeppick_client() -> DeepPickClient:
    return DeepPickClient()
