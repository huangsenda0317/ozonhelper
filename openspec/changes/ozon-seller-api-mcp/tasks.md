## 1. 项目脚手架

- [x] 1.1 创建 `ozon-mcp/` 目录结构（`src/ozon_mcp/`、`tools/`）及 `pyproject.toml`（依赖 `mcp`、`httpx`、`pydantic`、`pydantic-settings`）
- [x] 1.2 配置 `[project.scripts]` 入口 `ozon-mcp = "ozon_mcp.server:main"`
- [x] 1.3 添加 `ozon-mcp/README.md`：环境变量说明、Cursor MCP 配置示例、快速验证步骤

## 2. 核心基础设施（ozon-mcp-server）

- [x] 2.1 实现 `config.py`：`OZON_CLIENT_ID`、`OZON_API_KEY`、`OZON_API_BASE_URL`（pydantic-settings）
- [x] 2.2 实现 `client.py`：`OzonApiClient._post` / `_get`，对齐 backend 鉴权头、30s 超时、JSON 解析
- [x] 2.3 实现 `errors.py`：结构化错误 `OZON_NOT_CONFIGURED`、`OZON_AUTH_FAILED`、`OZON_RATE_LIMIT`、`OZON_API_ERROR`
- [x] 2.4 实现 `rate_limiter.py`：令牌桶 50 req/s per Client-Id
- [x] 2.5 实现 `server.py`：MCP stdio 启动、`initialize` 握手、注册 tools 与 resources

## 3. MCP Resources 与 API 索引

- [x] 3.1 实现 `scripts/parse_ozon_api_html.py`：从 `reference/Ozon Seller API 文件.html` 解析 263 端点
- [x] 3.2 生成 `data/api-index.json`（path、method、title、request_fields、request_example）
- [x] 3.3 实现 `api_index.py`：加载索引、按 path 查询、关键词搜索
- [x] 3.4 实现 `resources.py`：嵌入精简架构 MD 为 `ozon://api/overview`
- [x] 3.5 从 AI 阅读版提取端点清单为 `ozon://api/endpoints`
- [x] 3.6 提取核心业务流程（§6）为 `ozon://api/workflows`

## 4. 商品与类目工具（ozon-mcp-catalog-tools）

- [x] 4.1 实现 `tools/catalog.py`：`get_category_tree`、`get_category_attributes`、`get_attribute_values`
- [x] 4.2 实现 `import_products`、`get_import_status`（含 items ≤100 校验）
- [x] 4.3 实现 `get_product_list`、`get_product_info`、`import_product_pictures`、`archive_product`、`unarchive_product`
- [x] 4.4 为每个 tool 编写 description（含 Ozon path）与 inputSchema

## 5. 库存与价格工具（ozon-mcp-inventory-tools）

- [x] 5.1 实现 `tools/inventory.py`：`get_product_stocks`、`get_fbs_stocks_by_warehouse`、`update_stocks`
- [x] 5.2 实现 `get_product_prices`、`update_prices`
- [x] 5.3 在 server 中注册 inventory tools

## 6. 订单与物流工具（ozon-mcp-order-tools）

- [x] 6.1 实现 `tools/orders.py`：`get_fbs_unfulfilled_orders`、`get_fbs_orders`、`get_fbs_order`
- [x] 6.2 实现 `ship_fbs_order`、`print_package_label`、`mark_awaiting_delivery`、`cancel_fbs_order`
- [x] 6.3 实现 rFBS 工具：`set_tracking_number`、`mark_delivering`、`mark_delivered`
- [x] 6.4 在 server 中注册 order tools

## 7. 元数据与通用工具（ozon-mcp-meta-tools）

- [x] 7.1 实现 `tools/meta.py`：`get_seller_info`、`get_api_roles`、`list_warehouses`
- [x] 7.2 实现财务工具：`get_transaction_list`、`get_realization_report`
- [x] 7.3 实现聊天工具：`list_chats`、`get_chat_history`、`send_chat_message`
- [x] 7.4 实现 `get_endpoint_schema(path)`：从 api-index 返回参数 schema 与请求范例
- [x] 7.5 实现 `ozon_api_call`（path/method/body 通用调用，含 path 校验）
- [x] 7.6 实现 `search_endpoints`（基于 api-index 的关键词搜索）

## 8. 集成与验证

- [x] 8.1 本地运行 `ozon-mcp`，确认 stdio 进程不崩溃
- [ ] 8.2 使用 MCP Inspector 或 Cursor 注册 server，验证 tools 列表可见
- [ ] 8.3 调用 `get_seller_info` 与 `ozon_api_call(path="/v1/roles")` 验证真实 API 连通
- [x] 8.4 验证凭证缺失、限流、401 错误的结构化返回

## 9. 文档收尾

- [x] 9.1 在 README 中记录推荐 Agent 工作流（read Resource → get_endpoint_schema → 语义 tool / ozon_api_call）
- [x] 9.2 列出已实现语义工具与 Ozon path 对照表
