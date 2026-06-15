from __future__ import annotations

from typing import Any

from ozon_mcp.client import OzonApiClient


def _ok(data: dict) -> str:
    return OzonApiClient.dumps(data)


async def get_product_stocks(
    client: OzonApiClient,
    product_ids: list[int] | None = None,
    offer_ids: list[str] | None = None,
) -> str:
    """POST /v4/product/info/stocks — 查询商品库存。"""
    body: dict[str, Any] = {'filter': {}}
    filt = body['filter']
    if product_ids:
        filt['product_id'] = product_ids
    if offer_ids:
        filt['offer_id'] = offer_ids
    return _ok(await client.post('/v4/product/info/stocks', body))


async def get_fbs_stocks_by_warehouse(client: OzonApiClient, sku: list[int]) -> str:
    """POST /v2/product/info/stocks-by-warehouse/fbs — 按仓库查询 FBS 库存。"""
    return _ok(await client.post('/v2/product/info/stocks-by-warehouse/fbs', {'sku': sku}))


async def update_stocks(client: OzonApiClient, stocks: list[dict]) -> str:
    """POST /v2/products/stocks — 更新库存（单次最多 100 条）。"""
    if len(stocks) > 100:
        raise ValueError('stocks 最多 100 条')
    return _ok(await client.post('/v2/products/stocks', {'stocks': stocks}))


async def get_product_prices(
    client: OzonApiClient,
    product_ids: list[int] | None = None,
    offer_ids: list[str] | None = None,
) -> str:
    """POST /v5/product/info/prices — 查询商品价格。"""
    body: dict[str, Any] = {'filter': {}}
    filt = body['filter']
    if product_ids:
        filt['product_id'] = product_ids
    if offer_ids:
        filt['offer_id'] = offer_ids
    return _ok(await client.post('/v5/product/info/prices', body))


async def update_prices(client: OzonApiClient, prices: list[dict]) -> str:
    """POST /v1/product/import/prices — 批量更新价格。"""
    return _ok(await client.post('/v1/product/import/prices', {'prices': prices}))
