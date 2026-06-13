"""SeedEdit 3.0 API 客户端 — 基于火山引擎官方 SDK"""

import asyncio
import base64
import json

import httpx
from volcengine.visual.VisualService import VisualService

from src.config import get_settings
from src.services.ai_processor.image_resizer import prepare_image_for_seededit
from src.storage import storage

settings = get_settings()


class SeedEditError(Exception):
    """SeedEdit API 错误。"""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f'SeedEdit Error [{code}]: {message}')


# 判断是否为可重试错误
RETRYABLE_CODES = {'50429', '50430'}  # QPS 超限、并发超限
REJECT_CODES = {'50411', '50412', '50413'}  # 内容审核不通过


def _parse_sdk_response(resp: dict) -> dict:
    """校验 SDK 返回的业务 code。"""
    code = resp.get('code')
    if code is not None and code != 10000:
        raise SeedEditError(str(code), resp.get('message', '未知错误'))
    return resp


def _parse_sdk_exception(exc: Exception) -> SeedEditError:
    """从 SDK 异常中提取 SeedEdit 错误信息。"""
    raw = str(exc)
    if raw.startswith("b'") or raw.startswith('b"'):
        try:
            payload = json.loads(raw[2:-1])
            meta = payload.get('ResponseMetadata', {})
            error = meta.get('Error', {})
            if error:
                return SeedEditError(
                    error.get('Code', 'UNKNOWN'),
                    error.get('Message', '未知错误'),
                )
            if payload.get('code'):
                return SeedEditError(str(payload['code']), payload.get('message', '未知错误'))
        except (json.JSONDecodeError, KeyError):
            pass
    return SeedEditError('SDK_ERROR', raw)


async def _load_image_as_base64(image_url: str, object_name: str | None = None) -> str:
    """读取图片并转为 SeedEdit 兼容的 base64（JPEG，云端无法访问本地 MinIO URL）。"""
    try:
        if object_name:
            raw = await asyncio.to_thread(storage.get_bytes, object_name)
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                raw = response.content

        prepared = prepare_image_for_seededit(raw)
    except SeedEditError:
        raise
    except Exception as exc:
        raise SeedEditError('IMAGE_INVALID', f'图片无法解析或格式不支持: {exc}') from exc

    return base64.b64encode(prepared).decode('utf-8')


class SeedEditClient:
    """SeedEdit 3.0 图生图 API 客户端。"""

    def __init__(self):
        self.access_key = settings.volcengine_access_key_id.strip()
        self.secret_key = settings.volcengine_secret_access_key.strip()
        self.req_key = settings.volcengine_seededit_req_key
        self.concurrency = settings.volcengine_seededit_concurrency

        self._visual = VisualService()
        self._visual.set_ak(self.access_key)
        self._visual.set_sk(self.secret_key)

    async def submit_task(
        self,
        image_url: str,
        prompt: str,
        seed: int = -1,
        scale: float = 0.5,
        object_name: str | None = None,
    ) -> str:
        """提交 SeedEdit 异步编辑任务（单张图），返回 task_id。"""
        image_b64 = await _load_image_as_base64(image_url, object_name)
        form = {
            'req_key': self.req_key,
            'binary_data_base64': [image_b64],
            'prompt': prompt,
            'seed': seed,
            'scale': scale,
        }

        try:
            resp = await asyncio.to_thread(self._visual.cv_sync2async_submit_task, form)
        except Exception as exc:
            raise _parse_sdk_exception(exc) from exc

        _parse_sdk_response(resp)
        task_id = resp.get('data', {}).get('task_id', '')
        if not task_id:
            raise SeedEditError('NO_TASK_ID', '未获取到 task_id')
        return task_id

    async def get_result(self, task_id: str) -> dict:
        """轮询获取 SeedEdit 异步任务结果。"""
        form = {
            'req_key': self.req_key,
            'task_id': task_id,
            'req_json': json.dumps({'return_url': True}),
        }

        try:
            resp = await asyncio.to_thread(self._visual.cv_sync2async_get_result, form)
        except Exception as exc:
            raise _parse_sdk_exception(exc) from exc

        _parse_sdk_response(resp)
        return resp.get('data', {})
