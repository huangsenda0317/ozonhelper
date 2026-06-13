## Why

当前 AI 翻译页仅展示历史异步任务列表，用户无法直接在页面输入文本并即时查看翻译结果；页面缺少直观的「输入 → 翻译 → 输出」工作区，与 AI 改图页已具备的即时操作体验不一致，不利于独立测试翻译效果或快速处理零散文案。

## What Changes

- 重构 AI 翻译页主区域为左右分栏工作区：左侧 textarea 输入中文原文，右侧只读区域展示俄文译文
- 两栏之间放置「翻译」按钮，点击后调用翻译 API 并将结果渲染到右侧
- 新增同步文本翻译 API，接受原始文本（无需绑定商品 `collected_product_id`），直接返回译文
- 保留字符数提示（≤6000 字符）、加载/错误状态、译文可复制；可选保留下方历史任务列表（折叠或次要区域）
- 默认语言方向：中文（zh）→ 俄文（ru），与现有 TMT 配置一致

## Capabilities

### New Capabilities

- `ai-translate-text`: 独立文本同步翻译 API，接收原文与语言对，返回译文及字符消耗
- `ai-translate-workspace`: 翻译页左右分栏工作区 UI（输入框、翻译按钮、结果展示）

### Modified Capabilities

（无 — `openspec/specs/` 目录尚无既有规格，本次均为新能力）

## Impact

- **前端**: `frontend/src/app/ai-edit/translate/page.tsx` 重构为主工作区布局；可抽取 `TranslateWorkspace` 组件
- **后端 API**: `backend/src/api/ai_endpoints.py` — 新增 `POST /ai/translate-text`（同步）
- **后端 Schema**: `backend/src/schemas/ai.py` — 新增 `TranslateTextRequest` / `TranslateTextResponse`
- **AI 服务**: 复用现有 `TMTTranslator.translate()`，无需 Celery 队列
- **现有异步翻译**: `POST /ai/translate`（商品字段批量翻译）保持不变，供跟卖链路使用
