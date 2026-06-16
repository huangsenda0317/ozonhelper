## Why

Ozon Seller API 共 263 个端点，分散在官方文档中，AI Agent（Cursor、Claude Code 等）难以直接、安全地调用。项目后端已有 `OzonSellerClient` 与参考文档（`reference/Ozon_Seller_API_*.md`），但缺少面向 Agent 的标准化 MCP 接口。构建 Ozon Seller API MCP Server 可让 Agent 通过工具调用完成商品上架、库存调价、订单发货等跟卖全链路任务，无需每次手写 HTTP 请求或翻阅冗长文档。

## What Changes

- 新增独立 MCP Server 包 `ozon-mcp/`（Python + MCP SDK），通过 stdio 接入 Cursor 等 IDE
- 复用 `OZON_CLIENT_ID` / `OZON_API_KEY` 环境变量鉴权，凭证仅存服务端，不暴露给前端
- 提供**高层语义工具**（Agent 友好）：商品、库存价格、订单、仓库、促销、财务、聊天等核心能力
- 提供**通用底层工具** `ozon_api_call`：按 path + body 调用任意 Ozon 端点，覆盖 263 个接口长尾需求
- 将参考文档注册为 MCP **Resources**，供 Agent 检索接口目录与业务流程
- 内置限流（50 req/s per Client-Id）与统一错误映射（401/403/429/5xx）
- 提供 Cursor MCP 配置示例（`.cursor/mcp.json` 或文档说明）
- **本阶段不包含**：Webhook 接收服务、多店铺凭证切换 UI、OAuth 流程

## Capabilities

### New Capabilities

- `ozon-mcp-server`: MCP Server 核心——stdio 传输、鉴权、HTTP 客户端、限流、错误处理、启动入口
- `ozon-mcp-catalog-tools`: 商品与类目工具（类目树、属性、创建/更新/查询商品、图片、归档）
- `ozon-mcp-inventory-tools`: 库存与价格工具（查询/更新库存、查询/更新价格）
- `ozon-mcp-order-tools`: 订单与物流工具（FBS/rFBS 列表、详情、备货、发货、取消、标签）
- `ozon-mcp-meta-tools`: 元数据与通用能力（卖家信息、API 角色、通用 `ozon_api_call`、接口目录 Resource）

### Modified Capabilities

（无 — 不修改既有 `ozon-seller-api-client` 规格；MCP 为独立包，可复用其实现模式但不改变后端 FastAPI 行为）

## Impact

- **新增目录**: `ozon-mcp/`（独立 Python 包，含 `pyproject.toml`、server 入口、tools、resources）
- **参考文档**: 读取 `reference/Ozon_Seller_API_精简架构文档.md` 与 `reference/Ozon_Seller_API_AI_阅读版.md` 生成工具描述与 Resource 索引
- **复用模式**: 对齐 `backend/src/services/ozon/client.py` 的鉴权头、错误码、base URL 约定
- **依赖**: 新增 `mcp`（官方 Python SDK）、复用 `httpx`
- **配置**: 用户需在 Cursor MCP 设置中注册 server；环境变量与 `backend/.env` 共用 `OZON_CLIENT_ID`、`OZON_API_KEY`
- **外部系统**: Ozon Seller API（`https://api-seller.ozon.ru`），遵守后端到后端调用限制（禁止浏览器直连）
