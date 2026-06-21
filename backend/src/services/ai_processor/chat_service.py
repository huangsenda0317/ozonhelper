"""AI 问答编排：LLM + Ozon 工具调用"""

from __future__ import annotations

import asyncio
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
from src.services.ai_processor.tool_cache import ToolResultCache
from src.services.ozon.dates import prompt_datetime_context
from src.services.stores.credentials import ozon_client_for_store

MAX_TOOL_ROUNDS = 12

TOOL_LIMIT_USER_HINT = (
    '系统提示：本轮对话已达到工具调用次数上限。'
    '请仅根据对话历史中已有的工具返回结果，用简体中文给出最终回答；'
    '若数据不完整请如实说明，勿编造。'
)

SYSTEM_PROMPT_TEMPLATE = """你是 OzonHelper 的店铺运营助手，帮助卖家查询 Ozon 店铺数据。

当前时间：{current_time}
当前店铺：{store_name}
店铺 ID：{store_id}

规则：
1. 仅使用提供的 Ozon 工具获取实时数据，不要编造数字或订单状态。
2. 优先使用语义化工具（get_seller_info、get_fbs_orders、get_product_list 等），不要用 ozon_api_call 重复调用同一接口。
3. 同一轮需要多个独立数据时，尽量在一次回复中并行调用多个工具，减少往返轮次。
4. 禁止重复调用参数相同的工具；若对话历史中已有 tool 返回结果，直接引用，勿再次请求。
5. 商品列表分页时仅在需要下一页时传入新的 last_id，勿重复请求第一页。
6. 工具无数据或报错时，如实告知用户并给出可能原因。
7. 回答使用简体中文，数据展示清晰，可适当使用 Markdown 表格或列表。
8. 本次会话为只读查询，不要尝试修改库存、价格或发货。
9. 用户询问「今天」「现在几号/几点」或相对日期（如「最近 7 天」）时，必须以「当前时间」为准作答，禁止凭训练记忆猜测日期。"""


def _sse(event: str, data: dict[str, Any]) -> str:
    return f'event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n'


async def _yield_sse(event: str, data: dict[str, Any]) -> AsyncIterator[str]:
    """发送单帧 SSE 并让出事件循环，避免 chunk 被合并后一次性下发。"""
    yield _sse(event, data)
    await asyncio.sleep(0)


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


async def _stream_completion_round(
    *,
    model: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None,
) -> AsyncIterator[str | dict[str, Any]]:
    """流式执行一轮 LLM，yield SSE 字符串；结束时 yield 状态 dict（带 __round__ 标记）。"""
    tool_calls_acc: dict[int, dict[str, Any]] = {}
    finish_reason: str | None = None
    streamed_any_content = False
    reasoning_acc = ''
    content_acc = ''

    async for chunk in stream_llm_completion(model=model, messages=messages, tools=tools):
        choices = chunk.get('choices') or []
        if not choices:
            continue
        choice = choices[0]
        delta = choice.get('delta') or {}
        finish_reason = choice.get('finish_reason') or finish_reason

        reasoning = delta.get('reasoning_content')
        if reasoning:
            reasoning_acc += reasoning
            async for frame in _yield_sse('think_delta', {'content': reasoning}):
                yield frame

        content = delta.get('content')
        if content:
            content_acc += content
            streamed_any_content = True
            async for frame in _yield_sse('delta', {'content': content}):
                yield frame

        _merge_tool_calls(tool_calls_acc, delta.get('tool_calls'))

    yield {
        '__round__': True,
        'tool_calls_acc': tool_calls_acc,
        'finish_reason': finish_reason,
        'streamed_any_content': streamed_any_content,
        'reasoning_acc': reasoning_acc,
        'content_acc': content_acc,
    }


async def _stream_final_answer_without_tools(
    *,
    model: str,
    messages: list[dict[str, Any]],
) -> AsyncIterator[str]:
    """触顶后基于已有工具结果生成最终回答（不再调用工具）。"""
    messages.append({'role': 'user', 'content': TOOL_LIMIT_USER_HINT})
    streamed_any_content = False

    async for item in _stream_completion_round(model=model, messages=messages, tools=None):
        if isinstance(item, str):
            yield item
            await asyncio.sleep(0)
            continue

        if item.get('reasoning_acc') and not item.get('tool_calls_acc'):
            async for frame in _yield_sse('think_done', {}):
                yield frame

        if not item.get('streamed_any_content'):
            async for frame in _yield_sse(
                'delta',
                {
                    'content': (
                        '\n\n（已达工具调用上限，以下回答基于已获取的数据；'
                        '如需更完整信息请缩小问题范围后重试。）\n\n'
                    ),
                },
            ):
                yield frame


async def stream_chat(
    *,
    db: AsyncSession,
    user: User,
    request: ChatRequest,
) -> AsyncIterator[str]:
    """生成 SSE 事件流。"""
    try:
        # SSE 注释帧：促使代理/浏览器立即建立流式连接
        yield ': stream-open\n\n'
        await asyncio.sleep(0)

        store = await _load_store(db, user, request.store_id)
        ozon_client = ozon_client_for_store(store)
        ozon_client._ensure_configured()

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            current_time=prompt_datetime_context(),
            store_name=store.name,
            store_id=str(store.id),
        )
        messages: list[dict[str, Any]] = [
            {'role': 'system', 'content': system_prompt},
            *[m.model_dump() for m in request.messages],
        ]

        tool_cache = ToolResultCache()
        tool_rounds = 0
        while tool_rounds <= MAX_TOOL_ROUNDS:
            round_state: dict[str, Any] | None = None
            async for item in _stream_completion_round(
                model=request.model,
                messages=messages,
                tools=OZON_TOOL_DEFINITIONS,
            ):
                if isinstance(item, str):
                    yield item
                    await asyncio.sleep(0)
                else:
                    round_state = item

            if round_state is None:
                break

            tool_calls_acc = round_state['tool_calls_acc']
            finish_reason = round_state['finish_reason']
            streamed_any_content = round_state['streamed_any_content']
            reasoning_acc = round_state['reasoning_acc']
            content_acc = round_state['content_acc']

            has_tool_calls = any(
                (call.get('function') or {}).get('name') for call in tool_calls_acc.values()
            )
            if has_tool_calls and (finish_reason == 'tool_calls' or finish_reason != 'stop'):
                tool_rounds += 1
                if tool_rounds > MAX_TOOL_ROUNDS:
                    if reasoning_acc:
                        async for frame in _yield_sse('think_done', {}):
                            yield frame
                    async for event in _stream_final_answer_without_tools(
                        model=request.model,
                        messages=messages,
                    ):
                        yield event
                    break

                if reasoning_acc:
                    async for frame in _yield_sse('think_done', {}):
                        yield frame

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

                    result, cached = await tool_cache.get_or_execute(
                        name=name,
                        args=args,
                        execute=lambda tool_name, tool_args: run_ozon_tool(
                            ozon_client,
                            tool_name,
                            tool_args,
                        ),
                    )
                    display_label = f'{label}（缓存）' if cached else label

                    async for frame in _yield_sse(
                        'tool_start',
                        {
                            'name': name,
                            'label': display_label,
                            'args': args,
                            'cached': cached,
                        },
                    ):
                        yield frame

                    if cached:
                        preview = '复用本次对话已有结果，未重复请求 Ozon API'
                        has_error = '"error"' in result[:80]
                    else:
                        preview = result[:200] + '…' if len(result) > 200 else result
                        has_error = '"error"' in result[:80]

                    async for frame in _yield_sse(
                        'tool_end',
                        {
                            'name': name,
                            'label': display_label,
                            'result_preview': preview,
                            'status': 'error' if has_error else 'success',
                            'cached': cached,
                        },
                    ):
                        yield frame

                    messages.append(
                        {
                            'role': 'tool',
                            'tool_call_id': call.get('id') or str(uuid.uuid4()),
                            'content': result,
                        }
                    )
                continue

            if reasoning_acc and not has_tool_calls:
                async for frame in _yield_sse('think_done', {}):
                    yield frame

            if not streamed_any_content and not tool_calls_acc:
                async for frame in _yield_sse('delta', {'content': '抱歉，未能生成回答，请重试。'}):
                    yield frame
            break

        async for frame in _yield_sse('done', {}):
            yield frame
    except AppException as exc:
        async for frame in _yield_sse('error', {'message': exc.message, 'code': exc.code}):
            yield frame
    except Exception as exc:  # noqa: BLE001
        async for frame in _yield_sse('error', {'message': str(exc)}):
            yield frame
