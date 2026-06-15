from __future__ import annotations

import functools

from mcp.server.fastmcp import FastMCP

from ozon_mcp.client import OzonApiClient
from ozon_mcp.resources import read_resource
from ozon_mcp.tools import catalog, inventory, meta, orders

mcp = FastMCP('ozon-seller-api')
_client = OzonApiClient()


def _safe(coro):
    @functools.wraps(coro)
    async def runner(*args, **kwargs):
        try:
            return await coro(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001 — 向 Agent 返回结构化错误
            return str(exc)

    return runner


def _safe_sync(fn):
    @functools.wraps(fn)
    def runner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            return str(exc)

    return runner


# --- Resources ---


@mcp.resource('ozon://api/overview')
def resource_overview() -> str:
    """Ozon Seller API 能力分组与 Agent 推荐工具。"""
    return read_resource('ozon://api/overview')


@mcp.resource('ozon://api/endpoints')
def resource_endpoints() -> str:
    """按模块分类的 Ozon API 端点目录。"""
    return read_resource('ozon://api/endpoints')


@mcp.resource('ozon://api/workflows')
def resource_workflows() -> str:
    """核心业务流程：上架、FBS 订单、促销、定价、退货。"""
    return read_resource('ozon://api/workflows')


# --- Catalog ---


@mcp.tool()
@_safe
async def get_category_tree(language: str = 'ZH_HANS') -> str:
    """获取 Ozon 商品类目树。Ozon: POST /v1/description-category/tree"""
    return await catalog.get_category_tree(_client, language=language)


@mcp.tool()
@_safe
async def get_category_attributes(description_category_id: int, type_id: int, language: str = 'ZH_HANS') -> str:
    """获取类目属性列表。Ozon: POST /v1/description-category/attribute"""
    return await catalog.get_category_attributes(
        _client, description_category_id=description_category_id, type_id=type_id, language=language
    )


@mcp.tool()
@_safe
async def get_attribute_values(
    attribute_id: int,
    description_category_id: int,
    type_id: int,
    language: str = 'ZH_HANS',
    limit: int = 100,
    last_value_id: int = 0,
) -> str:
    """获取属性可选值。Ozon: POST /v1/description-category/attribute/values"""
    return await catalog.get_attribute_values(
        _client,
        attribute_id=attribute_id,
        description_category_id=description_category_id,
        type_id=type_id,
        language=language,
        limit=limit,
        last_value_id=last_value_id,
    )


@mcp.tool()
@_safe
async def import_products(items: list[dict]) -> str:
    """创建或更新商品（≤100 件/次）。Ozon: POST /v3/product/import。建议先 get_endpoint_schema。"""
    return await catalog.import_products(_client, items=items)


@mcp.tool()
@_safe
async def get_import_status(task_id: int) -> str:
    """查询商品导入任务状态。Ozon: POST /v1/product/import/info"""
    return await catalog.get_import_status(_client, task_id=task_id)


@mcp.tool()
@_safe
async def get_product_list(visibility: str = 'ALL', last_id: str = '', limit: int = 100) -> str:
    """分页获取商品 ID 列表。Ozon: POST /v3/product/list"""
    return await catalog.get_product_list(_client, visibility=visibility, last_id=last_id, limit=limit)


@mcp.tool()
@_safe
async def get_product_info(
    product_ids: list[int] | None = None,
    offer_ids: list[str] | None = None,
    skus: list[int] | None = None,
) -> str:
    """批量获取商品详情。Ozon: POST /v3/product/info/list"""
    return await catalog.get_product_info(_client, product_ids=product_ids, offer_ids=offer_ids, skus=skus)


@mcp.tool()
@_safe
async def import_product_pictures(product_id: int, images: list[str]) -> str:
    """上传商品图片（URL 列表）。Ozon: POST /v1/product/pictures/import"""
    return await catalog.import_product_pictures(_client, product_id=product_id, images=images)


@mcp.tool()
@_safe
async def archive_product(product_id: list[int]) -> str:
    """归档商品。Ozon: POST /v1/product/archive"""
    return await catalog.archive_product(_client, product_id=product_id)


@mcp.tool()
@_safe
async def unarchive_product(product_id: list[int]) -> str:
    """从归档恢复商品。Ozon: POST /v1/product/unarchive"""
    return await catalog.unarchive_product(_client, product_id=product_id)


# --- Inventory ---


@mcp.tool()
@_safe
async def get_product_stocks(product_ids: list[int] | None = None, offer_ids: list[str] | None = None) -> str:
    """查询商品库存。Ozon: POST /v4/product/info/stocks"""
    return await inventory.get_product_stocks(_client, product_ids=product_ids, offer_ids=offer_ids)


@mcp.tool()
@_safe
async def get_fbs_stocks_by_warehouse(sku: list[int]) -> str:
    """按仓库查询 FBS 库存。Ozon: POST /v2/product/info/stocks-by-warehouse/fbs"""
    return await inventory.get_fbs_stocks_by_warehouse(_client, sku=sku)


@mcp.tool()
@_safe
async def update_stocks(stocks: list[dict]) -> str:
    """更新库存（≤100 条/次）。Ozon: POST /v2/products/stocks"""
    return await inventory.update_stocks(_client, stocks=stocks)


@mcp.tool()
@_safe
async def get_product_prices(product_ids: list[int] | None = None, offer_ids: list[str] | None = None) -> str:
    """查询商品价格。Ozon: POST /v5/product/info/prices"""
    return await inventory.get_product_prices(_client, product_ids=product_ids, offer_ids=offer_ids)


@mcp.tool()
@_safe
async def update_prices(prices: list[dict]) -> str:
    """批量更新价格。Ozon: POST /v1/product/import/prices"""
    return await inventory.update_prices(_client, prices=prices)


# --- Orders ---


@mcp.tool()
@_safe
async def get_fbs_unfulfilled_orders(since: str, to: str, limit: int = 100, offset: int = 0) -> str:
    """获取未处理 FBS 订单。Ozon: POST /v4/posting/fbs/unfulfilled/list。since/to 为 ISO8601。"""
    return await orders.get_fbs_unfulfilled_orders(_client, since=since, to=to, limit=limit, offset=offset)


@mcp.tool()
@_safe
async def get_fbs_orders(
    since: str, to: str, limit: int = 100, offset: int = 0, status: str | None = None
) -> str:
    """获取 FBS 货件列表。Ozon: POST /v4/posting/fbs/list"""
    return await orders.get_fbs_orders(_client, since=since, to=to, limit=limit, offset=offset, status=status)


@mcp.tool()
@_safe
async def get_fbs_order(posting_number: str) -> str:
    """获取 FBS 订单详情。Ozon: POST /v3/posting/fbs/get"""
    return await orders.get_fbs_order(_client, posting_number=posting_number)


@mcp.tool()
@_safe
async def ship_fbs_order(posting_number: str, packages: list[dict]) -> str:
    """FBS 订单备货。Ozon: POST /v4/posting/fbs/ship"""
    return await orders.ship_fbs_order(_client, posting_number=posting_number, packages=packages)


@mcp.tool()
@_safe
async def print_package_label(posting_number: list[str]) -> str:
    """打印包裹标签。Ozon: POST /v2/posting/fbs/package-label"""
    return await orders.print_package_label(_client, posting_number=posting_number)


@mcp.tool()
@_safe
async def mark_awaiting_delivery(posting_number: list[str]) -> str:
    """标记货件待发货。Ozon: POST /v2/posting/fbs/awaiting-delivery"""
    return await orders.mark_awaiting_delivery(_client, posting_number=posting_number)


@mcp.tool()
@_safe
async def cancel_fbs_order(posting_number: str, cancel_reason_id: int) -> str:
    """取消 FBS 货件。Ozon: POST /v2/posting/fbs/cancel"""
    return await orders.cancel_fbs_order(_client, posting_number=posting_number, cancel_reason_id=cancel_reason_id)


@mcp.tool()
@_safe
async def set_tracking_number(posting_number: str, tracking_number: str) -> str:
    """设置 rFBS 物流单号。Ozon: POST /v2/fbs/posting/tracking-number/set"""
    return await orders.set_tracking_number(_client, posting_number=posting_number, tracking_number=tracking_number)


@mcp.tool()
@_safe
async def mark_delivering(posting_number: str) -> str:
    """标记 rFBS 运输中。Ozon: POST /v2/fbs/posting/delivering"""
    return await orders.mark_delivering(_client, posting_number=posting_number)


@mcp.tool()
@_safe
async def mark_delivered(posting_number: str) -> str:
    """标记 rFBS 已送达。Ozon: POST /v2/fbs/posting/delivered"""
    return await orders.mark_delivered(_client, posting_number=posting_number)


# --- Meta ---


@mcp.tool()
@_safe
async def get_seller_info() -> str:
    """获取卖家账户信息。Ozon: POST /v1/seller/info"""
    return await meta.get_seller_info(_client)


@mcp.tool()
@_safe
async def get_api_roles() -> str:
    """获取 API 密钥角色与到期时间。Ozon: POST /v1/roles"""
    return await meta.get_api_roles(_client)


@mcp.tool()
@_safe
async def list_warehouses(limit: int = 100, offset: int = 0) -> str:
    """获取仓库列表。Ozon: POST /v2/warehouse/list"""
    return await meta.list_warehouses(_client, limit=limit, offset=offset)


@mcp.tool()
@_safe
async def get_transaction_list(date_from: str, date_to: str, page: int = 1, page_size: int = 100) -> str:
    """查询交易流水。Ozon: POST /v3/finance/transaction/list"""
    return await meta.get_transaction_list(_client, date_from=date_from, date_to=date_to, page=page, page_size=page_size)


@mcp.tool()
@_safe
async def get_realization_report(month: int, year: int) -> str:
    """获取商品销售报告。Ozon: POST /v2/finance/realization"""
    return await meta.get_realization_report(_client, month=month, year=year)


@mcp.tool()
@_safe
async def list_chats(limit: int = 30, offset: int = 0) -> str:
    """获取买家聊天列表。Ozon: POST /v3/chat/list"""
    return await meta.list_chats(_client, limit=limit, offset=offset)


@mcp.tool()
@_safe
async def get_chat_history(chat_id: str, limit: int = 50) -> str:
    """获取聊天历史。Ozon: POST /v3/chat/history"""
    return await meta.get_chat_history(_client, chat_id=chat_id, limit=limit)


@mcp.tool()
@_safe
async def send_chat_message(chat_id: str, text: str) -> str:
    """发送聊天消息。Ozon: POST /v1/chat/send/message"""
    return await meta.send_chat_message(_client, chat_id=chat_id, text=text)


@mcp.tool()
@_safe_sync
def get_endpoint_schema(path: str) -> str:
    """查询端点参数 schema 与请求范例（来自官方 HTML 文档解析的 api-index）。调用 ozon_api_call 前建议使用。"""
    return meta.get_endpoint_schema(path)


@mcp.tool()
@_safe_sync
def search_endpoints(query: str, limit: int = 20) -> str:
    """按关键词搜索 Ozon API 端点（path、标题）。"""
    return meta.search_endpoints(query, limit=limit)


@mcp.tool()
@_safe
async def ozon_api_call(path: str, method: str = 'POST', body: dict | None = None) -> str:
    """通用 Ozon API 调用，覆盖全部 263 个端点。建议先 get_endpoint_schema 查参数。path 须以 /v 开头。"""
    return await meta.ozon_api_call(_client, path=path, method=method, body=body)


def main() -> None:
    mcp.run()


if __name__ == '__main__':
    main()
