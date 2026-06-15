"""店铺在线商品聚合服务 — Ozon list + info 两阶段拉取，Redis 缓存加速"""

import hashlib
import json
import logging
from datetime import datetime, timezone

from src.api.exceptions import NotFoundException
from src.cache import cache_delete, cache_get, cache_set
from src.config import get_settings
from src.schemas.tracking import TrackingProductDetail, TrackingProductListParams, TrackingProductSummary
from src.services.ozon.client import OzonSellerClient, get_ozon_client

logger = logging.getLogger(__name__)

MAX_SCAN_PAGES = 10
OZON_LIST_PAGE_SIZE = 100
CACHE_PREFIX = 'ozon:tracking:summaries'


def _parse_float(value: str | int | float | None) -> float | None:
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_prices(item: dict) -> dict:
    prices = item.get('prices') or {}
    price = _parse_float(prices.get('price') if prices else item.get('price'))
    old_price = _parse_float(prices.get('old_price') if prices else item.get('old_price'))
    min_price = _parse_float(prices.get('min_price') if prices else item.get('min_price'))
    currency = (
        (prices.get('currency') if prices else None)
        or item.get('currency_code')
        or 'RUB'
    )
    return {
        'price': price,
        'old_price': old_price,
        'min_price': min_price,
        'currency': currency,
    }


def _extract_stock(item: dict) -> tuple[int, int, bool]:
    stocks = item.get('stocks') or {}
    entries = stocks.get('entries') or stocks.get('stocks') or []
    if stocks.get('has_stock') is False and not entries:
        return 0, 0, False
    present = 0
    reserved = 0
    for entry in entries:
        present += int(entry.get('present') or 0)
        reserved += int(entry.get('reserved') or 0)
    has_stock = bool(stocks.get('has_stock', present > 0))
    return present, reserved, has_stock


def _first_url(value: str | list | None) -> str | None:
    if isinstance(value, list):
        return value[0] if value else None
    if isinstance(value, str):
        return value
    return None


def _extract_images(item: dict) -> tuple[str | None, list[str]]:
    primary = _first_url(item.get('primary_image'))
    images_data = item.get('images')
    all_images: list[str] = []
    if primary:
        all_images.append(primary)
    if isinstance(images_data, dict):
        for url in images_data.get('primary') or []:
            if isinstance(url, str) and url not in all_images:
                all_images.append(url)
    elif isinstance(images_data, list):
        for url in images_data:
            if isinstance(url, str) and url not in all_images:
                all_images.append(url)
    if not primary and all_images:
        primary = all_images[0]
    for url in item.get('images360') or []:
        if isinstance(url, str) and url not in all_images:
            all_images.append(url)
    return primary, all_images


def _product_id_str(item: dict) -> str:
    pid = item.get('id') or item.get('product_id')
    return str(pid) if pid is not None else ''


def _build_ozon_url(sku: str | None) -> str | None:
    if not sku:
        return None
    return f'https://www.ozon.ru/product/{sku}'


def map_to_summary(item: dict) -> TrackingProductSummary:
    prices = _extract_prices(item)
    present, _, _ = _extract_stock(item)
    primary, _ = _extract_images(item)
    statuses = item.get('statuses') or {}
    sku = item.get('sku')
    return TrackingProductSummary(
        product_id=_product_id_str(item),
        offer_id=str(item.get('offer_id') or ''),
        sku=str(sku) if sku is not None else None,
        name=str(item.get('name') or item.get('offer_id') or '未命名商品'),
        price=prices['price'],
        currency=prices['currency'],
        stock_present=present,
        status_name=statuses.get('status_name'),
        primary_image_url=primary,
        updated_at=item.get('updated_at'),
    )


def map_to_detail(item: dict) -> TrackingProductDetail:
    prices = _extract_prices(item)
    present, reserved, has_stock = _extract_stock(item)
    primary, all_images = _extract_images(item)
    statuses = item.get('statuses') or {}
    sku = item.get('sku')
    sku_str = str(sku) if sku is not None else None
    barcodes = item.get('barcodes') or []
    barcode = barcodes[0] if barcodes else item.get('barcode')

    return TrackingProductDetail(
        product_id=_product_id_str(item),
        offer_id=str(item.get('offer_id') or ''),
        sku=sku_str,
        name=str(item.get('name') or item.get('offer_id') or '未命名商品'),
        barcode=str(barcode) if barcode else None,
        price=prices['price'],
        old_price=prices['old_price'],
        min_price=prices['min_price'],
        currency=prices['currency'],
        stock_present=present,
        stock_reserved=reserved,
        has_stock=has_stock,
        status_name=statuses.get('status_name'),
        status_description=statuses.get('status_description'),
        moderate_status=statuses.get('moderate_status'),
        validation_status=statuses.get('validation_status'),
        primary_image=primary,
        images=all_images,
        created_at=item.get('created_at'),
        updated_at=item.get('updated_at'),
        ozon_url=_build_ozon_url(sku_str),
    )


def _matches_search(item: TrackingProductSummary, search: str) -> bool:
    q = search.lower().strip()
    if not q:
        return True
    return q in item.name.lower() or q in item.offer_id.lower()


def _matches_status(item: TrackingProductSummary, status: str | None) -> bool:
    if not status:
        return True
    if not item.status_name:
        return False
    return status.lower() in item.status_name.lower()


def _matches_stock(item: TrackingProductSummary, has_stock: bool | None) -> bool:
    if has_stock is None:
        return True
    if has_stock:
        return item.stock_present > 0
    return item.stock_present <= 0


def _sort_key(item: TrackingProductSummary, sort_by: str):
    if sort_by == 'price':
        return item.price if item.price is not None else -1
    if sort_by == 'name':
        return item.name.lower()
    return item.updated_at or ''


def _cache_key(client: OzonSellerClient, visibility: str) -> str:
    digest = hashlib.sha256(f'{client.client_id}:{client.api_key}'.encode()).hexdigest()[:16]
    return f'{CACHE_PREFIX}:{digest}:{visibility}'


async def _collect_product_ids(client: OzonSellerClient, visibility: str) -> list[str]:
    ids: list[str] = []
    last_id = ''
    for _ in range(MAX_SCAN_PAGES):
        raw = await client.product_list(
            visibility=visibility,
            last_id=last_id,
            limit=OZON_LIST_PAGE_SIZE,
        )
        result = raw.get('result') or {}
        batch = result.get('items') or []
        for row in batch:
            pid = row.get('product_id')
            if pid is not None:
                ids.append(str(pid))
        last_id = result.get('last_id') or ''
        if not batch or not last_id:
            break
    return ids


async def _fetch_summaries(client: OzonSellerClient, product_ids: list[str]) -> list[TrackingProductSummary]:
    if not product_ids:
        return []
    summaries: list[TrackingProductSummary] = []
    for i in range(0, len(product_ids), 1000):
        batch = product_ids[i : i + 1000]
        raw = await client.product_info_list(product_ids=batch)
        for item in raw.get('items') or []:
            summaries.append(map_to_summary(item))
    return summaries


async def _load_summaries_from_ozon(
    client: OzonSellerClient,
    visibility: str,
) -> tuple[list[TrackingProductSummary], str]:
    product_ids = await _collect_product_ids(client, visibility)
    summaries = await _fetch_summaries(client, product_ids)
    cached_at = datetime.now(timezone.utc).isoformat()
    return summaries, cached_at


async def _get_all_summaries(
    client: OzonSellerClient,
    visibility: str,
    *,
    refresh: bool = False,
) -> tuple[list[TrackingProductSummary], str | None]:
    settings = get_settings()
    key = _cache_key(client, visibility)

    if refresh:
        try:
            await cache_delete(key)
        except Exception:
            logger.warning('Redis 删除缓存失败，将继续从 Ozon 拉取', exc_info=True)

    if not refresh:
        try:
            cached = await cache_get(key)
            if cached:
                payload = json.loads(cached)
                items = [TrackingProductSummary.model_validate(x) for x in payload.get('items') or []]
                cached_at = payload.get('cached_at')
                return items, cached_at
        except Exception:
            logger.warning('Redis 读取缓存失败，降级为直接请求 Ozon', exc_info=True)

    summaries, cached_at = await _load_summaries_from_ozon(client, visibility)
    try:
        await cache_set(
            key,
            {
                'items': [item.model_dump() for item in summaries],
                'cached_at': cached_at,
            },
            settings.ozon_tracking_cache_ttl,
        )
    except Exception:
        logger.warning('Redis 写入缓存失败，结果仍正常返回', exc_info=True)

    return summaries, cached_at


class TrackingProductService:
    def __init__(self, client: OzonSellerClient | None = None):
        self.client = client or get_ozon_client()

    async def list_products(
        self,
        params: TrackingProductListParams,
        *,
        refresh: bool = False,
    ) -> tuple[list[TrackingProductSummary], int, str | None]:
        all_items, cached_at = await _get_all_summaries(
            self.client,
            params.visibility,
            refresh=refresh,
        )

        filtered = [
            item
            for item in all_items
            if _matches_search(item, params.search or '')
            and _matches_status(item, params.status)
            and _matches_stock(item, params.has_stock)
        ]

        reverse = params.sort_order != 'asc'
        filtered.sort(key=lambda x: _sort_key(x, params.sort_by), reverse=reverse)

        total = len(filtered)
        start = (params.page - 1) * params.limit
        page_items = filtered[start : start + params.limit]
        return page_items, total, cached_at

    async def get_product_detail(self, product_id: str) -> TrackingProductDetail:
        raw = await self.client.product_info_list(product_ids=[product_id])
        items = raw.get('items') or []
        if not items:
            raise NotFoundException('product', product_id)
        return map_to_detail(items[0])


tracking_product_service = TrackingProductService()
