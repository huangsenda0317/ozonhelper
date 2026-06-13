"""AI 改图编排服务 — SeedEdit 提交 → 轮询 → 转存 → Pillow 标准化"""

import asyncio
import uuid
from copy import deepcopy
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from src.models.processing_task import ProcessingTask
from src.services.ai_processor.image_resizer import resize_to_ozon_spec
from src.services.ai_processor.seededit import (
    REJECT_CODES,
    RETRYABLE_CODES,
    SeedEditClient,
    SeedEditError,
)
from src.services.ai_processor.seededit_lock import SeedEditLock
from src.storage import storage


class TaskCancelledError(Exception):
    """用户已终止任务。"""


async def _persist(db: AsyncSession) -> None:
    """立即提交进度，供前端轮询可见（Celery 任务结束前默认不会 commit）。"""
    await db.flush()
    await db.commit()


def _set_input_data(task: ProcessingTask, data: dict) -> None:
    """JSONB 需赋新 dict 并 flag_modified，否则原地修改不会持久化。"""
    task.input_data = deepcopy(data)
    flag_modified(task, 'input_data')


def _set_output_data(task: ProcessingTask, data: dict) -> None:
    task.output_data = deepcopy(data)
    flag_modified(task, 'output_data')


async def _check_cancelled(db: AsyncSession, task_id: str) -> None:
    stmt = select(ProcessingTask.status).where(ProcessingTask.id == uuid.UUID(task_id))
    result = await db.execute(stmt)
    status = result.scalar_one_or_none()
    if status == 'cancelled':
        raise TaskCancelledError()


class ImageEditService:
    """AI 改图编排服务。"""

    MAX_RETRIES = 3
    POLL_INTERVAL = 2  # 轮询间隔 (秒)
    MAX_POLL_TIME = 120  # 最大轮询时间 (秒)
    COST_PER_IMAGE = 0.2
    INTER_IMAGE_DELAY = 1  # 每张图完成后间隔，避免触发并发限制

    def __init__(self):
        self.seededit = SeedEditClient()

    async def process_images(
        self,
        task_id: str,
        prompt: str,
        seed: int,
        scale: float,
        db: AsyncSession,
    ) -> None:
        """完整改图流水线：按队列逐张处理（SeedEdit 并发=1，一次只处理一张）。"""
        stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
        result = await db.execute(stmt)
        task = result.scalar_one_or_none()
        if not task:
            return
        if task.status == 'cancelled':
            return

        input_data = dict(task.input_data or {})
        input_object_names: list[str] = list(input_data.get('object_names') or [])
        image_urls = storage.resolve_input_image_urls(input_data)

        if not image_urls:
            task.status = 'failed'
            task.error_message = '未提供待处理图片'
            await _persist(db)
            return

        await _check_cancelled(db, task_id)

        total = len(image_urls)
        task.status = 'running'
        task.seededit_status = None
        input_data['items_total'] = total
        input_data['items_completed'] = 0
        _set_input_data(task, input_data)
        await _persist(db)

        try:
            seededit_ids: list[str] = []
            all_processed_names: list[str] = []

            for index, image_url in enumerate(image_urls):
                await _check_cancelled(db, task_id)

                input_data['items_in_progress'] = index + 1
                _set_input_data(task, input_data)
                await _persist(db)

                obj_name = (
                    input_object_names[index]
                    if index < len(input_object_names)
                    else None
                )

                async with SeedEditLock():
                    seededit_id = await self._submit_with_retry(
                        task, image_url, obj_name, prompt, seed, scale, db
                    )
                    seededit_ids.append(seededit_id)
                    images = await self._poll_with_retry(task, seededit_id, db, task_id)
                    processed_batch = await self._process_results(task, images, db)

                await _check_cancelled(db, task_id)

                if not processed_batch:
                    raise SeedEditError('STORE_FAILED', f'第 {index + 1} 张图片转存失败')

                all_processed_names.extend(processed_batch)

                input_data['items_completed'] = index + 1
                _set_input_data(task, input_data)
                task.seededit_task_ids = seededit_ids
                _set_output_data(task, {
                    'object_names': all_processed_names,
                    'items_total': total,
                    'items_completed': index + 1,
                })
                await _persist(db)

                if index < total - 1:
                    await asyncio.sleep(self.INTER_IMAGE_DELAY)

            task.status = 'success'
            task.seededit_status = None
            task.seededit_task_ids = seededit_ids
            _set_output_data(task, {
                'object_names': all_processed_names,
                'items_total': total,
                'items_completed': total,
            })
            task.cost_amount = self.COST_PER_IMAGE * len(all_processed_names)
            task.completed_at = datetime.now(timezone.utc)
            await _persist(db)

        except TaskCancelledError:
            await self._finalize_cancelled(
                task, db, all_processed_names, total, input_data, seededit_ids
            )
        except SeedEditError as e:
            task.status = 'failed'
            task.error_code = e.code
            task.error_message = e.message
            await _persist(db)
        except Exception as e:
            task.status = 'failed'
            task.error_message = str(e)
            await _persist(db)

    async def _finalize_cancelled(
        self,
        task: ProcessingTask,
        db: AsyncSession,
        processed_names: list[str],
        total: int,
        input_data: dict,
        seededit_ids: list[str],
    ) -> None:
        """终止任务：保留已完成的改图结果，不再继续后续图片。"""
        task.status = 'cancelled'
        task.seededit_status = None
        completed = len(processed_names)
        input_data['items_completed'] = completed
        input_data.pop('items_in_progress', None)
        _set_input_data(task, input_data)

        if processed_names:
            _set_output_data(task, {
                'object_names': processed_names,
                'items_total': total,
                'items_completed': completed,
            })
            task.cost_amount = self.COST_PER_IMAGE * completed

        if seededit_ids:
            task.seededit_task_ids = seededit_ids
        task.completed_at = datetime.now(timezone.utc)
        await _persist(db)

    async def _submit_with_retry(
        self,
        task: ProcessingTask,
        image_url: str,
        object_name: str | None,
        prompt,
        seed,
        scale,
        db,
    ) -> str:
        """提交 SeedEdit 任务（含重试），失败时抛出 SeedEditError。"""
        last_error: SeedEditError | None = None
        for attempt in range(self.MAX_RETRIES):
            try:
                return await self.seededit.submit_task(
                    image_url=image_url,
                    prompt=prompt,
                    seed=seed,
                    scale=scale,
                    object_name=object_name,
                )
            except SeedEditError as e:
                last_error = e
                task.error_code = e.code
                await db.flush()

                if e.code in REJECT_CODES:
                    raise SeedEditError(e.code, f'内容审核不通过: {e.message}') from e

                if e.code in RETRYABLE_CODES and attempt < self.MAX_RETRIES - 1:
                    wait = 2 ** (attempt + 1)
                    await asyncio.sleep(wait)
                    continue

                raise SeedEditError(e.code, f'SeedEdit 错误: {e.message}') from e

        raise last_error or SeedEditError('SUBMIT_FAILED', 'SeedEdit 提交失败')

    async def _poll_with_retry(
        self, task: ProcessingTask, seededit_id: str, db, task_id: str
    ) -> list[str] | dict:
        """轮询 SeedEdit 结果，失败或超时抛出 SeedEditError。"""
        elapsed = 0
        while elapsed < self.MAX_POLL_TIME:
            await _check_cancelled(db, task_id)

            try:
                result = await self.seededit.get_result(seededit_id)
                status = result.get('status', 'unknown')

                if status == 'done':
                    urls = result.get('image_urls') or []
                    if isinstance(urls, str):
                        urls = [urls]
                    if urls:
                        return urls

                    b64_list = result.get('binary_data_base64') or []
                    if isinstance(b64_list, str):
                        b64_list = [b64_list]
                    if b64_list:
                        return {'base64_images': b64_list}

                    raise SeedEditError('NO_IMAGE', 'SeedEdit 完成但未返回图片')

                if status in ('not_found', 'expired'):
                    raise SeedEditError(status.upper(), f'SeedEdit 任务 {status}')

            except SeedEditError as e:
                if e.code in RETRYABLE_CODES:
                    pass
                else:
                    raise

            await asyncio.sleep(self.POLL_INTERVAL)
            elapsed += self.POLL_INTERVAL

        raise SeedEditError('POLL_TIMEOUT', 'SeedEdit 轮询超时')

    async def _process_results(
        self, task: ProcessingTask, images: list[str] | dict, db
    ) -> list[str]:
        """下载 SeedEdit 结果、Pillow 标准化、转存 MinIO，返回 object_names。"""
        image_bytes_list: list[bytes] = []

        if isinstance(images, dict) and images.get('base64_images'):
            import base64

            for b64 in images['base64_images']:
                image_bytes_list.append(base64.b64decode(b64))
        else:
            urls = images if isinstance(images, list) else []
            async with httpx.AsyncClient(timeout=60.0) as client:
                for url in urls:
                    response = await client.get(url)
                    response.raise_for_status()
                    image_bytes_list.append(response.content)

        processed: list[str] = []
        for raw in image_bytes_list:
            resized = resize_to_ozon_spec(raw)
            obj_name = f'products/processed/{uuid.uuid4().hex}.png'
            storage.upload_bytes(resized, content_type='image/png', object_name=obj_name)
            processed.append(obj_name)
        return processed


image_edit_service = ImageEditService()
