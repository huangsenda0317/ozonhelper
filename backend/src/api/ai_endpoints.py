"""AI 处理 API 端点 — 改图 + 翻译"""

import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.api.exceptions import (
    AppException,
    DuplicateException,
    NotFoundException,
    ServiceUnavailableException,
    ValidationException,
)
from src.database import get_db
from src.models.processing_task import ProcessingTask
from src.models.user import User
from src.schemas.ai import (
    ChatRequest,
    ImageEditRequest,
    OutputOverrideRequest,
    RetryRequest,
    TaskProgressResponse,
    TaskResponse,
    TranslateRequest,
    TranslateTextRequest,
    TranslateTextResponse,
    UploadImageResponse,
)
from src.schemas.common import ApiResponse
from src.services.ai_processor.chat_service import stream_chat
from src.services.ai_processor.tmt_translator import TMTError, tmt_translator
from src.storage import storage
from src.worker.ai_tasks import process_image_edit_task, process_translate_task
from src.worker.app import celery_app

router = APIRouter(prefix='/api/v1/ai', tags=['AI 处理'])

ALLOWED_IMAGE_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB


def _resolve_image_urls(input_data: dict) -> list[str]:
    """从 input_data 解析图片 URL，优先用 object_names 重新生成预签名 URL。"""
    return storage.resolve_input_image_urls(input_data)


def _resolve_input_data(input_data: dict | None) -> dict | None:
    """返回 input_data 副本，将 image_urls 刷新为当前有效的预签名链接。"""
    if not input_data:
        return input_data
    result = dict(input_data)
    urls = storage.resolve_input_image_urls(input_data)
    if urls:
        result['image_urls'] = urls
    return result


def _to_task_response(task: ProcessingTask) -> TaskResponse:
    """构建任务响应，解析 input/output 中的图片为可访问 URL。"""
    output_data = storage.resolve_output_data(task.output_data)
    input_data = _resolve_input_data(task.input_data)
    return TaskResponse(
        id=str(task.id),
        collected_product_id=str(task.collected_product_id) if task.collected_product_id else None,
        task_type=task.task_type,
        status=task.status,
        input_data=input_data,
        output_data=output_data,
        seededit_status=task.seededit_status,
        error_message=task.error_message,
        error_code=task.error_code,
        retry_count=task.retry_count,
        cost_amount=float(task.cost_amount),
        created_at=task.created_at,
        completed_at=task.completed_at,
    )


@router.post('/chat')
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI 问答（DeepSeek / GLM + Ozon 工具，SSE 流式）。"""
    return StreamingResponse(
        stream_chat(db=db, user=current_user, request=request),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


@router.post('/upload-image', response_model=ApiResponse[UploadImageResponse])
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """上传本地图片至 MinIO，返回预签名访问 URL。"""
    content_type = file.content_type or ''
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationException('仅支持 JPG、PNG、WebP 格式')

    data = await file.read()
    if len(data) > MAX_UPLOAD_SIZE:
        raise ValidationException('单文件不超过 10MB')
    if len(data) == 0:
        raise ValidationException('文件为空')

    ext = ALLOWED_IMAGE_TYPES[content_type]
    object_name = f'uploads/ai-edit/{uuid.uuid4().hex}.{ext}'
    storage.upload_bytes(data, content_type=content_type, object_name=object_name)
    url = storage.get_presigned_url(object_name)

    return ApiResponse(
        success=True,
        data=UploadImageResponse(object_name=object_name, url=url),
    )


@router.post('/image-edit', response_model=ApiResponse[dict], status_code=202)
async def submit_image_edit(
    request: ImageEditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发起 AI 改图任务（SeedEdit 3.0 异步提交）。"""
    if request.image_urls:
        image_urls = request.image_urls
        input_data = {
            'prompt': request.prompt,
            'seed': request.seed,
            'scale': request.scale,
            'image_urls': request.image_urls,
            'object_names': request.object_names or [],
            'source': 'upload',
        }
    else:
        image_urls = []  # TODO: 从 collected_product 中提取
        input_data = {
            'prompt': request.prompt,
            'seed': request.seed,
            'scale': request.scale,
            'image_ids': request.image_ids,
            'source': 'product',
        }

    task = ProcessingTask(
        task_type='image_edit',
        status='pending',
        input_data=input_data,
    )
    if request.collected_product_id:
        task.collected_product_id = uuid.UUID(request.collected_product_id)

    db.add(task)
    await db.flush()

    async_result = process_image_edit_task.delay(
        task_id=str(task.id),
        image_urls=image_urls,
        prompt=request.prompt,
        seed=request.seed,
        scale=request.scale,
    )
    task.input_data = {**input_data, 'celery_task_id': async_result.id}
    await db.flush()

    return ApiResponse(
        success=True,
        data={
            'task_id': str(task.id),
            'status': 'pending',
        },
    )


@router.post('/translate-text', response_model=ApiResponse[TranslateTextResponse])
async def translate_text(
    request: TranslateTextRequest,
    current_user: User = Depends(get_current_user),
):
    """同步翻译文本（腾讯云 TMT，无需创建任务）。"""
    try:
        result = await asyncio.to_thread(
            tmt_translator.translate,
            source_text=request.source_text.strip(),
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            untranslated_text=request.untranslated_text,
        )
    except TMTError as e:
        raise AppException(
            code='TMT_ERROR',
            message=f'翻译服务错误: {e.message}',
            http_status=status.HTTP_502_BAD_GATEWAY,
        ) from e
    except Exception as e:
        raise ServiceUnavailableException('翻译服务') from e

    return ApiResponse(
        success=True,
        data=TranslateTextResponse(
            target_text=result['target_text'],
            used_amount=result['used_amount'],
            source_lang=result['source'],
            target_lang=result['target'],
        ),
    )


@router.post('/translate', response_model=ApiResponse[dict], status_code=202)
async def submit_translate(
    request: TranslateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发起 AI 翻译任务（腾讯云 TMT）。"""
    task = ProcessingTask(
        collected_product_id=uuid.UUID(request.collected_product_id),
        task_type='translate',
        status='pending',
        input_data={
            'fields': request.fields,
            'source_lang': request.source_lang,
            'target_lang': request.target_lang,
            'untranslated_text': request.untranslated_text,
        },
    )
    db.add(task)
    await db.flush()

    process_translate_task.delay(
        task_id=str(task.id),
        collected_product_id=request.collected_product_id,
        fields=request.fields,
        source_lang=request.source_lang,
        target_lang=request.target_lang,
    )

    return ApiResponse(
        success=True,
        data={
            'task_id': str(task.id),
            'status': 'pending',
        },
    )


@router.get('/tasks', response_model=ApiResponse[list[TaskResponse]])
async def list_tasks(
    task_type: str | None = Query(default=None, description='image_edit / translate'),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取 AI 任务列表。"""
    stmt = select(ProcessingTask)
    if task_type:
        stmt = stmt.where(ProcessingTask.task_type == task_type)
    if status:
        stmt = stmt.where(ProcessingTask.status == status)

    stmt = stmt.order_by(ProcessingTask.created_at.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    tasks = result.scalars().all()

    return ApiResponse(
        success=True,
        data=[_to_task_response(t) for t in tasks],
    )


@router.get('/tasks/{task_id}', response_model=ApiResponse[TaskResponse])
async def get_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个 AI 任务详情与结果。"""
    stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
    result = await db.execute(stmt)
    t = result.scalar_one_or_none()
    if not t:
        raise NotFoundException('AI 任务', str(task_id))

    return ApiResponse(
        success=True,
        data=_to_task_response(t),
    )


@router.post('/tasks/{task_id}/cancel', response_model=ApiResponse[dict])
async def cancel_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """终止排队中或处理中的 AI 改图任务；已完成的图片保留在结果中。"""
    stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
    result = await db.execute(stmt)
    t = result.scalar_one_or_none()
    if not t:
        raise NotFoundException('AI 任务', str(task_id))

    if t.status not in ('pending', 'running'):
        raise DuplicateException('仅排队中或处理中的任务可终止')

    was_pending = t.status == 'pending'
    t.status = 'cancelled'
    t.seededit_status = None
    t.completed_at = datetime.now(timezone.utc)
    await db.flush()

    if was_pending:
        celery_task_id = (t.input_data or {}).get('celery_task_id')
        if celery_task_id:
            celery_app.control.revoke(celery_task_id, terminate=False)

    return ApiResponse(
        success=True,
        data={
            'task_id': str(t.id),
            'status': 'cancelled',
            'has_partial_result': bool((t.output_data or {}).get('object_names')),
        },
    )


@router.delete('/tasks/{task_id}', response_model=ApiResponse[dict])
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除 AI 改图任务记录。"""
    stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
    result = await db.execute(stmt)
    t = result.scalar_one_or_none()
    if not t:
        raise NotFoundException('AI 任务', str(task_id))

    if t.status == 'running':
        raise DuplicateException('处理中任务无法删除，请稍后重试')

    if t.status == 'pending':
        celery_task_id = (t.input_data or {}).get('celery_task_id')
        if celery_task_id:
            celery_app.control.revoke(celery_task_id, terminate=False)

    await db.delete(t)
    await db.flush()

    return ApiResponse(
        success=True,
        data={'task_id': str(task_id), 'deleted': True},
    )


@router.get('/tasks/{task_id}/progress', response_model=ApiResponse[TaskProgressResponse])
async def get_task_progress(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查询 SeedEdit 异步任务进度。"""
    stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
    result = await db.execute(stmt)
    t = result.scalar_one_or_none()
    if not t:
        raise NotFoundException('AI 任务', str(task_id))

    return ApiResponse(
        success=True,
        data=TaskProgressResponse(
            task_id=str(t.id),
            seededit_status=t.seededit_status,
        ),
    )


@router.post('/image-edit/{task_id}/retry', response_model=ApiResponse[dict])
async def retry_image_edit(
    task_id: uuid.UUID,
    request: RetryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """重新处理 AI 改图（修改 prompt 后重新提交 SeedEdit 任务）。"""
    stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
    result = await db.execute(stmt)
    t = result.scalar_one_or_none()
    if not t:
        raise NotFoundException('AI 任务', str(task_id))

    t.status = 'pending'
    t.retry_count = t.retry_count + 1
    if request.prompt:
        t.input_data = {**t.input_data, 'prompt': request.prompt}
    if request.scale is not None:
        t.input_data = {**t.input_data, 'scale': request.scale}
    await db.flush()

    async_result = process_image_edit_task.delay(
        task_id=str(t.id),
        image_urls=_resolve_image_urls(t.input_data or {}),
        prompt=t.input_data.get('prompt', ''),
        seed=t.input_data.get('seed', -1),
        scale=t.input_data.get('scale', 0.5),
    )
    t.input_data = {**t.input_data, 'celery_task_id': async_result.id}
    await db.flush()

    return ApiResponse(
        success=True,
        data={'task_id': str(t.id), 'status': 'pending'},
    )


@router.put('/tasks/{task_id}/output', response_model=ApiResponse[dict])
async def override_output(
    task_id: uuid.UUID,
    request: OutputOverrideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """手动修改 AI 输出结果。"""
    stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
    result = await db.execute(stmt)
    t = result.scalar_one_or_none()
    if not t:
        raise NotFoundException('AI 任务', str(task_id))

    t.output_data = request.output_data
    await db.flush()

    return ApiResponse(success=True, data={'task_id': str(t.id)})
