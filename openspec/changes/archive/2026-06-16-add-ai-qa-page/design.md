## Context

- 导航 `GlobalNav` 已预留 `/ai-qa` 入口，但页面尚未实现
- 后端已有 AI 改图（火山 SeedEdit）、AI 翻译（腾讯云 TMT）能力；`GLM_API_KEY` 已写入 `backend/.env`
- `ozon-mcp/` 提供 40+ 语义工具（商品、库存、订单、卖家信息等）及 `ozon_api_call` 通用层，当前通过 stdio MCP 供 IDE Agent 使用，凭证来自环境变量
- 多店铺凭证由 `Store` 模型加密存储，前端 `StoreContext` 已在店铺跟踪模块实现切换
- 前端已集成 `antd` 与 `@ant-design/nextjs-registry`，尚未安装 `@ant-design/x` / `@ant-design/x-markdown`
- Apple Design 体系为主视觉，AI 对话区可局部使用 Ant Design X 组件，外层布局保持项目既有 Tailwind 风格

## Goals / Non-Goals

**Goals:**

- 提供 `/ai-qa` 对话页：选店铺、选 GLM 模型、自然语言提问，获取基于实时 Ozon 数据的回答
- 使用 [Ant Design X](https://x.ant.design/components/introduce-cn/) 原子组件（`Bubble.List`、`Sender`、`Welcome`、`Prompts`）与 [X Markdown](https://x.ant.design/x-markdowns/introduce-cn/) 流式渲染
- 后端 SSE 流式 API，智谱 GLM Function Calling 驱动 Ozon 工具调用
- 按 `store_id` 动态注入店铺凭证，复用 `ozon-mcp` 工具实现（非浏览器直连 MCP）
- 预设快捷提问（待发货订单、库存概况、卖家信息等）

**Non-Goals:**

- 会话持久化、多轮历史跨设备同步（MVP 仅页面内存）
- 写操作确认流（改价、发货等）— MVP 以只读查询为主，写操作工具可注册但需二次确认（后续迭代）
- 将 MCP Server 嵌入 FastAPI 或改造为 HTTP MCP
- 支持非智谱模型（OpenAI、Claude 等）
- 在 Cursor IDE 侧复用本页面（本页为 Web 产品功能）

## Decisions

### 1. 架构：后端代理 Tool Calling，非浏览器直连 MCP

**选择**: 前端 → `POST /api/v1/ai/chat`（SSE）→ `GlmChatService` → 智谱 API + 内联执行 Ozon 工具 → 流式返回。

**理由**: MCP stdio 协议面向 IDE 子进程，浏览器无法直接调用；后端已有店铺凭证解密能力，与 `OzonSellerClient.from_store()` 一致。

**备选**: 前端 WebSocket 连独立 MCP HTTP 网关 — 增加部署复杂度，MVP 不必要。

### 2. Ozon 工具复用策略

**选择**: 在 `backend/src/services/ai_processor/ozon_tools.py` 中：

1. 为每次请求构造 `OzonApiClient(client_id, api_key)`（对齐 `ozon-mcp` 的 `OzonApiClient`，或直接 import `ozon_mcp.client` 并扩展支持构造参数）
2. 注册 MVP 只读工具子集：`get_seller_info`、`get_product_list`、`get_product_stocks`、`get_fbs_unfulfilled_orders`、`get_fbs_orders`、`list_warehouses`、`ozon_api_call`（只读 path 白名单或 Agent prompt 约束）
3. 将工具 JSON Schema 传给智谱 `tools` 参数

**理由**: 避免重复实现 40 个工具；语义层与 MCP 保持一致，便于后续同步。

**备选**: 仅暴露 `ozon_api_call` — Agent 选型困难，体验差。

### 3. 智谱 GLM 集成

**选择**: `GlmClient` 封装 `https://open.bigmodel.cn/api/paas/v4/chat/completions`：

- 支持 `stream: true`
- 模型枚举：`glm-4-flash`（默认）、`glm-4-plus`、`glm-4-air`
- System prompt 注入：当前店铺名称、可用工具说明、只读优先策略
- Tool call 循环：最多 5 轮 tool → assistant，防止无限循环

**理由**: `GLM_API_KEY` 已配置；智谱 OpenAPI 兼容 OpenAI tools 格式。

### 4. 前端组件选型

**选择**:

| 区域 | 组件 | 用途 |
|------|------|------|
| 空态 | `Welcome` + `Prompts` | 欢迎语与快捷提问 |
| 消息列表 | `Bubble.List` | 用户/助手气泡 |
| 助手内容 | `XMarkdown` | 流式 Markdown 渲染 |
| 工具状态 | 自定义 `Think` 或轻量 status 行 | 显示「正在查询订单…」 |
| 输入 | `Sender` | 发送框、Enter 发送 |
| 顶栏 | 复用 `StoreSwitcher` 模式 + `<select>` 模型 | 店铺与模型选择 |

页面外包 `XProvider`（或 `ConfigProvider` + Ant Design X 主题 token）以适配深色模式。

**理由**: 用户明确要求使用 Ant Design X 生态；与现有 `antd` 6.x 兼容。

### 5. 流式协议（SSE）

**选择**: 事件类型：

```
event: delta
data: {"content": "部分文本"}

event: tool_start
data: {"name": "get_fbs_orders", "args": {...}}

event: tool_end
data: {"name": "get_fbs_orders", "result_preview": "..."}

event: done
data: {}

event: error
data: {"message": "..."}
```

前端 `fetch` + `ReadableStream` 解析（或 `EventSource` 若改为 GET）。

**理由**: 与 GLM streaming + 工具中间态解耦，前端可分别更新气泡与状态行。

### 6. 鉴权与店铺校验

**选择**:

- 路由需 `get_current_user`
- `store_id` 必须属于当前用户，否则 `404 STORE_NOT_FOUND`
- 店铺无凭证 → `503 OZON_NOT_CONFIGURED`，前端引导绑定

### 7. 依赖安装

**选择**: 前端 `npm install @ant-design/x @ant-design/x-markdown`；后端无新重型依赖（`httpx` 已有）。

## Risks / Trade-offs

- **[Risk] GLM 工具调用幻觉** → System prompt 强调「无数据须说明」；工具结果 JSON 截断至合理长度（如 8KB）
- **[Risk] Ozon API 限流** → 复用 `ozon-mcp` 令牌桶；单次对话最多 5 次 tool 调用
- **[Risk] Ant Design X 与 Apple Design 视觉冲突** → 对话区内使用 X 默认样式，页面外壳保持 Tailwind；通过 `XProvider` token 微调主色为 `#0066cc`
- **[Risk] 流式 Markdown 不完整渲染** → 使用 `@ant-design/x-markdown` 的 streaming 模式，done 后 final flush
- **[Risk] 写操作误触发** → MVP 工具集以只读为主；`update_*` / `ship_*` 暂不注册或需 `confirm_write: true` 参数（后续）

## Migration Plan

1. 后端：Settings + GlmClient + ozon_tools + `/ai/chat` 路由
2. 前端：安装依赖 → `/ai-qa` 页面 → 联调 SSE
3. 更新 `.env.example` 补充 `GLM_API_KEY`
4. 无需数据库迁移
5. 回滚：移除路由与页面即可，不影响既有功能

## Open Questions

- 是否在 MVP 注册写操作工具（改库存、发货）？**暂定：仅只读，写操作留 v2**
- 是否需要对话导出/复制全文？**暂定：Bubble 操作栏提供复制**
