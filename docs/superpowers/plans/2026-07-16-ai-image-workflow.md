# AI 主图工作流 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 改图升级为「工作流 Tab（勾选步骤 + SeedEdit 智能合并 + 俄文注解编辑器）」与「自由改图 Tab」双模式，首期仅支持单张主图。

**Architecture:** 后端新增 `image_workflow` 任务与 `WorkflowPlanner`（纯函数合并 SeedEdit 步骤）；`ImageWorkflowService` 复用现有 SeedEdit 锁/重试/转存/Pillow；注解阶段状态 `awaiting_annotation`，前端 Canvas 编辑器 + Moonshot Vision 定位建议，烘烤扁平图后 `complete-annotation`。自由改图继续走 `/ai/image-edit`。

**Tech Stack:** FastAPI + Celery + SQLAlchemy JSONB；SeedEdit 3.0；Moonshot Vision（可配置）；TMT 翻译；Next.js 14 App Router + Canvas 2D；现有 MinIO/Pillow。

**Spec:** `docs/superpowers/specs/2026-07-16-ai-image-workflow-design.md`

## Global Constraints

- 首期 `images.length === 1`；多图仅数据口子，UI 不开放
- `annotate_ru` 永不调用 SeedEdit
- AI 步骤一键跑完，步骤间无人工确认
- 注解最终交付为扁平图；不持久化图层 JSON；允许 0 条文案完成
- 换色/换款本版不做（step id 可预留，UI 隐藏）
- SeedEdit 单价按现有 `0.2` 元/次展示与记账
- Moonshot 默认模型：`moonshot-v1-128k-vision-preview`（环境变量可覆盖）
- 回答与 UI 文案使用简体中文
- 测试：后端 `cd backend && pytest tests/... -v`；前端以手工验收 + 关键纯函数单测为主（仓库暂无前端测试框架）

## File Structure

| 路径 | 职责 |
|------|------|
| `backend/src/services/ai_processor/workflow_planner.py` | 步骤合并纯逻辑 |
| `backend/src/services/ai_processor/workflow_prompts.py` | 各 step 默认 prompt 片段 |
| `backend/src/services/ai_processor/image_workflow_service.py` | 工作流编排：执行 planned_calls → 状态机 |
| `backend/src/services/ai_processor/moonshot_vision.py` | Moonshot 视觉定位客户端 |
| `backend/src/schemas/ai.py` | 新增 Workflow / Layout / Complete schemas |
| `backend/src/config.py` | Moonshot 配置项 |
| `backend/src/api/ai_endpoints.py` | `/ai/workflow*` 路由 |
| `backend/src/worker/ai_tasks.py` | `process_image_workflow` Celery 任务 |
| `backend/tests/test_workflow_planner.py` | Planner 单测 |
| `backend/tests/test_image_workflow_api.py` | API 校验单测（尽量 mock DB/Celery） |
| `frontend/src/app/ai-edit/page.tsx` | 双 Tab 壳 |
| `frontend/src/components/features/ai-edit/FreeformEditPanel.tsx` | 从现有页抽出的自由改图 |
| `frontend/src/components/features/ai-edit/WorkflowEditPanel.tsx` | 工作流提交区 |
| `frontend/src/components/features/ai-edit/WorkflowStepList.tsx` | 步骤勾选/排序/场景 prompt/费用预估 |
| `frontend/src/components/features/ai-edit/AnnotationEditor.tsx` | 左画布右列表 |
| `frontend/src/components/features/ai-edit/annotationTypes.ts` | 文字图层类型 |
| `frontend/src/components/features/ai-edit/bakeAnnotation.ts` | Canvas 烘烤 |
| `frontend/src/components/features/AITaskList.tsx` | 支持 `awaiting_annotation`、继续注解 |

---

### Task 1: WorkflowPlanner（纯函数 + TDD）

**Files:**
- Create: `backend/src/services/ai_processor/workflow_prompts.py`
- Create: `backend/src/services/ai_processor/workflow_planner.py`
- Create: `backend/tests/test_workflow_planner.py`

**Interfaces:**
- Consumes: 无
- Produces:
  - `StepId = Literal['remove_watermark','cutout','add_scene','annotate_ru']`
  - `dataclass WorkflowStep(id: StepId, enabled: bool, order: int, prompt: str = '')`
  - `dataclass PlannedSeedEditCall(seededit_prompt: str, covers: list[StepId])`
  - `dataclass WorkflowPlan(planned_calls: list[PlannedSeedEditCall], needs_annotation: bool, estimated_seededit_count: int)`
  - `def plan_workflow(steps: list[WorkflowStep]) -> WorkflowPlan`
  - `def estimate_cost_yuan(count: int) -> float` → `count * 0.2`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_workflow_planner.py
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && pytest tests/test_workflow_planner.py -v --no-cov
```

Expected: `ModuleNotFoundError` or import error for `workflow_planner`.

- [ ] **Step 3: Implement prompts + planner**

```python
# backend/src/services/ai_processor/workflow_prompts.py
from __future__ import annotations

STEP_PROMPT_FRAGMENTS: dict[str, str] = {
    'remove_watermark': '去除图片中的所有中文水印和文字',
    'cutout': '抠出商品主体，去除杂乱背景，保留主体完整清晰',
    'add_scene': '为商品配置适合 Ozon 电商主图的展示场景或干净白底，主体居中、光线自然',
}

DEFAULT_SCENE_PROMPT = STEP_PROMPT_FRAGMENTS['add_scene']


def fragment_for(step_id: str, custom_prompt: str = '') -> str:
    if step_id == 'add_scene' and custom_prompt.strip():
        return custom_prompt.strip()
    return STEP_PROMPT_FRAGMENTS[step_id]
```

```python
# backend/src/services/ai_processor/workflow_planner.py
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && pytest tests/test_workflow_planner.py -v --no-cov
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ai_processor/workflow_prompts.py \
  backend/src/services/ai_processor/workflow_planner.py \
  backend/tests/test_workflow_planner.py
git commit -m "feat(ai): 新增主图工作流 WorkflowPlanner 与单测"
```

---

### Task 2: Schemas + Moonshot 配置

**Files:**
- Modify: `backend/src/config.py`（在 DeepSeek 配置附近追加）
- Modify: `backend/src/schemas/ai.py`（追加 Workflow 相关模型）
- Modify: `backend/.env.example`（若存在；否则在 `docs` 或 README 片段注明，本任务至少改 `config.py`）

**Interfaces:**
- Consumes: Task 1 的 `StepId` 字符串集合
- Produces:
  - Settings: `moonshot_api_key: str = ''`, `moonshot_api_base: str = 'https://api.moonshot.cn/v1'`, `moonshot_vision_model: str = 'moonshot-v1-128k-vision-preview'`
  - `WorkflowStepInput`, `WorkflowSubmitRequest`, `SuggestTextLayoutRequest/Response`, `CompleteAnnotationRequest`

- [ ] **Step 1: Add settings fields**

在 `backend/src/config.py` 的 DeepSeek 段落后追加：

```python
    # Moonshot Vision（工作流俄文注解自动定位）
    moonshot_api_key: str = ''
    moonshot_api_base: str = 'https://api.moonshot.cn/v1'
    moonshot_vision_model: str = 'moonshot-v1-128k-vision-preview'
```

- [ ] **Step 2: Add Pydantic schemas**

在 `backend/src/schemas/ai.py` 追加（保持与现有风格一致）：

```python
ALLOWED_WORKFLOW_STEPS = frozenset({
    'remove_watermark', 'cutout', 'add_scene', 'annotate_ru',
})


class WorkflowStepInput(BaseModel):
    id: str
    enabled: bool = True
    order: int = Field(ge=0)
    prompt: str = Field(default='', max_length=800)

    @model_validator(mode='after')
    def validate_id(self):
        if self.id not in ALLOWED_WORKFLOW_STEPS:
            raise ValueError(f'未知步骤: {self.id}')
        return self


class WorkflowSubmitRequest(BaseModel):
    image_url: str = Field(..., min_length=1)
    object_name: str = Field(..., min_length=1)
    steps: list[WorkflowStepInput] = Field(..., min_length=1)
    seed: int = Field(default=-1, ge=-1)
    scale: float = Field(default=0.5, ge=0, le=1)

    @model_validator(mode='after')
    def validate_workflow(self):
        if not any(s.enabled for s in self.steps):
            raise ValueError('至少启用一个步骤')
        # 首期单图已由单字段表达；禁止未来误传多图扩展时在此校验
        return self


class TextLayoutItem(BaseModel):
    id: str
    text: str = Field(..., min_length=1)


class SuggestTextLayoutRequest(BaseModel):
    image_url: str
    items: list[TextLayoutItem] = Field(default_factory=list)


class TextLayoutSuggestion(BaseModel):
    id: str
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    fontSize: float | None = None
    align: Literal['left', 'center', 'right'] | None = None


class SuggestTextLayoutResponse(BaseModel):
    suggestions: list[TextLayoutSuggestion]


class CompleteAnnotationRequest(BaseModel):
    """上传烘烤图；若 skip=True 则直接用 AI 底图完成（0 条文案）。"""
    skip: bool = False
    image_url: str | None = None
    object_name: str | None = None

    @model_validator(mode='after')
    def validate_payload(self):
        if self.skip:
            return self
        if not self.image_url or not self.object_name:
            raise ValueError('未 skip 时必须提供 image_url 与 object_name')
        return self
```

- [ ] **Step 3: Smoke import**

```bash
cd backend && python -c "from src.schemas.ai import WorkflowSubmitRequest; from src.config import get_settings; print(get_settings().moonshot_vision_model)"
```

Expected: 打印 `moonshot-v1-128k-vision-preview`。

- [ ] **Step 4: Commit**

```bash
git add backend/src/config.py backend/src/schemas/ai.py
git commit -m "feat(ai): 工作流请求 Schema 与 Moonshot 配置项"
```

---

### Task 3: ImageWorkflowService + Celery 任务

**Files:**
- Create: `backend/src/services/ai_processor/image_workflow_service.py`
- Modify: `backend/src/worker/ai_tasks.py`
- Modify: `backend/src/services/ai_processor/image_edit_service.py`（可选：抽出 `_submit/_poll/_process_results` 复用；若改动面大，workflow service 可组合调用 `image_edit_service` 的公开方法或复制最小调用路径并标注 TODO DRY）

**Interfaces:**
- Consumes: `plan_workflow`, 现有 `SeedEditClient` / `SeedEditLock` / `resize_to_ozon_spec` / `storage`
- Produces:
  - `image_workflow_service.process_workflow(task_id: str, db: AsyncSession) -> None`
  - Celery: `process_image_workflow_task(task_id: str)`
  - 成功无注解 → `status=success`，`output_data` 含 `ai_base_image_url`/`final_image_url`/`seededit_count`
  - 需注解 → `status=awaiting_annotation`，先写好 `ai_base_image_url`

**推荐实现策略：** 在 `ImageWorkflowService` 内按 `planned_calls` 链式执行：每一 call 的输入图 = 上一 call 输出图（首 call 用原图）；单图。逻辑对齐 `ImageEditService.process_images` 的提交/轮询/转存，但用 call 的 `seededit_prompt`。

- [ ] **Step 1: 写服务骨架（可先对 planner 输出做集成注释测试，或轻量单测 mock SeedEdit）**

创建 `image_workflow_service.py`，核心伪结构（实现时补全与 `ImageEditService` 相同的 retry/cancel）：

```python
class ImageWorkflowService:
    COST_PER_IMAGE = 0.2

    async def process_workflow(self, task_id: str, db: AsyncSession) -> None:
        task = ...  # load ProcessingTask
        if not task or task.status == 'cancelled':
            return
        input_data = dict(task.input_data or {})
        planned = input_data.get('planned_calls') or []
        needs_annotation = bool(input_data.get('needs_annotation'))
        image_url = (input_data.get('images') or [{}])[0].get('url')
        object_name = (input_data.get('images') or [{}])[0].get('object_name')
        seed = int(input_data.get('seed', -1))
        scale = float(input_data.get('scale', 0.5))

        task.status = 'running'
        await _persist(db)

        current_url = image_url
        current_obj = object_name
        seededit_ids: list[str] = []
        last_processed_names: list[str] = []

        try:
            for call in planned:
                prompt = call['seededit_prompt']
                async with SeedEditLock():
                    sid = await self._submit_with_retry(task, current_url, current_obj, prompt, seed, scale, db)
                    seededit_ids.append(sid)
                    images = await self._poll_with_retry(task, sid, db, task_id)
                    processed = await self._process_results(task, images, db)
                if not processed:
                    raise SeedEditError('STORE_FAILED', '工作流转存失败')
                last_processed_names = processed
                # 下一 call 使用新图预签名 URL
                current_obj = processed[-1]
                current_url = storage.presign_or_public_url(current_obj)  # 使用项目现有 storage API 名
            # 解析最终 URL 列表写入 output
            base_urls = storage.resolve_output_urls(last_processed_names)  # 对齐现有 resolve 方式
            ai_base = base_urls[0] if base_urls else current_url
            out = {
                'ai_base_image_url': ai_base,
                'object_names': last_processed_names,
                'seededit_count': len(planned),
                'seededit_cost_yuan': round(len(planned) * self.COST_PER_IMAGE, 2),
                'moonshot_calls': 0,
                'annotation_skipped': False,
                'processed_images': [ai_base],  # 兼容任务列表预览
            }
            if needs_annotation:
                task.status = 'awaiting_annotation'
                _set_output_data(task, out)
            else:
                out['final_image_url'] = ai_base
                task.status = 'success'
                task.completed_at = datetime.now(timezone.utc)
                task.cost_amount = out['seededit_cost_yuan']
                _set_output_data(task, out)
            task.seededit_task_ids = seededit_ids
            await _persist(db)
        except TaskCancelledError:
            ...
        except SeedEditError as e:
            task.status = 'failed'
            task.error_code = e.code
            task.error_message = e.message
            await _persist(db)
```

**注意：** `_submit_with_retry` / `_poll_with_retry` / `_process_results` 优先从 `ImageEditService` 复用（提取为共享 mixin 或模块级函数）。若提取成本高，本任务允许复制后在 commit message 注明后续 DRY。实现时对照 `image_edit_service.py` 中现有方法名与 `storage` API，勿臆造不存在的函数名——以仓库实际为准。

若 `planned` 为空且 `needs_annotation`：直接把原图视为 `ai_base_image_url`，进入 `awaiting_annotation`（或若也不需要注解则 400——提交 API 已要求至少一步）。

- [ ] **Step 2: Celery 任务**

在 `ai_tasks.py` 追加：

```python
@celery_app.task(name='process_image_workflow', bind=True, max_retries=3)
def process_image_workflow_task(self, task_id: str):
    async def _handle(db: AsyncSession) -> None:
        await image_workflow_service.process_workflow(task_id, db)

    try:
        run_async_task(_handle)
    except Exception as exc:
        _run_mark_failed(task_id, str(exc))
        raise
```

（错误处理对齐 `process_image_edit_task` 现有写法。）

- [ ] **Step 3: 手工/脚本冒烟（无真实 SeedEdit 时可 mock）**

至少保证模块可导入：

```bash
cd backend && python -c "from src.services.ai_processor.image_workflow_service import image_workflow_service; from src.worker.ai_tasks import process_image_workflow_task; print('ok')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/ai_processor/image_workflow_service.py \
  backend/src/worker/ai_tasks.py \
  backend/src/services/ai_processor/image_edit_service.py
git commit -m "feat(ai): 实现 image_workflow 编排服务与 Celery 任务"
```

---

### Task 4: API — submit / retry / complete-annotation

**Files:**
- Modify: `backend/src/api/ai_endpoints.py`
- Modify: `backend/src/schemas/ai.py`（若 `TaskResponse` 的 status 字面量需含 `awaiting_annotation`）
- Create: `backend/tests/test_workflow_submit_validation.py`（纯 Request 校验，不启 DB）

**Interfaces:**
- `POST /ai/workflow` → 202 `{ task_id, status, estimated_seededit_count, estimated_cost_yuan }`
- `POST /ai/workflow/{task_id}/retry` → 仅 `failed`/`cancelled` 可重试；重置后重新 `delay`
- `POST /ai/workflow/{task_id}/complete-annotation` → 仅 `awaiting_annotation`；`skip` 或上传烘烤图 → `success`
- `GET /ai/tasks` 已有，确保返回新 status 不报错
- Cancel：现有 `/ai/tasks/{id}/cancel` 允许 `awaiting_annotation`

- [ ] **Step 1: Request 校验单测**

```python
# backend/tests/test_workflow_submit_validation.py
import pytest
from pydantic import ValidationError
from src.schemas.ai import WorkflowSubmitRequest, CompleteAnnotationRequest


def test_workflow_requires_enabled_step():
    with pytest.raises(ValidationError):
        WorkflowSubmitRequest(
            image_url='http://x',
            object_name='a/b.jpg',
            steps=[{'id': 'cutout', 'enabled': False, 'order': 0}],
        )


def test_complete_annotation_requires_image_unless_skip():
    with pytest.raises(ValidationError):
        CompleteAnnotationRequest(skip=False)
    ok = CompleteAnnotationRequest(skip=True)
    assert ok.skip is True
```

- [ ] **Step 2: Run — FAIL then schemas already exist → should PASS after Task 2；若已 PASS 继续**

```bash
cd backend && pytest tests/test_workflow_submit_validation.py -v --no-cov
```

- [ ] **Step 3: 实现 endpoints**

`POST /ai/workflow` 要点：

```python
from src.services.ai_processor.workflow_planner import WorkflowStep, plan_workflow, estimate_cost_yuan
from src.worker.ai_tasks import process_image_workflow_task

@router.post('/workflow', response_model=ApiResponse[dict], status_code=202)
async def submit_workflow(request: WorkflowSubmitRequest, ...):
    steps = [
        WorkflowStep(id=s.id, enabled=s.enabled, order=s.order, prompt=s.prompt)
        for s in request.steps
    ]
    plan = plan_workflow(steps)
    input_data = {
        'mode': 'workflow',
        'images': [{'url': request.image_url, 'object_name': request.object_name}],
        'steps': [s.model_dump() for s in request.steps],
        'seed': request.seed,
        'scale': request.scale,
        'planned_calls': [
            {'seededit_prompt': c.seededit_prompt, 'covers': c.covers}
            for c in plan.planned_calls
        ],
        'estimated_seededit_count': plan.estimated_seededit_count,
        'needs_annotation': plan.needs_annotation,
    }
    task = ProcessingTask(task_type='image_workflow', status='pending', input_data=input_data)
    db.add(task)
    await db.flush()
    async_result = process_image_workflow_task.delay(task_id=str(task.id))
    task.input_data = {**input_data, 'celery_task_id': async_result.id}
    await db.flush()
    return ApiResponse(success=True, data={
        'task_id': str(task.id),
        'status': 'pending',
        'estimated_seededit_count': plan.estimated_seededit_count,
        'estimated_cost_yuan': estimate_cost_yuan(plan.estimated_seededit_count),
    })
```

`complete-annotation`：

- 校验 `task.task_type == 'image_workflow'` 且 `status == 'awaiting_annotation'`
- `skip=True`：`final_image_url = ai_base_image_url`，`annotation_skipped=True`
- 否则：对上传图做 Pillow（若尚未标准化）/转存，写 `final_image_url`，`annotation_skipped=False`
- `status=success`，`completed_at=now`

`retry`：仅 `image_workflow` + `failed`；清空 error；`status=pending`；重新 delay。

更新 `cancel_task`：允许状态含 `awaiting_annotation`。

更新 `TaskResponse` / 前端类型中的 status 联合类型（前端在 Task 6）。

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/ai_endpoints.py backend/src/schemas/ai.py \
  backend/tests/test_workflow_submit_validation.py
git commit -m "feat(ai): 新增 /ai/workflow 提交、重试与完成注解 API"
```

---

### Task 5: Moonshot Vision 定位 API

**Files:**
- Create: `backend/src/services/ai_processor/moonshot_vision.py`
- Modify: `backend/src/api/ai_endpoints.py`
- Create: `backend/tests/test_moonshot_layout_parse.py`（测 JSON 解析，不打真实 API）

**Interfaces:**
- `MoonshotVisionClient.suggest_layout(image_url: str, items: list[dict]) -> list[dict]`
- `POST /ai/workflow/suggest-text-layout`

- [ ] **Step 1: 解析单测**

```python
# backend/tests/test_moonshot_layout_parse.py
from src.services.ai_processor.moonshot_vision import parse_layout_response


def test_parse_layout_json_fence():
    raw = """```json
    [{"id":"a","x":0.1,"y":0.8,"fontSize":42,"align":"center"}]
    ```"""
    got = parse_layout_response(raw, valid_ids={'a'})
    assert got == [{'id': 'a', 'x': 0.1, 'y': 0.8, 'fontSize': 42, 'align': 'center'}]


def test_parse_clamps_and_filters():
    raw = '[{"id":"a","x":1.5,"y":-1},{"id":"b","x":0.2,"y":0.3}]'
    got = parse_layout_response(raw, valid_ids={'a'})
    assert len(got) == 1
    assert got[0]['x'] == 1.0
    assert got[0]['y'] == 0.0
```

- [ ] **Step 2: 实现 client**

```python
# moonshot_vision.py 要点
# POST {moonshot_api_base}/chat/completions
# model = settings.moonshot_vision_model
# messages: system 要求只返回 JSON 数组；
# user: 图用 image_url 多模态内容 + 文字 id/text 列表
# 未配置 key → AppException MOONSHOT_NOT_CONFIGURED 503
# items 为空 → 返回 []
```

System prompt 约束：坐标为相对画布 0~1，原点左上；不要遮挡商品主体；标题偏上、卖点偏下。

- [ ] **Step 3: Endpoint 接线 + pytest 解析测 PASS**

```bash
cd backend && pytest tests/test_moonshot_layout_parse.py -v --no-cov
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/ai_processor/moonshot_vision.py \
  backend/src/api/ai_endpoints.py \
  backend/tests/test_moonshot_layout_parse.py
git commit -m "feat(ai): Moonshot 视觉文字定位建议 API"
```

---

### Task 6: 前端双 Tab 壳 + 自由改图抽出

**Files:**
- Create: `frontend/src/components/features/ai-edit/FreeformEditPanel.tsx`
- Modify: `frontend/src/app/ai-edit/page.tsx`
- Modify: `frontend/src/components/features/AITaskList.tsx`（status 联合类型先扩到 `awaiting_annotation`）

**Interfaces:**
- `page.tsx`：`mode: 'workflow' | 'freeform'`，默认 `workflow`
- `FreeformEditPanel`：承接现有上传+prompt+提交逻辑（props 传入 tasks 刷新回调）

- [ ] **Step 1: 抽出 FreeformEditPanel**  
  将当前 `page.tsx` 左侧表单与提交逻辑移入 `FreeformEditPanel`，行为保持不变。

- [ ] **Step 2: page 增加 Tab UI**  
  两个按钮/Tab：「工作流」「自由改图」。工作流面板本任务可放占位文案「即将接入」。任务列表仍共用。

- [ ] **Step 3: 手工验收**  
  打开 `/ai-edit`，自由改图 Tab 仍能上传并提交；工作流 Tab 可切换。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/ai-edit/page.tsx \
  frontend/src/components/features/ai-edit/FreeformEditPanel.tsx \
  frontend/src/components/features/AITaskList.tsx
git commit -m "feat(ai-edit): AI 改图页双 Tab 并抽出自由改图面板"
```

---

### Task 7: 工作流提交面板（步骤勾选/排序/费用预估）

**Files:**
- Create: `frontend/src/components/features/ai-edit/workflowSteps.ts`
- Create: `frontend/src/components/features/ai-edit/WorkflowStepList.tsx`
- Create: `frontend/src/components/features/ai-edit/WorkflowEditPanel.tsx`
- Modify: `frontend/src/app/ai-edit/page.tsx`

**Interfaces:**
- 默认 steps 顺序与 spec 一致
- 前端本地 `estimateSeedEditCount(steps)` 可简化：调用后端返回的 `estimated_*`；提交前可用轻量镜像逻辑或先 `plan` 仅展示「以服务端为准」——**本任务提交后以响应里的 `estimated_cost_yuan` toast/文案展示**
- `ImageUploader maxCount={1}`
- `POST /ai/workflow` body: `{ image_url, object_name, steps, seed, scale }`

- [ ] **Step 1: workflowSteps 默认数据**

```typescript
export type WorkflowStepId =
  | "remove_watermark"
  | "cutout"
  | "add_scene"
  | "annotate_ru";

export interface WorkflowStepState {
  id: WorkflowStepId;
  label: string;
  enabled: boolean;
  order: number;
  prompt?: string; // only add_scene
}

export const DEFAULT_WORKFLOW_STEPS: WorkflowStepState[] = [
  { id: "remove_watermark", label: "去水印", enabled: true, order: 0 },
  { id: "cutout", label: "抠主体", enabled: true, order: 1 },
  { id: "add_scene", label: "加场景", enabled: true, order: 2, prompt: "" },
  { id: "annotate_ru", label: "俄文注解", enabled: true, order: 3 },
];
```

- [ ] **Step 2: WorkflowStepList UI**  
  checkbox、上下移动排序、`add_scene` 展开可选 Textarea、底部显示「预计 SeedEdit 次数将在提交后由服务端确认；常用组合约 1 次（¥0.2）」。

- [ ] **Step 3: WorkflowEditPanel 提交**  
  校验：1 张图 + 至少一启用步骤 → POST → `fetchTasks()`。

- [ ] **Step 4: 接进 page 的工作流 Tab**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/ai-edit/ \
  frontend/src/app/ai-edit/page.tsx
git commit -m "feat(ai-edit): 工作流步骤勾选面板与提交"
```

---

### Task 8: 任务列表 — 待注解状态与入口

**Files:**
- Modify: `frontend/src/components/features/AITaskList.tsx`
- Modify: `frontend/src/app/ai-edit/page.tsx`
- Modify: `frontend/src/components/features/ai-edit/WorkflowEditPanel.tsx`（或 page）打开编辑器

**Interfaces:**
- `AITask.status` 含 `awaiting_annotation`
- `hasActiveTasks` 含 `awaiting_annotation`（保持轮询）或对其停止「进行中」计数但提供「继续注解」按钮——**规格：列表展示「待注解」**；轮询可在仍有 pending/running 时继续；`awaiting_annotation` 不需要高频轮询 SeedEdit，但刷新应可见
- `onContinueAnnotation?(task: AITask)` 回调
- 预览：优先 `final_image_url`，否则 `ai_base_image_url` / `processed_images`

- [ ] **Step 1: 扩展类型与 StatusBadge 文案「待注解」**
- [ ] **Step 2: 按钮「继续注解」仅 `awaiting_annotation` 显示**
- [ ] **Step 3: page 状态 `annotationTask` 非空时渲染编辑器（Task 9 占位可先 Alert）**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/AITaskList.tsx \
  frontend/src/app/ai-edit/page.tsx
git commit -m "feat(ai-edit): 任务列表支持待注解状态与入口"
```

---

### Task 9: 注解编辑器（画布 + 列表 + 翻译 + 定位 + 烘烤）

**Files:**
- Create: `frontend/src/components/features/ai-edit/annotationTypes.ts`
- Create: `frontend/src/components/features/ai-edit/bakeAnnotation.ts`
- Create: `frontend/src/components/features/ai-edit/AnnotationEditor.tsx`
- Modify: `frontend/src/app/ai-edit/page.tsx`

**Interfaces:**
- `AnnotationTextItem` 字段与 spec §6.2 一致
- `bakeAnnotationToBlob(baseImageUrl, items, exportSize?) => Promise<Blob>`
- 复用 `POST /ai/translate-text`
- 调用 `POST /ai/workflow/suggest-text-layout`
- 完成：`skip`（0 条）或先 `POST /ai/upload-image`（沿用现有上传）再 `complete-annotation`

- [ ] **Step 1: annotationTypes + 内置西里尔字体 CSS（如 `font-family: "DejaVu Sans", "Arial", sans-serif` 等 2～3 选项）**

- [ ] **Step 2: AnnotationEditor 布局**  
  左：`<img>`/`canvas` 底图 + 绝对定位文字，拖拽更新 `x,y`（相对容器比例）。右：列表 CRUD、样式控件、`draftZh` +「从中文翻译填入」。

- [ ] **Step 3: AI 定位**  
  进入时若有文案则请求一次；失败 `message.warning`，不阻断。

- [ ] **Step 4: bakeAnnotation.ts**  
  离屏 canvas 绘制底图与文字（font/bold/italic/color/align），`toBlob('image/jpeg', 0.92)`。

- [ ] **Step 5: 导出并完成**  
  - items.length === 0 → `complete-annotation` `{ skip: true }`  
  - 否则 bake → upload → `complete-annotation` `{ image_url, object_name }`  
  成功后关闭编辑器并 `fetchTasks()`。

- [ ] **Step 6: 手工验收清单**  
  1. 只勾去水印+抠图+场景 → 约 1 次成本成功  
  2. 勾注解 → 待注解 → 编辑器 → 0 条完成  
  3. 加俄文 + 拖拽 + 翻译 + 定位 + 烘烤完成  
  4. 自由改图 Tab 回归

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/features/ai-edit/ \
  frontend/src/app/ai-edit/page.tsx
git commit -m "feat(ai-edit): 俄文注解编辑器与烘烤完成流程"
```

---

### Task 10: 收尾核对与文档

**Files:**
- Modify: `docs/superpowers/specs/2026-07-16-ai-image-workflow-design.md`（状态改为「实现中/已实现」视情况）
- Modify: `backend/.env` **不要提交**；在本地添加 `MOONSHOT_API_KEY=`（仅开发者本机）
- 若有 `backend/.env.example`：追加 Moonshot 三变量

- [ ] **Step 1: 对照 spec 逐条打勾（Planner / 双 Tab / 0 条 / 合并 / Moonshot 配置名）**
- [ ] **Step 2: 跑后端相关测试**

```bash
cd backend && pytest tests/test_workflow_planner.py tests/test_workflow_submit_validation.py tests/test_moonshot_layout_parse.py -v --no-cov
```

- [ ] **Step 3: Commit 文档**

```bash
git add docs/superpowers/specs/2026-07-16-ai-image-workflow-design.md backend/.env.example
git commit -m "docs: 标记 AI 主图工作流规格实现状态并补充 env 示例"
```

---

## Self-Review（对照 spec）

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 双 Tab 工作流/自由改图 | Task 6–7 |
| WorkflowPlanner 智能合并 | Task 1 |
| annotate 不进 SeedEdit | Task 1 + 3 |
| 一键跑完 AI 段 | Task 3 |
| awaiting_annotation + 编辑器 | Task 3–4, 8–9 |
| 扁平烘烤 / 0 条 skip | Task 4, 9 |
| 默认俄文 + 中译俄 | Task 9（TMT） |
| Moonshot 可配置模型 | Task 2, 5 |
| 单图首期 | Task 4 schema + Task 7 maxCount=1 |
| 费用预估 | Task 1 estimate + Task 4/7 |
| 自由改图回归 | Task 6, 9 验收 |
| 换色/换款不做 | 无 Task（YAGNI） |
| 多图口子 | input_data.images[] 在 Task 4 |

**Placeholder scan:** 已消除笼统「适当处理」；Task 3 明确要求对照现有 `storage`/`ImageEditService` API，禁止臆造函数名。  
**Type consistency:** `awaiting_annotation`、`planned_calls`、`needs_annotation`、`CompleteAnnotationRequest.skip` 前后一致。
