## ADDED Requirements

### Requirement: 卖家与账户信息工具

MCP SHALL 提供：
- `get_seller_info` → `POST /v1/seller/info`
- `get_api_roles` → `POST /v1/roles`

#### Scenario: 获取卖家信息

- **WHEN** Agent 调用 `get_seller_info`
- **THEN** 返回卖家名称、店铺状态等个人中心信息

#### Scenario: 检查 API 密钥权限

- **WHEN** Agent 调用 `get_api_roles`
- **THEN** 返回当前 Api-Key 的角色、方法列表及 `expires_at`

### Requirement: 仓库查询工具

MCP SHALL 提供：
- `list_warehouses` → `POST /v2/warehouse/list`

#### Scenario: 列出 FBS 仓库

- **WHEN** Agent 调用 `list_warehouses` 可选传入分页参数
- **THEN** 返回 `warehouse_id`、名称、状态等列表

### Requirement: 财务报告工具

MCP SHALL 提供：
- `get_transaction_list` → `POST /v3/finance/transaction/list`
- `get_realization_report` → `POST /v2/finance/realization`

#### Scenario: 查询交易流水

- **WHEN** Agent 传入日期范围与分页
- **THEN** 返回交易明细列表

#### Scenario: 获取销售报告

- **WHEN** Agent 传入 `month` 与 `year`
- **THEN** 返回商品销售实现报告

### Requirement: 聊天工具

MCP SHALL 提供：
- `list_chats` → `POST /v3/chat/list`
- `get_chat_history` → `POST /v3/chat/history`
- `send_chat_message` → `POST /v1/chat/send/message`

#### Scenario: 列出聊天会话

- **WHEN** Agent 调用 `list_chats` 带分页
- **THEN** 返回买家聊天列表

#### Scenario: 发送消息

- **WHEN** Agent 传入 `chat_id` 与 `text`
- **THEN** 消息发送成功并返回 message_id

### Requirement: 通用 Ozon API 调用工具

MCP SHALL 提供 `ozon_api_call`，参数为 `path`（必填，如 `/v3/product/import`）、`method`（默认 POST，支持 GET）、`body`（JSON 对象，可选）。

#### Scenario: 调用未封装端点

- **WHEN** Agent 传入 `path="/v1/actions/candidates"` 与对应 `body`
- **THEN** 返回该端点的原始 Ozon JSON 响应

#### Scenario: GET 请求

- **WHEN** Agent 传入 `path="/v1/actions"`、`method="GET"`
- **THEN** 返回 Ozon 活动清单

#### Scenario: 非法 path

- **WHEN** Agent 传入不以 `/v` 开头的 path
- **THEN** 返回参数校验错误，不发起 HTTP 请求

### Requirement: 端点 Schema 查询工具

MCP SHALL 提供 `get_endpoint_schema(path)`，从 `api-index.json`（由原始 HTML 解析生成）返回指定端点的 method、title、request_fields、request_example。

#### Scenario: 查询商品导入 schema

- **WHEN** Agent 传入 `path="/v3/product/import"`
- **THEN** 返回 POST 方法、中文标题、request_fields 及请求范例 JSON

#### Scenario: 未知 path

- **WHEN** Agent 传入不在索引中的 path
- **THEN** 返回错误提示，并建议使用 `search_endpoints` 搜索

### Requirement: 端点搜索工具

MCP SHALL 提供 `search_endpoints`，按关键词在 `api-index.json` 中搜索，返回匹配的 path、title、method。

#### Scenario: 关键词搜索

- **WHEN** Agent 传入 `query="退货"`
- **THEN** 返回包含「退货」的端点列表（path + title + method）
