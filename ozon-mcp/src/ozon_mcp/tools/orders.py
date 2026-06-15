from __future__ import annotations

from typing import Any

from ozon_mcp.client import OzonApiClient


def _ok(data: dict) -> str:
    return OzonApiClient.dumps(data)


async def get_fbs_unfulfilled_orders(
    client: OzonApiClient,
    since: str,
    to: str,
    limit: int = 100,
    offset: int = 0,
) -> str:
    """POST /v4/posting/fbs/unfulfilled/list — 获取未处理 FBS 订单。"""
    body = {'filter': {'since': since, 'to': to}, 'limit': limit, 'offset': offset}
    return _ok(await client.post('/v4/posting/fbs/unfulfilled/list', body))


async def get_fbs_orders(
    client: OzonApiClient,
    since: str,
    to: str,
    limit: int = 100,
    offset: int = 0,
    status: str | None = None,
) -> str:
    """POST /v4/posting/fbs/list — 获取 FBS 货件列表。"""
    filt: dict[str, Any] = {'since': since, 'to': to}
    if status:
        filt['status'] = status
    body = {'filter': filt, 'limit': limit, 'offset': offset}
    return _ok(await client.post('/v4/posting/fbs/list', body))


async def get_fbs_order(client: OzonApiClient, posting_number: str) -> str:
    """POST /v3/posting/fbs/get — 按 posting_number 获取订单详情。"""
    return _ok(await client.post('/v3/posting/fbs/get', {'posting_number': posting_number}))


async def ship_fbs_order(client: OzonApiClient, posting_number: str, packages: list[dict]) -> str:
    """POST /v4/posting/fbs/ship — FBS 订单备货/装配。"""
    return _ok(await client.post('/v4/posting/fbs/ship', {'posting_number': posting_number, 'packages': packages}))


async def print_package_label(client: OzonApiClient, posting_number: list[str]) -> str:
    """POST /v2/posting/fbs/package-label — 打印包裹标签。"""
    return _ok(await client.post('/v2/posting/fbs/package-label', {'posting_number': posting_number}))


async def mark_awaiting_delivery(client: OzonApiClient, posting_number: list[str]) -> str:
    """POST /v2/posting/fbs/awaiting-delivery — 标记货件待发货。"""
    return _ok(await client.post('/v2/posting/fbs/awaiting-delivery', {'posting_number': posting_number}))


async def cancel_fbs_order(client: OzonApiClient, posting_number: str, cancel_reason_id: int) -> str:
    """POST /v2/posting/fbs/cancel — 取消 FBS 货件。"""
    body = {'posting_number': posting_number, 'cancel_reason_id': cancel_reason_id}
    return _ok(await client.post('/v2/posting/fbs/cancel', body))


async def set_tracking_number(client: OzonApiClient, posting_number: str, tracking_number: str) -> str:
    """POST /v2/fbs/posting/tracking-number/set — 设置 rFBS 物流单号。"""
    return _ok(
        await client.post(
            '/v2/fbs/posting/tracking-number/set',
            {'posting_number': posting_number, 'tracking_number': tracking_number},
        )
    )


async def mark_delivering(client: OzonApiClient, posting_number: str) -> str:
    """POST /v2/fbs/posting/delivering — 标记 rFBS 运输中。"""
    return _ok(await client.post('/v2/fbs/posting/delivering', {'posting_number': posting_number}))


async def mark_delivered(client: OzonApiClient, posting_number: str) -> str:
    """POST /v2/fbs/posting/delivered — 标记 rFBS 已送达。"""
    return _ok(await client.post('/v2/fbs/posting/delivered', {'posting_number': posting_number}))
