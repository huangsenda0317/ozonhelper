## 1. 后端配置与 Schema

- [x] 1.1 在 `Settings` 增加 `glm_api_key: str`，从 `GLM_API_KEY` 读取；更新 `backend/.env.example`
- [x] 1.2 在 `backend/src/schemas/ai.py` 新增 `ChatMessage`、`ChatRequest`（store_id、model、messages）及 SSE 事件类型文档注释

## 2. 后端智谱 GLM 客户端

- [x] 2.1 新建 `backend/src/services/ai_processor/glm_client.py`：封装智谱 `chat/completions`（stream + tools），支持 `glm-4-flash` / `glm-4-plus` / `glm-4-air`
- [x] 2.2 实现 tool call 循环（最多 5 轮），解析 streaming delta 与 `tool_calls`

## 3. 后端 Ozon 工具层

- [x] 3.1 扩展或包装 `ozon_mcp.client.OzonApiClient`，支持按 `client_id` / `api_key` 构造（非仅环境变量）
- [x] 3.2 新建 `backend/src/services/ai_processor/ozon_tools.py`：注册只读工具（`get_seller_info`、`get_product_list`、`get_product_stocks`、`get_fbs_unfulfilled_orders`、`get_fbs_orders`、`list_warehouses`、`ozon_api_call`）及 JSON Schema
- [x] 3.3 实现 `run_ozon_tool(name, args, client)` 分发，结果 JSON 截断至合理长度

## 4. 后端聊天 API

- [x] 4.1 新建 `backend/src/services/ai_processor/chat_service.py`：校验 store 归属、解密凭证、组装 system prompt、驱动 GlmClient + ozon_tools
- [x] 4.2 在 `ai_endpoints.py` 新增 `POST /api/v1/ai/chat`，返回 `StreamingResponse`（SSE：`delta` / `tool_start` / `tool_end` / `done` / `error`）
- [x] 4.3 处理 `GLM_NOT_CONFIGURED`、`STORE_NOT_FOUND`、`OZON_NOT_CONFIGURED` 错误码

## 5. 前端依赖与布局

- [x] 5.1 安装 `@ant-design/x`、`@ant-design/x-markdown`；确认与 `antd` 6.x 及 `@ant-design/nextjs-registry` 兼容
- [x] 5.2 新建 `frontend/src/app/ai-qa/page.tsx`：登录守卫、页面外壳（Tailwind + 主题）、顶栏店铺/模型选择器

## 6. 前端对话组件

- [x] 6.1 新建 `frontend/src/components/features/ai-qa/AIQAChat.tsx`：`Welcome`、`Prompts`（≥4 条预设）、`Bubble.List`、`Sender`
- [x] 6.2 集成 `XMarkdown` 流式渲染 assistant 内容；`XProvider` / `ConfigProvider` 适配深色模式
- [x] 6.3 实现 SSE 消费（`fetch` + ReadableStream），处理 `delta` / `tool_start` / `tool_end` / `done` / `error`
- [x] 6.4 复用 `useStoreContext`：无店铺时禁用发送并引导 `/settings/stores`

## 7. 联调与收尾

- [x] 7.1 手动验证：选店铺 → 快捷提问「卖家账户信息」→ 流式 Markdown 答复
- [x] 7.2 手动验证：切换模型、深色模式、未登录重定向、无凭证店铺错误提示
- [x] 7.3 首页工具箱（可选）增加 AI 问答入口卡片
