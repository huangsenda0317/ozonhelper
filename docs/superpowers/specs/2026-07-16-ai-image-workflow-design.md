# AI 主图工作流设计

**日期**: 2026-07-16  
**状态**: 已确认（待实现计划）  
**范围**: 将 AI 改图从「原图 + 自由提示词」升级为可勾选步骤的主图工作流，并增加俄文注解图层编辑器

---

## 1. 背景与问题

当前 AI 改图（SeedEdit 3.0）仅支持「原图 + 一条自然语言提示词」，难以稳定产出适合 Ozon 的俄文商品主图。主图制作流程相对固定，核心能力明确：

- 去水印
- 抠主体
- 加场景
- 加俄文注解
- 更换颜色/款式（本版暂缓）

单次万能 prompt 无法可靠覆盖上述组合，且注解若继续用 SeedEdit 烧字，成本高、可控性差。

## 2. 目标与非目标

### 目标

1. 提供**工作流模式**：上传一张主图 → 勾选/排序功能步骤 → 一键执行 AI 段。
2. AI 步骤（去水印 / 抠主体 / 加场景）由后端编排，**智能合并**为尽可能少的 SeedEdit 调用以控制成本。
3. 俄文注解改为**前端图片编辑器**（底图 + 文字悬浮层），支持 AI 视觉自动定位与手工拖拽；最终**烘烤为扁平图**交付。
4. 与现有**自由改图**共存（双 Tab），互不影响。
5. 数据模型预留多图批处理口子，**首期仅单张主图**。

### 非目标（本版不做）

- 更换颜色 / 款式
- 步骤间人工确认（采用一键跑完）
- 多图批跑 UI（仅保留 `images[]` 扩展点）
- 持久化可编辑文字图层（会话内编辑，导出后只保留扁平图）
- 合并段失败后拆成单步重试

## 3. 已确认决策

| 议题 | 决策 |
|------|------|
| AI 步骤间是否人工过目 | A：一键跑完，中途不暂停 |
| 俄文注解实现 | 图层编辑器，不走 SeedEdit 烧字 |
| 注解最终交付 | A：烘烤扁平 JPEG/PNG |
| 文案语言 | D：默认填俄文；提供「从中文翻译填入」 |
| SeedEdit 计次 | B：智能合并兼容步骤，减少调用 |
| 产品形态 | C：双 Tab「工作流 / 自由改图」 |
| 文字自动定位 | B：Moonshot 视觉模型；默认 `moonshot-v1-128k-vision-preview`（可配置） |
| 处理粒度 | A：首期单张；预留多图口子 |
| 0 条文案 | 允许；等于跳过注解，直接用 AI 底图完成任务 |

## 4. 架构

### 4.1 产品入口

「AI 改图」页双 Tab：

- **工作流**（默认）：步骤勾选 + 单图上传 + 注解编辑器
- **自由改图**：现有原图 + prompt 流程不变（`/ai/image-edit`）

### 4.2 链路

```
工作流 Tab
  上传 1 张主图 → 勾选/排序步骤 → 提交
    → 后端 WorkflowPlanner 合并 SeedEdit 调用
    → 执行 SeedEdit（复用锁/重试/转存）→ Pillow 标准化中间底图
    → 若勾选 annotate_ru → status = awaiting_annotation
         → 编辑器（Moonshot 定位 + 拖拽/样式）
         → 用户导出（允许 0 条文案）→ 上传扁平图 → success
    → 未勾选 annotate_ru → 直接 success

自由改图 Tab
  现有流程不变
```

### 4.3 后端职责

- 新任务类型 `image_workflow`（与 `image_edit` / `translate` 并列）
- `WorkflowPlanner`：根据 steps 生成最少 SeedEdit 调用计划
- 复用现有 SeedEdit 客户端、并发锁、重试、MinIO 转存、Pillow 1200×1200
- 新接口：视觉定位建议、注解完成上传
- 复用 `POST /ai/translate-text`（TMT）供编辑器翻译
- 配置：`MOONSHOT_API_KEY`、`MOONSHOT_VISION_MODEL`（默认 `moonshot-v1-128k-vision-preview`）

### 4.4 方案选型说明

采用**后端工作流引擎 + 步骤图**（非前端拼 prompt、非重型 DAG）：

- 成本、重试、进度、计费集中在服务端
- 与自由改图边界清晰
- 自然支持日后多图（每张独立 plan）

## 5. 工作流步骤与合并规则

### 5.1 首期步骤

| ID | 名称 | 用户输入 | 实现 |
|----|------|----------|------|
| `remove_watermark` | 去水印 | checkbox | SeedEdit |
| `cutout` | 抠主体 | checkbox | SeedEdit |
| `add_scene` | 加场景 | checkbox + 可选 prompt；空则默认「根据商品自动配适合 Ozon 的场景/白底展示」 | SeedEdit |
| `annotate_ru` | 俄文注解 | checkbox；勾选后进编辑器填文案 | 非 SeedEdit |

换色/换款：预留 step id，本版 UI 隐藏。

### 5.2 默认顺序

`remove_watermark` → `cutout` → `add_scene` → `annotate_ru`  
用户可拖拽改序；后端按用户顺序规划，并做兼容性校验。

### 5.3 智能合并

1. 仅连续且兼容的 SeedEdit 类步骤可合并为 **1 次**调用；`annotate_ru` 永不进入 SeedEdit。
2. 兼容示例：
   - `remove_watermark` + `cutout` → 1 次
   - `remove_watermark` + `cutout` + `add_scene` → 1 次（场景 prompt 并入）
3. 不兼容（如 `add_scene` 排在 `cutout` 前）则按序拆开，不强行合并矛盾指令。
4. 提交前展示预估：`预计 SeedEdit N 次 ≈ ¥0.2×N`；Moonshot/TMT 标为低成本辅助。
5. 合并段失败：整段重试（最多 3 次，沿用现有退避）；首期不提供拆步重试。

### 5.4 状态机

```
pending → running → success                    # 无注解
pending → running → awaiting_annotation → success  # 有注解（含 0 条导出）
任意段 → failed（可整单 retry）
任意段 → cancelled
```

## 6. 俄文注解编辑器

### 6.1 布局

- **左**：画布；底图为 AI 步骤输出；文字层可拖拽
- **右**：文字列表；增删改；字体 / 字号 / 颜色 / 粗体 / 斜体；「从中文翻译填入」
- 操作：重新 AI 定位、导出并完成

### 6.2 会话内文字模型（不持久化图层）

```
id, text(俄文主字段), draftZh?, x, y (0~1),
fontFamily, fontSize, color, bold, italic, align
```

字体须支持西里尔字母，内置 2～3 套。

### 6.3 文案与翻译

- 默认直接编辑俄文 `text`
- 「从中文翻译填入」：`draftZh` → TMT zh→ru → 写入 `text`，可再改
- **允许 0 条文案**导出：跳过注解，`final_image_url` 等于 AI 底图

### 6.4 AI 自动定位

- 进入编辑器可自动请求一次；也可点「重新 AI 定位」
- `POST /ai/workflow/suggest-text-layout`：底图 + 文字列表 → Moonshot Vision → `{ id, x, y, fontSize?, align? }`
- 失败不阻断：提示后手工拖放

### 6.5 烘烤完成

1. 前端 Canvas 将文字绘入底图
2. `POST /ai/workflow/{task_id}/complete-annotation` 上传
3. 后端转存 + Pillow 1200×1200 → `success`
4. 对比预览：原图 / AI 底图 / 最终图（0 条时最终图 = AI 底图）

## 7. 数据模型

扩展 `ProcessingTask`（优先 JSONB，避免大迁移）：

### input_data

```json
{
  "mode": "workflow",
  "images": [{ "url": "...", "object_name": "..." }],
  "steps": [
    { "id": "remove_watermark", "enabled": true, "order": 0 },
    { "id": "cutout", "enabled": true, "order": 1 },
    { "id": "add_scene", "enabled": true, "order": 2, "prompt": "" },
    { "id": "annotate_ru", "enabled": true, "order": 3 }
  ],
  "seed": -1,
  "scale": 0.5,
  "planned_calls": [
    {
      "seededit_prompt": "...",
      "covers": ["remove_watermark", "cutout", "add_scene"]
    }
  ],
  "estimated_seededit_count": 1
}
```

约束：首期 `images.length === 1`；至少启用一个步骤。

### output_data

```json
{
  "ai_base_image_url": "...",
  "final_image_url": "...",
  "seededit_count": 1,
  "seededit_cost_yuan": 0.2,
  "moonshot_calls": 1,
  "annotation_skipped": false
}
```

`task_type = image_workflow`；`status` 增加约定值 `awaiting_annotation`。

## 8. API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/ai/workflow` | 提交工作流，202 + task_id |
| `GET` | `/ai/tasks` | 现有列表，可筛 `image_workflow` |
| `POST` | `/ai/workflow/{id}/retry` | 整单重试 SeedEdit 段 |
| `POST` | `/ai/workflow/suggest-text-layout` | Moonshot 视觉定位 |
| `POST` | `/ai/workflow/{id}/complete-annotation` | 上传烘烤图并完成 |
| `POST` | `/ai/translate-text` | 已有，编辑器复用 |
| `POST` | `/ai/image-edit` | 自由改图，不变 |

## 9. 错误处理

| 场景 | 行为 |
|------|------|
| SeedEdit 超限/忙 | 指数退避最多 3 次 → failed，可整单 retry |
| SeedEdit 审核拒绝 | failed + 可读原因 |
| 合并段失败 | 整段失败，不拆步（首期） |
| Moonshot 失败 | 不改任务状态；前端提示手拖 |
| 取消 | 支持 running / awaiting_annotation |
| awaiting_annotation 超时 | 首期不过期；列表展示「待注解」 |
| 烘烤上传失败 | 保持 awaiting_annotation，可再传 |
| images ≠ 1 / 无启用步骤 | 400 |

## 10. 测试要点

- Planner：勾选/排序 → 合并次数与 covers 正确；`annotate_ru` 永不进 SeedEdit
- 状态机：无注解直接 success；有注解 → awaiting → complete（含 0 条）
- API：缺图、多图、无步骤 → 400
- 编辑器：拖拽、样式、翻译填入、0 条导出、Pillow 1200×1200
- 回归：自由改图 Tab 行为不变

## 11. 成功标准

1. 常见「去水印 + 抠图 + 加场景」多数情况下为 **1 次** SeedEdit。
2. 写俄文不消耗 SeedEdit；允许 0 条直接完成。
3. 双 Tab 共存；多图仅数据口子。

## 12. 以后扩展（口子）

- 多图：`images[]` 逐张独立 plan；注解编辑器按张进入
- 换色/换款：新 step id + UI
- 合并失败拆步重试
- 可选：持久化图层 JSON（当前明确不做）
