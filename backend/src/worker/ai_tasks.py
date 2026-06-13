"""AI 处理相关 Celery 异步任务"""

import uuid

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.processing_task import ProcessingTask
from src.services.ai_processor.image_edit_service import image_edit_service
from src.services.ai_processor.tmt_translator import TMTError, tmt_translator
from src.worker.app import celery_app
from src.worker.async_runner import run_async_task


async def _mark_task_failed_in_db(db: AsyncSession, task_id: str, error_message: str) -> None:
    task_stmt = select(ProcessingTask).where(ProcessingTask.id == uuid.UUID(task_id))
    task_result = await db.execute(task_stmt)
    task = task_result.scalar_one_or_none()
    if task and task.status in ('pending', 'running'):
        task.status = 'failed'
        task.error_message = error_message
        await db.flush()


def _run_mark_failed(task_id: str, error_message: str) -> None:
    async def _handle(db: AsyncSession) -> None:
        await _mark_task_failed_in_db(db, task_id, error_message)

    run_async_task(_handle)


@celery_app.task(name='process_image_edit', bind=True, max_retries=3)
def process_image_edit_task(
    self,
    task_id: str,
    image_urls: list[str] | None = None,
    prompt: str = '',
    seed: int = -1,
    scale: float = 0.5,
):
    """AI 改图 Celery 任务: 按队列逐张提交 SeedEdit → 轮询 → 转存 → 标准化。"""

    async def _handle(db: AsyncSession) -> None:
        task_stmt = select(ProcessingTask).where(ProcessingTask.id == uuid.UUID(task_id))
        task_result = await db.execute(task_stmt)
        task = task_result.scalar_one_or_none()
        if not task or task.status == 'cancelled':
            return

        input_data = task.input_data or {}
        resolved_prompt = prompt or input_data.get('prompt', '')
        resolved_seed = input_data.get('seed', seed)
        resolved_scale = input_data.get('scale', scale)

        await image_edit_service.process_images(
            task_id=task_id,
            prompt=resolved_prompt,
            seed=resolved_seed,
            scale=resolved_scale,
            db=db,
        )

    try:
        run_async_task(_handle)
    except Exception as exc:
        try:
            raise self.retry(exc=exc, countdown=30) from exc
        except MaxRetriesExceededError:
            _run_mark_failed(task_id, str(exc))
            raise


@celery_app.task(name='process_translate', bind=True, max_retries=2)
def process_translate_task(
    self,
    task_id: str,
    collected_product_id: str,
    fields: list[str],
    source_lang: str = 'zh',
    target_lang: str = 'ru',
):
    """AI 翻译 Celery 任务: 调用腾讯云 TMT 翻译商品字段。"""

    async def _handle(db: AsyncSession) -> None:
        from datetime import datetime, timezone

        from src.models.collected_product import CollectedProduct

        task_stmt = select(ProcessingTask).where(ProcessingTask.id == uuid.UUID(task_id))
        task_result = await db.execute(task_stmt)
        task = task_result.scalar_one_or_none()
        if not task:
            return

        task.status = 'running'
        await db.flush()

        product_stmt = select(CollectedProduct).where(
            CollectedProduct.id == uuid.UUID(collected_product_id)
        )
        product_result = await db.execute(product_stmt)
        product = product_result.scalar_one_or_none()

        if not product:
            task.status = 'failed'
            task.error_message = '商品未找到'
            await db.flush()
            return

        results = {}
        total_used = 0

        try:
            for field in fields:
                text = ''
                if field == 'title' and product.title:
                    text = product.title
                elif field == 'description' and product.description:
                    text = product.description

                if text:
                    resp = tmt_translator.translate(
                        source_text=text,
                        source_lang=source_lang,
                        target_lang=target_lang,
                    )
                    results[field] = resp['target_text']
                    total_used += resp['used_amount']

            if 'title' in results:
                product.title_ru = results['title']
            if 'description' in results:
                product.description_ru = results['description']

            task.status = 'success'
            task.output_data = {
                'translations': results,
                'used_amount': total_used,
            }
            task.completed_at = datetime.now(timezone.utc)
            await db.flush()

        except TMTError as e:
            task.status = 'failed'
            task.error_code = e.code
            task.error_message = e.message
            await db.flush()
        except Exception as e:
            task.status = 'failed'
            task.error_message = str(e)
            await db.flush()

    try:
        run_async_task(_handle)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60) from exc
