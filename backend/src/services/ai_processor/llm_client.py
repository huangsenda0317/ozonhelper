"""AI 问答 LLM 路由（按 model 分发到对应提供商）"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from src.api.exceptions import AppException
from src.schemas.ai import ALLOWED_CHAT_MODELS, DEEPSEEK_MODELS, GLM_MODELS
from src.services.ai_processor.deepseek_client import deepseek_client
from src.services.ai_processor.glm_client import glm_client


async def stream_llm_completion(
    *,
    model: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    if model not in ALLOWED_CHAT_MODELS:
        raise AppException(
            code='VALIDATION_ERROR',
            message=f'model 须为 {", ".join(sorted(ALLOWED_CHAT_MODELS))} 之一',
            http_status=400,
        )

    if model in DEEPSEEK_MODELS:
        async for chunk in deepseek_client.stream_completion(
            model=model, messages=messages, tools=tools
        ):
            yield chunk
        return

    if model in GLM_MODELS:
        async for chunk in glm_client.stream_completion(
            model=model, messages=messages, tools=tools
        ):
            yield chunk
        return

    raise AppException(
        code='VALIDATION_ERROR',
        message=f'不支持的模型: {model}',
        http_status=400,
    )
