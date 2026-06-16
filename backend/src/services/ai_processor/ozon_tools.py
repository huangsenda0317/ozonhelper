"""Ozon 只读工具注册与执行（供 AI 问答 Function Calling）"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

from src.services.ozon.client import OzonSellerClient

MAX_TOOL_RESULT_CHARS = 8000

TOOL_LABELS: dict[str, str] = {
    'get_seller_info': '查询卖家账户信息',
    'get_product_list': '获取商品列表',
    'get_product_stocks': '查询商品库存',
    'get_fbs_unfulfilled_orders': '获取未处理 FBS 订单',
    'get_fbs_orders': '获取 FBS 订单列表',
    'list_warehouses': '获取仓库列表',
    'ozon_api_call': '调用 Ozon API',
}


def get_tool_label(name: str) -> str:
    return TOOL_LABELS.get(name, name)

# 智谱 tools 参数 schema
OZON_TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        'type': 'function',
        'function': {
            'name': 'get_seller_info',
            'description': '获取 Ozon 卖家账户信息。POST /v1/seller/info',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_product_list',
            'description': '分页获取商品 ID 列表。POST /v3/product/list',
            'parameters': {
                'type': 'object',
                'properties': {
                    'visibility': {
                        'type': 'string',
                        'enum': ['ALL', 'VISIBLE', 'INVISIBLE', 'EMPTY_STOCK', 'NOT_MODERATED'],
                        'description': '商品可见性筛选',
                    },
                    'last_id': {'type': 'string', 'description': '分页游标'},
                    'limit': {'type': 'integer', 'description': '每页数量，最大 1000', 'default': 100},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_product_stocks',
            'description': '查询商品库存。POST /v4/product/info/stocks',
            'parameters': {
                'type': 'object',
                'properties': {
                    'product_ids': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': '商品 product_id 列表',
                    },
                    'offer_ids': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': '卖家 offer_id 列表',
                    },
                    'limit': {'type': 'integer', 'default': 100},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_fbs_unfulfilled_orders',
            'description': '获取未处理 FBS 订单。POST /v4/posting/fbs/unfulfilled/list',
            'parameters': {
                'type': 'object',
                'properties': {
                    'since': {'type': 'string', 'description': 'ISO8601 起始时间'},
                    'to': {'type': 'string', 'description': 'ISO8601 结束时间'},
                    'limit': {'type': 'integer', 'default': 100},
                    'offset': {'type': 'integer', 'default': 0},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_fbs_orders',
            'description': '获取 FBS 货件列表。POST /v4/posting/fbs/list',
            'parameters': {
                'type': 'object',
                'properties': {
                    'since': {'type': 'string', 'description': 'ISO8601 起始时间'},
                    'to': {'type': 'string', 'description': 'ISO8601 结束时间'},
                    'status': {'type': 'string', 'description': '订单状态筛选'},
                    'limit': {'type': 'integer', 'default': 100},
                    'offset': {'type': 'integer', 'default': 0},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'list_warehouses',
            'description': '获取仓库列表。POST /v2/warehouse/list',
            'parameters': {
                'type': 'object',
                'properties': {
                    'limit': {'type': 'integer', 'default': 100},
                    'offset': {'type': 'integer', 'default': 0},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'ozon_api_call',
            'description': '通用 Ozon API 只读调用（慎用：若已有 get_product_list 等语义化工具，勿用本工具重复查询同一接口）。',
            'parameters': {
                'type': 'object',
                'properties': {
                    'path': {'type': 'string', 'description': 'API path，如 /v1/seller/info'},
                    'method': {'type': 'string', 'enum': ['POST', 'GET'], 'default': 'POST'},
                    'body': {'type': 'object', 'description': '请求体 JSON'},
                },
                'required': ['path'],
            },
        },
    },
]


def _default_since_to() -> tuple[str, str]:
    now = datetime.now(UTC)
    since = (now - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    to = now.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    return since, to


def _truncate(text: str) -> str:
    if len(text) <= MAX_TOOL_RESULT_CHARS:
        return text
    return text[:MAX_TOOL_RESULT_CHARS] + '\n…(结果已截断)'


def _dumps(data: Any) -> str:
    return _truncate(json.dumps(data, ensure_ascii=False, indent=2))


async def run_ozon_tool(client: OzonSellerClient, name: str, args: dict[str, Any]) -> str:
    """执行 Ozon 工具并返回 JSON 字符串。"""
    try:
        if name == 'get_seller_info':
            return _dumps(await client.seller_info())

        if name == 'get_product_list':
            return _dumps(
                await client.product_list(
                    visibility=args.get('visibility', 'ALL'),
                    last_id=args.get('last_id', ''),
                    limit=int(args.get('limit', 100)),
                )
            )

        if name == 'get_product_stocks':
            return _dumps(
                await client.product_stocks_info(
                    product_ids=args.get('product_ids'),
                    offer_ids=args.get('offer_ids'),
                    limit=int(args.get('limit', 100)),
                )
            )

        if name == 'get_fbs_unfulfilled_orders':
            since, to = _default_since_to()
            since = args.get('since', since)
            to = args.get('to', to)
            body = {
                'filter': {'since': since, 'to': to},
                'limit': int(args.get('limit', 100)),
                'offset': int(args.get('offset', 0)),
            }
            return _dumps(await client._post('/v4/posting/fbs/unfulfilled/list', body))

        if name == 'get_fbs_orders':
            since, to = _default_since_to()
            since = args.get('since', since)
            to = args.get('to', to)
            return _dumps(
                await client.posting_fbs_list(
                    since=since,
                    to=to,
                    limit=int(args.get('limit', 100)),
                    offset=int(args.get('offset', 0)),
                    status=args.get('status'),
                )
            )

        if name == 'list_warehouses':
            body = {
                'limit': int(args.get('limit', 100)),
                'offset': int(args.get('offset', 0)),
            }
            return _dumps(await client._post('/v2/warehouse/list', body))

        if name == 'ozon_api_call':
            path = args.get('path', '')
            if not path.startswith('/v'):
                return json.dumps({'error': 'path 必须以 /v 开头'}, ensure_ascii=False)
            method = str(args.get('method', 'POST')).upper()
            body = args.get('body') or {}
            if method == 'GET':
                return _dumps(await client._post(path, body))
            return _dumps(await client._post(path, body))

        return json.dumps({'error': f'未知工具: {name}'}, ensure_ascii=False)
    except Exception as exc:  # noqa: BLE001 — 工具错误回传给模型
        return json.dumps({'error': str(exc)}, ensure_ascii=False)
