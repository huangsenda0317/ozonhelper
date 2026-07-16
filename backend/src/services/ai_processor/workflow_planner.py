from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from src.services.ai_processor.workflow_prompts import fragment_for

StepId = Literal['remove_watermark', 'cutout', 'add_scene', 'annotate_ru']
SEEDIT_MERGE_ORDER: list[StepId] = ['remove_watermark', 'cutout', 'add_scene']
SEEDIT_SET = set(SEEDIT_MERGE_ORDER)

COST_PER_SEEDEDIT = 0.2


@dataclass
class WorkflowStep:
    id: StepId
    enabled: bool
    order: int
    prompt: str = ''


@dataclass
class PlannedSeedEditCall:
    seededit_prompt: str
    covers: list[StepId] = field(default_factory=list)


@dataclass
class WorkflowPlan:
    planned_calls: list[PlannedSeedEditCall]
    needs_annotation: bool
    estimated_seededit_count: int


def estimate_cost_yuan(count: int) -> float:
    return round(count * COST_PER_SEEDEDIT, 2)


def _merge_rank(step_id: StepId) -> int:
    return SEEDIT_MERGE_ORDER.index(step_id)


def _can_append(group: list[StepId], nxt: StepId) -> bool:
    if not group:
        return True
    return _merge_rank(group[-1]) < _merge_rank(nxt)


def _build_prompt(covers: list[StepId], steps_by_id: dict[StepId, WorkflowStep]) -> str:
    parts = [fragment_for(sid, steps_by_id[sid].prompt) for sid in covers]
    return '；'.join(parts)


def plan_workflow(steps: list[WorkflowStep]) -> WorkflowPlan:
    enabled = [s for s in steps if s.enabled]
    enabled.sort(key=lambda s: s.order)
    needs_annotation = any(s.id == 'annotate_ru' for s in enabled)
    seedit_steps = [s for s in enabled if s.id in SEEDIT_SET]
    steps_by_id = {s.id: s for s in seedit_steps}

    groups: list[list[StepId]] = []
    current: list[StepId] = []
    for s in seedit_steps:
        if _can_append(current, s.id):
            current.append(s.id)
        else:
            if current:
                groups.append(current)
            current = [s.id]
    if current:
        groups.append(current)

    calls = [
        PlannedSeedEditCall(
            seededit_prompt=_build_prompt(g, steps_by_id),
            covers=list(g),
        )
        for g in groups
    ]
    return WorkflowPlan(
        planned_calls=calls,
        needs_annotation=needs_annotation,
        estimated_seededit_count=len(calls),
    )
