## Context

AI 翻译页（`/ai-edit/translate`）当前仅轮询展示 `task_type=translate` 的历史 Celery 任务，无文本输入与提交入口。后端 `POST /ai/translate` 要求 `collected_product_id`，从商品表读取 title/description 后异步翻译，适用于跟卖批量流程，不适合页面内即时翻译体验。

腾讯云 TMT 已通过 `TMTTranslator` 封装，支持同步调用、5 次/秒、单次 ≤6000 字符。Apple Design System 已在改图页建立左右/上下分栏与 pill 按钮模式，翻译页应对齐同一视觉语言。

## Goals / Non-Goals

**Goals:**

- 提供左右分栏翻译工作区：左输入、中按钮、右输出
- 新增同步 `POST /ai/translate-text`，毫秒~秒级返回译文
- 输入校验、loading、错误提示、字符计数、译文复制
- 遵循 `apple/DESIGN.md` 样式（Action Blue、圆角卡片、SF Pro 排版）

**Non-Goals:**

- 不改造现有商品字段异步翻译任务流（`POST /ai/translate` + Celery）
- 不支持多语言对切换 UI（首版固定 zh→ru，API 预留字段）
- 不实现翻译历史持久化到本地或数据库（可选只读展示既有 Celery 任务列表）
- 不实现批量多段文本或文件导入

## Decisions

### 1. 同步 API vs 继续走 Celery 任务

**选择**: 新增同步 `POST /ai/translate-text`，直接在 FastAPI 请求内调用 `TMTTranslator`。

**理由**: 用户期望点击「翻译」后立即在右侧看到结果；TMT 延迟通常 <2s，无需任务队列。现有 Celery 路径保留给商品批量翻译。

**备选**: 仍创建 ProcessingTask 并轮询 — 交互延迟高，与改图异步场景不同（改图 SeedEdit 本身分钟级）。

### 2. 页面布局

**选择**: CSS Grid / Flex 三列 — `1fr auto 1fr`，左 textarea、中垂直居中翻译按钮、右结果区。

```
┌─────────────────┬──────┬─────────────────┐
│  原文 textarea  │ 翻译 │  译文展示区      │
│  (可编辑)       │ 按钮 │  (只读/可复制)   │
└─────────────────┴──────┴─────────────────┘
```

移动端（`< md`）改为上下堆叠：输入 → 按钮 → 输出。

**理由**: 与用户描述一致，对照改图页 `ImageCompare` 左右对比模式。

### 3. 组件拆分

**选择**: 在 `translate/page.tsx` 内联实现，或抽取 `TranslateWorkspace.tsx` 于 `components/features/`。

**理由**: 逻辑简单（~150 行），若 page 超过 200 行则抽取组件；首版可 page 内实现以降低文件数。

### 4. Schema 设计

```python
class TranslateTextRequest(BaseModel):
    source_text: str = Field(..., min_length=1, max_length=6000)
    source_lang: str = Field(default='zh')
    target_lang: str = Field(default='ru')
    untranslated_text: str | None = Field(default=None, max_length=200)

class TranslateTextResponse(BaseModel):
    target_text: str
    used_amount: int
    source_lang: str
    target_lang: str
```

长文本由 `TMTTranslator` 内部分段（已有逻辑）。

### 5. 历史任务列表

**选择**: 工作区下方保留折叠式「历史任务」区块，默认收起。

**理由**: 不丢失现有能力；主流程聚焦即时翻译。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| TMT 同步调用阻塞请求线程 | 单次 ≤6000 字符，FastAPI async + 线程池调用；超时 30s |
| 高频点击触发限流（5/s） | 前端按钮 debounce + `submitting` 禁用 |
| 超长文本分段翻译失败部分成功 | 返回首段错误信息；Translator 已有分段逻辑 |
| 同步 API 无审计记录 | 非目标；商品批量翻译仍写 ProcessingTask |

## Migration Plan

1. 后端先部署 `POST /ai/translate-text`（向后兼容）
2. 前端发布新布局，调用新 API
3. 无需数据库迁移

回滚：前端 revert 页面；新 API 可保留不影响旧流程。

## Open Questions

- 历史任务区块是否默认展示？→ 首版默认收起，减少视觉干扰
- 是否需要在同步 API 记录 `used_amount` 到用户配额？→ 首版仅返回字段，不做配额限制
