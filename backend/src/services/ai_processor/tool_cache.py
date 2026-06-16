"""单次对话内 Ozon 工具调用去重与结果缓存"""

from __future__ import annotations

import json
from typing import Any


def _sorted_str_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return sorted(str(item) for item in value)
    return [str(value)]


def tool_cache_key(name: str, args: dict[str, Any] | None) -> str:
    """将等价工具调用映射为同一缓存键（含 ozon_api_call 与语义化工具对齐）。"""
    args = args or {}

    if name == 'ozon_api_call':
        path = str(args.get('path', ''))
        body = args.get('body') or {}
        if not isinstance(body, dict):
            body = {}
        if path == '/v3/product/list':
            filt = body.get('filter') if isinstance(body.get('filter'), dict) else {}
            return tool_cache_key(
                'get_product_list',
                {
                    'visibility': filt.get('visibility', 'ALL'),
                    'last_id': body.get('last_id', ''),
                    'limit': body.get('limit', 100),
                },
            )
        if path == '/v4/product/info/stocks':
            filt = body.get('filter') if isinstance(body.get('filter'), dict) else {}
            return tool_cache_key(
                'get_product_stocks',
                {
                    'product_ids': filt.get('product_id') or body.get('product_ids'),
                    'offer_ids': filt.get('offer_id') or body.get('offer_ids'),
                    'limit': body.get('limit', 100),
                    'cursor': body.get('cursor', ''),
                },
            )
        if path == '/v1/seller/info':
            return tool_cache_key('get_seller_info', {})
        if path == '/v2/warehouse/list':
            return tool_cache_key(
                'list_warehouses',
                {'limit': body.get('limit', 100), 'offset': body.get('offset', 0)},
            )
        return f'ozon_api_call:{path}:{json.dumps(body, sort_keys=True, default=str)}'

    if name == 'get_product_list':
        payload = {
            'visibility': str(args.get('visibility') or 'ALL'),
            'last_id': str(args.get('last_id') or ''),
            'limit': int(args.get('limit', 100)),
        }
        return f'get_product_list:{json.dumps(payload, sort_keys=True)}'

    if name == 'get_product_stocks':
        payload = {
            'product_ids': _sorted_str_list(args.get('product_ids')),
            'offer_ids': _sorted_str_list(args.get('offer_ids')),
            'limit': int(args.get('limit', 100)),
            'cursor': str(args.get('cursor') or ''),
        }
        return f'get_product_stocks:{json.dumps(payload, sort_keys=True)}'

    if name == 'get_seller_info':
        return 'get_seller_info:{}'

    if name == 'list_warehouses':
        payload = {
            'limit': int(args.get('limit', 100)),
            'offset': int(args.get('offset', 0)),
        }
        return f'list_warehouses:{json.dumps(payload, sort_keys=True)}'

    if name in ('get_fbs_orders', 'get_fbs_unfulfilled_orders'):
        payload = {
            'since': str(args.get('since') or ''),
            'to': str(args.get('to') or ''),
            'limit': int(args.get('limit', 100)),
            'offset': int(args.get('offset', 0)),
            'status': str(args.get('status') or ''),
        }
        return f'{name}:{json.dumps(payload, sort_keys=True)}'

    return f'{name}:{json.dumps(args, sort_keys=True, default=str)}'


class ToolResultCache:
    """同一 stream_chat 会话内缓存工具结果，避免重复请求 Ozon。"""

    def __init__(self) -> None:
        self._results: dict[str, str] = {}

    async def get_or_execute(
        self,
        *,
        name: str,
        args: dict[str, Any],
        execute,
    ) -> tuple[str, bool]:
        key = tool_cache_key(name, args)
        if key in self._results:
            return self._results[key], True
        result = await execute(name, args)
        self._results[key] = result
        return result, False
