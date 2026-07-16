"""Moonshot Vision 文字定位建议客户端（OpenAI 兼容 chat/completions）。"""

from __future__ import annotations

import asyncio
import base64
import json
import re
from typing import Any

import httpx

from src.api.exceptions import AppException
from src.config import get_settings

_ALLOWED_IMAGE_TYPES = frozenset({
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
})

_SYSTEM_PROMPT = """你是电商主图俄文文案排版助手。根据商品底图与待放置文字，给出每条文案在画布上的位置建议。

约束：
1. 坐标为相对画布的归一化值 x、y，范围 0~1，原点在左上角。
2. 不要遮挡商品主体（产品本身）。
3. 标题类文案偏上，卖点/促销类偏下。
4. 只返回 JSON 数组，不要 markdown，不要解释。每项字段：id（与输入一致）、x、y，可选 fontSize（数字）、align（left|center|right）。
"""

_FENCE_RE = re.compile(
    r'```(?:json)?\s*([\s\S]*?)\s*```',
    re.IGNORECASE,
)
_VALID_ALIGNS = frozenset({'left', 'center', 'right'})


def parse_layout_response(raw: str, valid_ids: set[str]) -> list[dict[str, Any]]:
    """解析模型返回的布局 JSON；过滤未知 id，并将 x/y clamp 到 [0, 1]。"""
    text = (raw or '').strip()
    if not text:
        return []

    m = _FENCE_RE.search(text)
    if m:
        text = m.group(1).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []

    if not isinstance(data, list):
        return []

    out: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        item_id = item.get('id')
        if item_id is None or str(item_id) not in valid_ids:
            continue
        try:
            x = float(item['x'])
            y = float(item['y'])
        except (KeyError, TypeError, ValueError):
            continue

        entry: dict[str, Any] = {
            'id': str(item_id),
            'x': max(0.0, min(1.0, x)),
            'y': max(0.0, min(1.0, y)),
        }
        if 'fontSize' in item and item['fontSize'] is not None:
            try:
                entry['fontSize'] = float(item['fontSize'])
            except (TypeError, ValueError):
                pass
        align = item.get('align')
        if isinstance(align, str) and align in _VALID_ALIGNS:
            entry['align'] = align
        out.append(entry)
    return out


class MoonshotVisionClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def _ensure_configured(self) -> str:
        if not self._settings.moonshot_api_key:
            raise AppException(
                code='MOONSHOT_NOT_CONFIGURED',
                message='未配置 Moonshot API Key，请在 backend/.env 设置 MOONSHOT_API_KEY',
                http_status=503,
            )
        return self._settings.moonshot_api_key

    def _headers(self, api_key: str) -> dict[str, str]:
        return {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }

    def _api_url(self) -> str:
        base = (self._settings.moonshot_api_base or '').rstrip('/')
        return f'{base}/chat/completions'

    async def _to_data_uri(self, image_url: str, object_name: str | None = None) -> str:
        """Moonshot Vision 不接受远程 URL，需转为 data URI。

        对本库 MinIO 对象优先走 storage.get_bytes，避免预签名 URL 经 localhost:9000
        二次 HTTP 拉取失败（常见 502）。
        """
        if image_url.startswith('data:'):
            return image_url

        from src.storage import storage

        resolved_name = object_name
        if not resolved_name:
            resolved_name = storage._extract_object_name(image_url)  # noqa: SLF001

        raw: bytes | None = None
        content_type = 'image/jpeg'

        if resolved_name:
            try:
                raw = await asyncio.to_thread(storage.get_bytes, resolved_name)
                lower = resolved_name.lower()
                if lower.endswith('.png'):
                    content_type = 'image/png'
                elif lower.endswith('.webp'):
                    content_type = 'image/webp'
                elif lower.endswith('.gif'):
                    content_type = 'image/gif'
                else:
                    content_type = 'image/jpeg'
            except Exception:
                raw = None

        if raw is None:
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
                    response = await client.get(image_url)
                    response.raise_for_status()
            except httpx.HTTPError as exc:
                raise AppException(
                    code='MOONSHOT_API_ERROR',
                    message=f'下载底图失败，无法提交 Moonshot Vision: {exc}',
                    http_status=502,
                ) from exc
            raw = response.content
            content_type = (
                (response.headers.get('content-type') or 'image/jpeg')
                .split(';')[0]
                .strip()
                .lower()
            )

        if content_type == 'image/jpg':
            content_type = 'image/jpeg'
        if content_type not in _ALLOWED_IMAGE_TYPES:
            content_type = 'image/jpeg'

        b64 = base64.b64encode(raw).decode('ascii')
        return f'data:{content_type};base64,{b64}'

    async def suggest_layout(
        self,
        image_url: str,
        items: list[dict],
        object_name: str | None = None,
    ) -> list[dict]:
        """根据底图与文字列表，返回布局建议列表。items 为空时直接返回 []。"""
        if not items:
            return []

        api_key = self._ensure_configured()
        data_uri = await self._to_data_uri(image_url, object_name=object_name)
        valid_ids = {str(it['id']) for it in items if 'id' in it}
        items_payload = [
            {'id': str(it['id']), 'text': str(it.get('text', ''))}
            for it in items
            if 'id' in it
        ]
        user_text = (
            '请为以下文字给出布局建议（JSON 数组）：\n'
            + json.dumps(items_payload, ensure_ascii=False)
        )
        body: dict[str, Any] = {
            'model': self._settings.moonshot_vision_model,
            'messages': [
                {'role': 'system', 'content': _SYSTEM_PROMPT},
                {
                    'role': 'user',
                    'content': [
                        {'type': 'image_url', 'image_url': {'url': data_uri}},
                        {'type': 'text', 'text': user_text},
                    ],
                },
            ],
            'temperature': 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
                response = await client.post(
                    self._api_url(),
                    headers=self._headers(api_key),
                    json=body,
                )
                if response.status_code >= 400:
                    detail = response.text[:300]
                    raise AppException(
                        code='MOONSHOT_API_ERROR',
                        message=f'Moonshot API 错误 ({response.status_code}): {detail}',
                        http_status=502,
                    )
                payload = response.json()
        except AppException:
            raise
        except httpx.TimeoutException as exc:
            raise AppException(
                code='MOONSHOT_API_ERROR',
                message='Moonshot API 请求超时',
                http_status=502,
            ) from exc
        except httpx.RequestError as exc:
            raise AppException(
                code='MOONSHOT_API_ERROR',
                message='Moonshot API 连接失败',
                http_status=502,
            ) from exc
        except (json.JSONDecodeError, ValueError) as exc:
            raise AppException(
                code='MOONSHOT_API_ERROR',
                message='Moonshot API 返回无效 JSON',
                http_status=502,
            ) from exc

        try:
            content = payload['choices'][0]['message']['content']
        except (KeyError, IndexError, TypeError) as exc:
            raise AppException(
                code='MOONSHOT_API_ERROR',
                message='Moonshot API 返回缺少 content',
                http_status=502,
            ) from exc

        if not isinstance(content, str):
            # 部分多模态响应 content 可能是 list
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, dict) and part.get('type') == 'text':
                        parts.append(str(part.get('text', '')))
                    elif isinstance(part, str):
                        parts.append(part)
                content = ''.join(parts)
            else:
                content = str(content)

        return parse_layout_response(content, valid_ids=valid_ids)


moonshot_vision_client = MoonshotVisionClient()
