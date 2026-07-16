"""AI 主图工作流编排 — 链式 SeedEdit → awaiting_annotation / success。

复用 ImageEditService 的 submit/poll/process_results（组合调用，避免复制）。
"""

from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from src.models.processing_task import ProcessingTask
from src.services.ai_processor.image_edit_service import (
    ImageEditService,
    TaskCancelledError,
    _check_cancelled,
    _persist,
    _set_output_data,
    image_edit_service,
)
from src.services.ai_processor.seededit import SeedEditError
from src.services.ai_processor.seededit_lock import SeedEditLock
from src.storage import storage


def _set_input_data(task: ProcessingTask, data: dict) -> None:
    task.input_data = deepcopy(data)
    flag_modified(task, 'input_data')


class ImageWorkflowService:
    """按 planned_calls 链式执行 SeedEdit，再进入注解或直接成功。"""

    COST_PER_IMAGE = 0.2

    def __init__(self, edit_service: ImageEditService | None = None):
        # 复用 ImageEditService 内部 submit/poll/转存；后续可抽共享 helper（TODO DRY）
        self._edit = edit_service or image_edit_service

    async def process_workflow(self, task_id: str, db: AsyncSession) -> None:
        stmt = select(ProcessingTask).where(ProcessingTask.id == uuid.UUID(task_id))
        result = await db.execute(stmt)
        task = result.scalar_one_or_none()
        if not task or task.status == 'cancelled':
            return

        input_data = dict(task.input_data or {})
        planned = list(input_data.get('planned_calls') or [])
        needs_annotation = bool(input_data.get('needs_annotation'))
        images = list(input_data.get('images') or [])
        first = images[0] if images else {}
        image_url = first.get('url') or ''
        object_name = first.get('object_name')
        seed = int(input_data.get('seed', -1))
        scale = float(input_data.get('scale', 0.5))

        if not image_url and not object_name:
            task.status = 'failed'
            task.error_message = '未提供待处理图片'
            await _persist(db)
            return

        if not planned and not needs_annotation:
            task.status = 'failed'
            task.error_message = '工作流无有效步骤'
            await _persist(db)
            return

        await _check_cancelled(db, task_id)

        task.status = 'running'
        task.seededit_status = None
        input_data['items_total'] = max(len(planned), 1 if needs_annotation else 0)
        input_data['items_completed'] = 0
        _set_input_data(task, input_data)
        await _persist(db)

        # 首 call：优先任务里保存的原图 URL；后续 call 用上一输出的预签名 URL
        current_url = image_url or (
            storage.get_presigned_url(object_name) if object_name else ''
        )
        current_obj = object_name
        seededit_ids: list[str] = []
        last_processed_names: list[str] = []

        try:
            for index, call in enumerate(planned):
                await _check_cancelled(db, task_id)
                prompt = call['seededit_prompt']

                input_data['items_in_progress'] = index + 1
                _set_input_data(task, input_data)
                await _persist(db)

                async with SeedEditLock():
                    seededit_id = await self._edit._submit_with_retry(
                        task, current_url, current_obj, prompt, seed, scale, db
                    )
                    seededit_ids.append(seededit_id)
                    images_result = await self._edit._poll_with_retry(
                        task, seededit_id, db, task_id
                    )
                    processed = await self._edit._process_results(
                        task, images_result, db
                    )

                await _check_cancelled(db, task_id)

                if not processed:
                    raise SeedEditError('STORE_FAILED', '工作流转存失败')

                last_processed_names = processed
                current_obj = processed[-1]
                current_url = storage.get_presigned_url(current_obj)

                input_data['items_completed'] = index + 1
                _set_input_data(task, input_data)
                task.seededit_task_ids = seededit_ids
                await _persist(db)

            if last_processed_names:
                ai_base = storage.get_presigned_url(last_processed_names[-1])
            elif object_name:
                ai_base = storage.get_presigned_url(object_name)
            else:
                ai_base = image_url

            out = {
                'ai_base_image_url': ai_base,
                'object_names': last_processed_names
                if last_processed_names
                else ([object_name] if object_name else []),
                'seededit_count': len(planned),
                'seededit_cost_yuan': round(len(planned) * self.COST_PER_IMAGE, 2),
                'moonshot_calls': 0,
                'annotation_skipped': False,
                'processed_images': [ai_base],
            }

            task.seededit_task_ids = seededit_ids or None
            task.seededit_status = None

            if needs_annotation:
                task.status = 'awaiting_annotation'
                _set_output_data(task, out)
            else:
                out['final_image_url'] = ai_base
                task.status = 'success'
                task.completed_at = datetime.now(timezone.utc)
                task.cost_amount = out['seededit_cost_yuan']
                _set_output_data(task, out)

            await _persist(db)

        except TaskCancelledError:
            await self._finalize_cancelled(
                task, db, last_processed_names, input_data, seededit_ids
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
        input_data: dict,
        seededit_ids: list[str],
    ) -> None:
        task.status = 'cancelled'
        task.seededit_status = None
        completed = len(seededit_ids)
        input_data['items_completed'] = completed
        input_data.pop('items_in_progress', None)
        _set_input_data(task, input_data)

        if processed_names:
            ai_base = storage.get_presigned_url(processed_names[-1])
            _set_output_data(task, {
                'ai_base_image_url': ai_base,
                'object_names': processed_names,
                'seededit_count': completed,
                'seededit_cost_yuan': round(completed * self.COST_PER_IMAGE, 2),
                'processed_images': [ai_base],
            })
            task.cost_amount = completed * self.COST_PER_IMAGE

        if seededit_ids:
            task.seededit_task_ids = seededit_ids
        task.completed_at = datetime.now(timezone.utc)
        await _persist(db)


image_workflow_service = ImageWorkflowService()
