from __future__ import annotations

import json
from typing import Any

from ozon_mcp.client import OzonApiClient


def _ok(data: dict) -> str:
    return OzonApiClient.dumps(data)


async def get_category_tree(client: OzonApiClient, language: str = 'ZH_HANS') -> str:
    """POST /v1/description-category/tree — 获取商品类目与类型树。"""
    return _ok(await client.post('/v1/description-category/tree', {'language': language}))


async def get_category_attributes(
    client: OzonApiClient,
    description_category_id: int,
    type_id: int,
    language: str = 'ZH_HANS',
) -> str:
    """POST /v1/description-category/attribute — 获取类目属性列表。"""
    body = {
        'description_category_id': description_category_id,
        'type_id': type_id,
        'language': language,
    }
    return _ok(await client.post('/v1/description-category/attribute', body))


async def get_attribute_values(
    client: OzonApiClient,
    attribute_id: int,
    description_category_id: int,
    type_id: int,
    language: str = 'ZH_HANS',
    limit: int = 100,
    last_value_id: int = 0,
) -> str:
    """POST /v1/description-category/attribute/values — 获取属性可选值。"""
    body: dict[str, Any] = {
        'attribute_id': attribute_id,
        'description_category_id': description_category_id,
        'type_id': type_id,
        'language': language,
        'limit': limit,
    }
    if last_value_id:
        body['last_value_id'] = last_value_id
    return _ok(await client.post('/v1/description-category/attribute/values', body))


async def import_products(client: OzonApiClient, items: list[dict]) -> str:
    """POST /v3/product/import — 创建或更新商品（单次最多 100 件）。"""
    if len(items) > 100:
        raise ValueError('items 最多 100 条')
    return _ok(await client.post('/v3/product/import', {'items': items}))


async def get_import_status(client: OzonApiClient, task_id: int) -> str:
    """POST /v1/product/import/info — 查询商品导入任务状态。"""
    return _ok(await client.post('/v1/product/import/info', {'task_id': task_id}))


async def get_product_list(
    client: OzonApiClient,
    visibility: str = 'ALL',
    last_id: str = '',
    limit: int = 100,
) -> str:
    """POST /v3/product/list — 分页获取商品 ID 列表。"""
    body: dict[str, Any] = {'filter': {'visibility': visibility}, 'limit': min(limit, 1000)}
    if last_id:
        body['last_id'] = last_id
    return _ok(await client.post('/v3/product/list', body))


async def get_product_info(
    client: OzonApiClient,
    product_ids: list[int] | None = None,
    offer_ids: list[str] | None = None,
    skus: list[int] | None = None,
) -> str:
    """POST /v3/product/info/list — 批量获取商品详情。"""
    body: dict[str, Any] = {}
    if product_ids:
        body['product_id'] = product_ids
    if offer_ids:
        body['offer_id'] = offer_ids
    if skus:
        body['sku'] = skus
    return _ok(await client.post('/v3/product/info/list', body))


async def import_product_pictures(client: OzonApiClient, product_id: int, images: list[str]) -> str:
    """POST /v1/product/pictures/import — 上传或更新商品图片。"""
    return _ok(await client.post('/v1/product/pictures/import', {'product_id': product_id, 'images': images}))


async def archive_product(client: OzonApiClient, product_id: list[int]) -> str:
    """POST /v1/product/archive — 归档商品。"""
    return _ok(await client.post('/v1/product/archive', {'product_id': product_id}))


async def unarchive_product(client: OzonApiClient, product_id: list[int]) -> str:
    """POST /v1/product/unarchive — 从归档恢复商品。"""
    return _ok(await client.post('/v1/product/unarchive', {'product_id': product_id}))
