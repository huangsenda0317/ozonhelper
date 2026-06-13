## 1. 后端 — 同步文本翻译 API

- [x] 1.1 在 `backend/src/schemas/ai.py` 新增 `TranslateTextRequest`（`source_text` 1–6000、`source_lang`、`target_lang`、`untranslated_text`）和 `TranslateTextResponse`（`target_text`、`used_amount`、`source_lang`、`target_lang`）
- [x] 1.2 在 `backend/src/api/ai_endpoints.py` 新增 `POST /translate-text` 端点：校验请求、调用 `TMTTranslator.translate()`、返回 `ApiResponse[TranslateTextResponse]`
- [x] 1.3 处理 TMT 异常：捕获翻译失败并返回 502/503 及可读错误信息

## 2. 前端 — 翻译工作区布局

- [x] 2.1 重构 `frontend/src/app/ai-edit/translate/page.tsx` 主区域为三列布局（md+ 左输入 / 中按钮 / 右输出；小屏垂直堆叠）
- [x] 2.2 左侧 textarea：placeholder「请输入中文原文」、绑定 `sourceText` state、实时字符计数（≤6000 警告并禁用翻译）
- [x] 2.3 中间「翻译」按钮：primary pill 样式、`submitting` loading 状态、空输入时不发起请求
- [x] 2.4 右侧译文区：只读展示 `targetText`、空态提示「翻译结果将显示在这里」

## 3. 前端 — 翻译交互与辅助功能

- [x] 3.1 实现 `handleTranslate`：调用 `POST /ai/translate-text`，成功写入右侧，失败展示错误 toast/inline 提示
- [x] 3.2 译文区新增「复制」按钮：有译文时可复制到剪贴板并短暂提示成功
- [x] 3.3 页头保留语言方向说明（中文 → 俄文，TMT 5次/秒）

## 4. 前端 — 历史任务（次要）

- [x] 4.1 将现有 Celery 任务列表移至工作区下方可折叠「历史任务」区块，默认收起
- [x] 4.2 保留原有编辑弹窗与 5s 轮询逻辑，不影响主工作区

## 5. 联调验证

- [x] 5.1 验证完整流程：输入中文 → 点击翻译 → 右侧显示俄文 → 复制成功
- [x] 5.2 验证边界：空输入阻止、超 6000 字符禁用、未登录 401、TMT 失败错误展示
- [x] 5.3 验证响应式：桌面三列 / 移动端垂直堆叠布局正常
