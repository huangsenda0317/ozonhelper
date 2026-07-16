"""ImageWorkflowService 编排逻辑单测（mock SeedEdit / storage / DB）。"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.ai_processor.image_workflow_service import ImageWorkflowService


def _make_task(input_data: dict, status: str = 'pending') -> MagicMock:
    task = MagicMock()
    task.id = uuid.uuid4()
    task.status = status
    task.input_data = input_data
    task.output_data = None
    task.seededit_task_ids = None
    task.error_code = None
    task.error_message = None
    task.cost_amount = 0
    task.completed_at = None
    return task


def _db_returning(task: MagicMock | None) -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = task
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_empty_planned_with_annotation_uses_original_as_ai_base():
    """planned_calls 为空且 needs_annotation → awaiting_annotation，底图为原图。"""
    task_id = str(uuid.uuid4())
    task = _make_task({
        'images': [{'url': 'https://cdn.example/orig.jpg', 'object_name': 'uploads/orig.jpg'}],
        'planned_calls': [],
        'needs_annotation': True,
        'seed': -1,
        'scale': 0.5,
    })
    db = _db_returning(task)
    svc = ImageWorkflowService()

    with patch(
        'src.services.ai_processor.image_workflow_service.storage.get_presigned_url',
        return_value='https://presigned/orig.jpg',
    ) as mock_presign:
        await svc.process_workflow(task_id, db)

    assert task.status == 'awaiting_annotation'
    assert task.output_data['ai_base_image_url'] == 'https://presigned/orig.jpg'
    assert task.output_data['seededit_count'] == 0
    assert 'final_image_url' not in task.output_data
    mock_presign.assert_called_once_with('uploads/orig.jpg')


@pytest.mark.asyncio
async def test_chain_planned_calls_then_success_without_annotation():
    """链式 SeedEdit：第二次输入为第一次输出；无注解 → success + final_image_url。"""
    task_id = str(uuid.uuid4())
    task = _make_task({
        'images': [{'url': 'https://cdn.example/orig.jpg', 'object_name': 'uploads/orig.jpg'}],
        'planned_calls': [
            {'seededit_prompt': '去水印', 'covers': ['remove_watermark']},
            {'seededit_prompt': '抠图', 'covers': ['cutout']},
        ],
        'needs_annotation': False,
        'seed': 1,
        'scale': 0.5,
    })
    db = _db_returning(task)
    svc = ImageWorkflowService()

    submit_urls: list[str] = []
    submit_objs: list[str | None] = []
    submit_prompts: list[str] = []

    async def fake_submit(task_, image_url, object_name, prompt, seed, scale, db_):
        submit_urls.append(image_url)
        submit_objs.append(object_name)
        submit_prompts.append(prompt)
        return f'sid-{len(submit_urls)}'

    poll_n = 0

    async def fake_poll(task_, seededit_id, db_, tid):
        nonlocal poll_n
        poll_n += 1
        return [f'https://seededit/result-{poll_n}.png']

    process_n = 0

    async def fake_process(task_, images, db_):
        nonlocal process_n
        process_n += 1
        return [f'products/processed/step{process_n}.png']

    lock = MagicMock()
    lock.__aenter__ = AsyncMock(return_value=None)
    lock.__aexit__ = AsyncMock(return_value=None)

    with (
        patch(
            'src.services.ai_processor.image_workflow_service.SeedEditLock',
            return_value=lock,
        ),
        patch.object(svc._edit, '_submit_with_retry', side_effect=fake_submit),
        patch.object(svc._edit, '_poll_with_retry', side_effect=fake_poll),
        patch.object(svc._edit, '_process_results', side_effect=fake_process),
        patch(
            'src.services.ai_processor.image_workflow_service.storage.get_presigned_url',
            side_effect=lambda name, expires=86400: f'https://presigned/{name}',
        ),
        patch(
            'src.services.ai_processor.image_workflow_service._check_cancelled',
            new_callable=AsyncMock,
        ),
    ):
        await svc.process_workflow(task_id, db)

    assert submit_prompts == ['去水印', '抠图']
    assert submit_urls[0] == 'https://cdn.example/orig.jpg'
    assert submit_objs[0] == 'uploads/orig.jpg'
    assert submit_urls[1] == 'https://presigned/products/processed/step1.png'
    assert submit_objs[1] == 'products/processed/step1.png'
    assert task.status == 'success'
    assert task.output_data['ai_base_image_url'] == (
        'https://presigned/products/processed/step2.png'
    )
    assert task.output_data['final_image_url'] == task.output_data['ai_base_image_url']
    assert task.output_data['seededit_count'] == 2
    assert task.output_data['seededit_cost_yuan'] == pytest.approx(0.4)
    assert task.seededit_task_ids == ['sid-1', 'sid-2']
    assert task.completed_at is not None


@pytest.mark.asyncio
async def test_needs_annotation_after_seededit_sets_awaiting():
    task_id = str(uuid.uuid4())
    task = _make_task({
        'images': [{'url': 'https://cdn.example/orig.jpg', 'object_name': 'uploads/orig.jpg'}],
        'planned_calls': [
            {'seededit_prompt': '去水印', 'covers': ['remove_watermark']},
        ],
        'needs_annotation': True,
        'seed': -1,
        'scale': 0.5,
    })
    db = _db_returning(task)
    svc = ImageWorkflowService()

    lock = MagicMock()
    lock.__aenter__ = AsyncMock(return_value=None)
    lock.__aexit__ = AsyncMock(return_value=None)

    with (
        patch(
            'src.services.ai_processor.image_workflow_service.SeedEditLock',
            return_value=lock,
        ),
        patch.object(svc._edit, '_submit_with_retry', new_callable=AsyncMock, return_value='sid-1'),
        patch.object(
            svc._edit, '_poll_with_retry', new_callable=AsyncMock, return_value=['https://r.png']
        ),
        patch.object(
            svc._edit, '_process_results', new_callable=AsyncMock, return_value=['products/processed/a.png']
        ),
        patch(
            'src.services.ai_processor.image_workflow_service.storage.get_presigned_url',
            return_value='https://presigned/products/processed/a.png',
        ),
        patch(
            'src.services.ai_processor.image_workflow_service._check_cancelled',
            new_callable=AsyncMock,
        ),
    ):
        await svc.process_workflow(task_id, db)

    assert task.status == 'awaiting_annotation'
    assert task.output_data['ai_base_image_url'] == 'https://presigned/products/processed/a.png'
    assert 'final_image_url' not in task.output_data
    assert task.completed_at is None
