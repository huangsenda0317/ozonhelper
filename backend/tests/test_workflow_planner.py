import pytest
from src.services.ai_processor.workflow_planner import (
    WorkflowStep,
    plan_workflow,
    estimate_cost_yuan,
)


def _steps(*ids: str, scene_prompt: str = '') -> list[WorkflowStep]:
    out = []
    for i, sid in enumerate(ids):
        prompt = scene_prompt if sid == 'add_scene' else ''
        out.append(WorkflowStep(id=sid, enabled=True, order=i, prompt=prompt))
    return out


def test_merge_watermark_cutout_scene_into_one_call():
    plan = plan_workflow(_steps('remove_watermark', 'cutout', 'add_scene'))
    assert plan.estimated_seededit_count == 1
    assert plan.needs_annotation is False
    assert plan.planned_calls[0].covers == ['remove_watermark', 'cutout', 'add_scene']
    assert '水印' in plan.planned_calls[0].seededit_prompt or 'watermark' in plan.planned_calls[0].seededit_prompt.lower() or '去除' in plan.planned_calls[0].seededit_prompt


def test_annotate_never_in_seededit_covers():
    plan = plan_workflow(_steps('remove_watermark', 'annotate_ru'))
    assert plan.needs_annotation is True
    assert all('annotate_ru' not in c.covers for c in plan.planned_calls)
    assert plan.estimated_seededit_count == 1


def test_incompatible_order_splits_calls():
    # add_scene before cutout → 不兼容，拆成 2 次
    plan = plan_workflow(_steps('add_scene', 'cutout'))
    assert plan.estimated_seededit_count == 2
    assert plan.planned_calls[0].covers == ['add_scene']
    assert plan.planned_calls[1].covers == ['cutout']


def test_disabled_steps_ignored():
    steps = [
        WorkflowStep(id='remove_watermark', enabled=True, order=0),
        WorkflowStep(id='cutout', enabled=False, order=1),
        WorkflowStep(id='add_scene', enabled=True, order=2, prompt='木桌上的静物'),
    ]
    plan = plan_workflow(steps)
    assert plan.estimated_seededit_count == 1
    assert plan.planned_calls[0].covers == ['remove_watermark', 'add_scene']
    assert '木桌上的静物' in plan.planned_calls[0].seededit_prompt


def test_no_enabled_seededit_only_annotate():
    plan = plan_workflow(_steps('annotate_ru'))
    assert plan.estimated_seededit_count == 0
    assert plan.planned_calls == []
    assert plan.needs_annotation is True


def test_estimate_cost():
    assert estimate_cost_yuan(3) == pytest.approx(0.6)
