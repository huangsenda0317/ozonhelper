"""DeepPick 选品排行榜 — 代理查询、Redis 缓存与降级。"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from src.api.exceptions import ServiceUnavailableException
from src.cache import cache_get, cache_set
from src.config import get_settings
from src.schemas.deeppick_rankings import (
    CategoryOptionNode,
    CategoryOptionsResponse,
    RankingListMeta,
    RankingListResponse,
    RankingQueryParams,
)
from src.services.deeppick.category_mapper import build_category_tree
from src.services.deeppick.client import DeepPickClient, get_deeppick_client
from src.services.deeppick.mappers import map_items, map_summary

logger = logging.getLogger(__name__)

CACHE_PREFIX = 'deeppick:rankings:'
CATEGORY_CACHE_PREFIX = 'deeppick:category-options:'
STALE_SUFFIX = ':stale'
STALE_TTL = 86400  # 24 小时降级备份
CATEGORY_CACHE_TTL = 21600  # 6 小时


class DeepPickRankingService:
    """DeepPick 榜单代理服务。"""

    def __init__(self, client: DeepPickClient | None = None) -> None:
        self._client = client or get_deeppick_client()
        self._settings = get_settings()

    def _cache_key(self, params: RankingQueryParams) -> str:
        return (
            f'{CACHE_PREFIX}{params.view}:{params.sort_key}:'
            f'{params.category}:{params.keyword}:{params.sales_schema}:'
            f'{params.page}:{params.limit}'
        )

    async def get_rankings(
        self,
        params: RankingQueryParams,
    ) -> tuple[RankingListResponse, RankingListMeta]:
        key = self._cache_key(params)
        cached = await self._read_cache(key)
        if cached:
            return self._build_from_cache(cached, stale=False)

        try:
            payload = await self._fetch_from_deeppick(params)
            cached_at = datetime.now(timezone.utc).isoformat()
            await self._write_cache(key, payload, params, cached_at)
            return self._build_response(payload, params, cached_at=cached_at, stale=False)
        except (httpx.HTTPError, ServiceUnavailableException) as exc:
            logger.warning('DeepPick 请求失败，尝试降级缓存: %s', exc)
            stale_cached = await self._read_cache(f'{key}{STALE_SUFFIX}')
            if stale_cached:
                return self._build_from_cache(stale_cached, stale=True)
            if isinstance(exc, ServiceUnavailableException):
                raise
            raise ServiceUnavailableException(
                code='DEEPPICK_UNAVAILABLE',
                message='DeepPick 服务请求失败且无可用缓存，请稍后重试',
            ) from exc

    async def fetch_and_cache(self, params: RankingQueryParams) -> None:
        """拉取并写入缓存（供 Celery 预热）。"""
        payload = await self._fetch_from_deeppick(params)
        cached_at = datetime.now(timezone.utc).isoformat()
        key = self._cache_key(params)
        await self._write_cache(key, payload, params, cached_at)

    async def get_category_options(
        self,
        *,
        sort_key: str = 'sum_gmv_desc',
    ) -> CategoryOptionsResponse:
        """获取级联类目选项（带缓存）。"""
        key = f'{CATEGORY_CACHE_PREFIX}{sort_key}'
        cached = await self._read_cache(key)
        if cached and cached.get('options') is not None:
            return CategoryOptionsResponse(
                options=[CategoryOptionNode.model_validate(o) for o in cached['options']],
                total=cached.get('total', 0),
            )

        try:
            raw = await self._client.fetch_category_options(sort_key=sort_key)
            items = raw.get('items') or []
            tree = build_category_tree(items)
            response = CategoryOptionsResponse(
                options=tree,
                total=len(items),
            )
            envelope = {
                'options': [node.model_dump() for node in tree],
                'total': len(items),
            }
            await cache_set(key, envelope, CATEGORY_CACHE_TTL)
            await cache_set(f'{key}{STALE_SUFFIX}', envelope, STALE_TTL)
            return response
        except (httpx.HTTPError, ServiceUnavailableException) as exc:
            logger.warning('DeepPick 类目选项请求失败: %s', exc)
            stale = await self._read_cache(f'{key}{STALE_SUFFIX}')
            if stale and stale.get('options'):
                return CategoryOptionsResponse(
                    options=[CategoryOptionNode.model_validate(o) for o in stale['options']],
                    total=stale.get('total', 0),
                )
            raise

    async def _fetch_from_deeppick(self, params: RankingQueryParams) -> dict[str, Any]:
        return await self._client.fetch_rankings_page(
            view=params.view,
            page=params.page,
            limit=params.limit,
            sort_key=params.sort_key,
            keyword=params.keyword,
            category=params.category,
            sales_schema=params.sales_schema,
        )

    async def _read_cache(self, key: str) -> dict[str, Any] | None:
        raw = await cache_get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    async def _write_cache(
        self,
        key: str,
        payload: dict[str, Any],
        params: RankingQueryParams,
        cached_at: str,
    ) -> None:
        envelope = {
            'payload': payload,
            'cached_at': cached_at,
            'params': params.model_dump(),
        }
        await cache_set(key, envelope, self._settings.deeppick_cache_ttl)
        await cache_set(f'{key}{STALE_SUFFIX}', envelope, STALE_TTL)

    def _build_from_cache(
        self,
        cached: dict[str, Any],
        *,
        stale: bool,
    ) -> tuple[RankingListResponse, RankingListMeta]:
        params = RankingQueryParams.model_validate(cached['params'])
        return self._build_response(
            cached['payload'],
            params,
            cached_at=cached.get('cached_at'),
            stale=stale,
        )

    def _build_response(
        self,
        payload: dict[str, Any],
        params: RankingQueryParams,
        *,
        cached_at: str | None,
        stale: bool,
    ) -> tuple[RankingListResponse, RankingListMeta]:
        items_raw = payload.get('items') or []
        items = map_items(params.view, items_raw)
        summary = map_summary(payload.get('summary'))
        pagination = payload.get('pagination') or {}
        total = pagination.get('total', len(items))
        meta = RankingListMeta(
            total=total,
            page=params.page,
            limit=params.limit,
            cached_at=cached_at,
            stale=stale,
        )
        return RankingListResponse(items=items, summary=summary), meta


deeppick_ranking_service = DeepPickRankingService()
