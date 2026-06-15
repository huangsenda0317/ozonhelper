from __future__ import annotations

import json
from typing import Any

from ozon_mcp.api_index import get_endpoint_schema as lookup_schema
from ozon_mcp.api_index import search_endpoints as search_index
from ozon_mcp.client import OzonApiClient


def _ok(data: dict | list) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


async def get_seller_info(client: OzonApiClient) -> str:
    """POST /v1/seller/info — 获取卖家账户信息。"""
    return OzonApiClient.dumps(await client.post('/v1/seller/info', {}))


async def get_api_roles(client: OzonApiClient) -> str:
    """POST /v1/roles — 获取 API 密钥角色与到期时间。"""
    return OzonApiClient.dumps(await client.post('/v1/roles', {}))


async def list_warehouses(client: OzonApiClient, limit: int = 100, offset: int = 0) -> str:
    """POST /v2/warehouse/list — 获取仓库列表。"""
    return OzonApiClient.dumps(await client.post('/v2/warehouse/list', {'limit': limit, 'offset': offset}))


async def get_transaction_list(
    client: OzonApiClient,
    date_from: str,
    date_to: str,
    page: int = 1,
    page_size: int = 100,
) -> str:
    """POST /v3/finance/transaction/list — 查询交易流水。"""
    body = {
        'filter': {'date': {'from': date_from, 'to': date_to}},
        'page': page,
        'page_size': page_size,
    }
    return OzonApiClient.dumps(await client.post('/v3/finance/transaction/list', body))


async def get_realization_report(client: OzonApiClient, month: int, year: int) -> str:
    """POST /v2/finance/realization — 获取商品销售报告。"""
    return OzonApiClient.dumps(await client.post('/v2/finance/realization', {'month': month, 'year': year}))


async def list_chats(client: OzonApiClient, limit: int = 30, offset: int = 0) -> str:
    """POST /v3/chat/list — 获取聊天列表。"""
    return OzonApiClient.dumps(await client.post('/v3/chat/list', {'limit': limit, 'offset': offset}))


async def get_chat_history(client: OzonApiClient, chat_id: str, limit: int = 50) -> str:
    """POST /v3/chat/history — 获取聊天历史。"""
    return OzonApiClient.dumps(await client.post('/v3/chat/history', {'chat_id': chat_id, 'limit': limit}))


async def send_chat_message(client: OzonApiClient, chat_id: str, text: str) -> str:
    """POST /v1/chat/send/message — 发送聊天消息。"""
    return OzonApiClient.dumps(await client.post('/v1/chat/send/message', {'chat_id': chat_id, 'text': text}))


def get_endpoint_schema(path: str) -> str:
    """从 api-index.json 查询端点 schema、请求范例（来源：官方 HTML 文档）。"""
    entry = lookup_schema(path)
    if entry is None:
        suggestions = search_index(path.strip('/').split('/')[-1], limit=5)
        return _ok({'error': f'未找到端点: {path}', 'suggestions': suggestions})
    return _ok(entry)


def search_endpoints(query: str, limit: int = 20) -> str:
    """在 api-index 中按关键词搜索端点 path 与标题。"""
    return _ok(search_index(query, limit=limit))


async def ozon_api_call(
    client: OzonApiClient,
    path: str,
    method: str = 'POST',
    body: dict | None = None,
) -> str:
    """通用 Ozon API 调用。建议先 get_endpoint_schema 查参数。path 须以 /v 开头。"""
    if not path.startswith('/v'):
        raise ValueError('path 必须以 /v 开头，例如 /v3/product/import')
    result = await client.call(path, method=method, body=body)
    return OzonApiClient.dumps(result)
