## Why

运营人员需要以自然语言快速查询 Ozon 店铺状态（订单、库存、商品、卖家信息等），而不必在 ERP 各页面间切换或手动调用 API。智谱 GLM API Key 已配置就绪，且项目已有 ozon-seller MCP 工具集与多店铺凭证管理，适合构建「选店铺 + 选模型 + 对话提问」的 AI 问答工作台，降低店铺数据获取门槛。

## What Changes

- 新增 `/ai-qa` 页面（导航已预留入口），使用 [@ant-design/x](https://x.ant.design/components/introduce-cn/) 搭建对话 UI（Bubble、Sender、Welcome、Prompts 等），使用 [@ant-design/x-markdown](https://x.ant.design/x-markdowns/introduce-cn/) 流式渲染助手回复
- 页面顶部提供**店铺选择器**（复用 `StoreContext`）与**模型选择器**（智谱 GLM 系列，如 glm-4-flash、glm-4-plus）
- 新增后端 `POST /api/v1/ai/chat` 流式对话 API：以选中店铺的解密凭证调用 Ozon 能力，以 GLM 驱动 Function Calling / Tool Use
- 后端复用 `ozon-mcp` 语义工具定义（商品、库存、订单、卖家信息等），按 `store_id` 动态注入 `Client-Id` / `Api-Key`，不依赖浏览器直连 MCP stdio
- 支持 SSE 流式输出：思考过程、工具调用状态、最终 Markdown 答复
- 预设快捷提问（Prompts）：如「今日待发货订单」「库存预警商品」「卖家账户信息」
- 会话仅保存在当前页面内存（MVP 不做持久化历史）；未绑定店铺时引导至设置页

## Capabilities

### New Capabilities

- `ai-qa-chat`: 后端智谱 GLM 对话 API，绑定店铺凭证，注册 Ozon MCP 语义工具并流式返回
- `ai-qa-workspace`: 前端 AI 问答页——Ant Design X 对话组件、店铺/模型选择、SSE 消费与 Markdown 渲染

### Modified Capabilities

（无 — 不修改 `ozon-mcp-server` 等既有规格；后端以内联调用方式复用工具逻辑，不改变 MCP stdio 进程行为）

## Impact

- **前端**: 新增 `frontend/src/app/ai-qa/page.tsx` 及子组件；安装 `@ant-design/x`、`@ant-design/x-markdown`；复用 `StoreContext`、主题与鉴权
- **后端**: `backend/src/api/ai_endpoints.py` 扩展聊天路由；新增 `backend/src/services/ai_processor/glm_client.py` 与 `ozon_tool_registry.py`；`backend/src/schemas/ai.py` 新增聊天 Schema；`Settings` 增加 `glm_api_key`
- **配置**: `backend/.env` 已有 `GLM_API_KEY`；`.env.example` 补充说明
- **依赖**: 前端新增 `@ant-design/x`、`@ant-design/x-markdown`；后端可能复用 `ozon-mcp` 工具模块或抽取共享调用层
- **外部系统**: 智谱开放平台 Chat Completions API；Ozon Seller API（经店铺凭证，遵守 50 req/s 限流）
