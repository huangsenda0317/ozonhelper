"""AI 问答编排：LLM + Ozon 工具调用"""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.exceptions import AppException
from src.models.store import Store
from src.models.user import User
from src.schemas.ai import ChatRequest
from src.services.ai_processor.llm_client import stream_llm_completion
from src.services.ai_processor.ozon_tools import OZON_TOOL_DEFINITIONS, get_tool_label, run_ozon_tool
from src.services.stores.credentials import ozon_client_for_store

MAX_TOOL_ROUNDS = 5

SYSTEM_PROMPT_TEMPLATE = """你是 OzonHelper 的店铺运营助手，帮助卖家查询 Ozon 店铺数据。

当前店铺：{store_name}
店铺 ID：{store_id}

规则：
1. 仅使用提供的 Ozon 工具获取实时数据，不要编造数字或订单状态。
2. 优先使用语义化工具（get_seller_info、get_fbs_orders 等），必要时再用 ozon_api_call。
3. 工具无数据或报错时，如实告知用户并给出可能原因。
4. 回答使用简体中文，数据展示清晰，可适当使用 Markdown 表格或列表。
5. 本次会话为只读查询，不要尝试修改库存、价格或发货。"""


def _sse(event: str, data: dict[str, Any]) -> str:
    return f'event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n'


async def _load_store(db: AsyncSession, user: User, store_id: str) -> Store:
    try:
        store_uuid = uuid.UUID(store_id)
    except ValueError as exc:
        raise AppException(
            code='STORE_NOT_FOUND',
            message='店铺不存在',
            http_status=404,
        ) from exc

    stmt = select(Store).where(Store.id == store_uuid, Store.user_id == user.id)
    store = (await db.execute(stmt)).scalar_one_or_none()
    if not store:
        raise AppException(code='STORE_NOT_FOUND', message='店铺不存在', http_status=404)
    return store


def _merge_tool_calls(
    acc: dict[int, dict[str, Any]],
    delta_calls: list[dict[str, Any]] | None,
) -> None:
    if not delta_calls:
        return
    for call in delta_calls:
        idx = call.get('index', 0)
        entry = acc.setdefault(
            idx,
            {'id': '', 'type': 'function', 'function': {'name': '', 'arguments': ''}},
        )
        if call.get('id'):
            entry['id'] = call['id']
        fn = call.get('function') or {}
        if fn.get('name'):
            entry['function']['name'] = fn['name']
        if fn.get('arguments'):
            entry['function']['arguments'] += fn['arguments']


async def stream_chat(
    *,
    db: AsyncSession,
    user: User,
    request: ChatRequest,
) -> AsyncIterator[str]:
    """生成 SSE 事件流。"""
    try:
        store = await _load_store(db, user, request.store_id)
        ozon_client = ozon_client_for_store(store)
        ozon_client._ensure_configured()

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            store_name=store.name,
            store_id=str(store.id),
        )
        messages: list[dict[str, Any]] = [
            {'role': 'system', 'content': system_prompt},
            *[m.model_dump() for m in request.messages],
        ]

        tool_rounds = 0
        while tool_rounds <= MAX_TOOL_ROUNDS:
            tool_calls_acc: dict[int, dict[str, Any]] = {}
            finish_reason: str | None = None
            streamed_any_content = False
            reasoning_acc = ''
            content_acc = ''

            async for chunk in stream_llm_completion(
                model=request.model,
                messages=messages,
                tools=OZON_TOOL_DEFINITIONS,
            ):
                choices = chunk.get('choices') or []
                if not choices:
                    continue
                choice = choices[0]
                delta = choice.get('delta') or {}
                finish_reason = choice.get('finish_reason') or finish_reason

                reasoning = delta.get('reasoning_content')
                if reasoning:
                    reasoning_acc += reasoning
                    yield _sse('think_delta', {'content': reasoning})

                content = delta.get('content')
                if content:
                    content_acc += content
                    streamed_any_content = True
                    yield _sse('delta', {'content': content})

                _merge_tool_calls(tool_calls_acc, delta.get('tool_calls'))

            has_tool_calls = any(
                (call.get('function') or {}).get('name') for call in tool_calls_acc.values()
            )
            if has_tool_calls and (finish_reason == 'tool_calls' or finish_reason != 'stop'):
                tool_rounds += 1
                if tool_rounds > MAX_TOOL_ROUNDS:
                    yield _sse(
                        'delta',
                        {'content': '\n\n（已达工具调用上限，请缩小问题范围后重试。）'},
                    )
                    break

                if reasoning_acc:
                    yield _sse('think_done', {})

                ordered_calls = [tool_calls_acc[i] for i in sorted(tool_calls_acc)]
                assistant_msg: dict[str, Any] = {
                    'role': 'assistant',
                    'tool_calls': ordered_calls,
                }
                if content_acc:
                    assistant_msg['content'] = content_acc
                else:
                    assistant_msg['content'] = None
                if reasoning_acc:
                    assistant_msg['reasoning_content'] = reasoning_acc
                messages.append(assistant_msg)

                for call in ordered_calls:
                    fn = call.get('function') or {}
                    name = fn.get('name', '')
                    label = get_tool_label(name)
                    raw_args = fn.get('arguments') or '{}'
                    try:
                        args = json.loads(raw_args) if raw_args else {}
                    except json.JSONDecodeError:
                        args = {}

                    yield _sse('tool_start', {'name': name, 'label': label, 'args': args})
                    result = await run_ozon_tool(ozon_client, name, args)
                    preview = result[:200] + '…' if len(result) > 200 else result
                    has_error = '"error"' in result[:80]
                    yield _sse(
                        'tool_end',
                        {
                            'name': name,
                            'label': label,
                            'result_preview': preview,
                            'status': 'error' if has_error else 'success',
                        },
                    )

                    messages.append(
                        {
                            'role': 'tool',
                            'tool_call_id': call.get('id') or str(uuid.uuid4()),
                            'content': result,
                        }
                    )
                continue

            if reasoning_acc and not has_tool_calls:
                yield _sse('think_done', {})

            if not streamed_any_content and not tool_calls_acc:
                yield _sse('delta', {'content': '抱歉，未能生成回答，请重试。'})
            break

        yield _sse('done', {})
    except AppException as exc:
        yield _sse('error', {'message': exc.message, 'code': exc.code})
    except Exception as exc:  # noqa: BLE001
        yield _sse('error', {'message': str(exc)})
