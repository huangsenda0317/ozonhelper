## Requirements

### Requirement: MCP Server stdio 启动

系统 SHALL 提供可执行入口 `ozon-mcp`，以 stdio 传输启动 MCP Server，并向客户端注册 tools 与 resources。

#### Scenario: 成功启动

- **WHEN** 用户执行 `uv run ozon-mcp` 且环境变量已配置
- **THEN** 进程阻塞于 stdio，响应 MCP `initialize` 握手并返回 server 名称与版本

#### Scenario: 凭证缺失

- **WHEN** `OZON_CLIENT_ID` 或 `OZON_API_KEY` 未设置
- **THEN** Server 仍可启动，但任意调用 Ozon 的 tool 返回错误码 `OZON_NOT_CONFIGURED` 及配置提示

### Requirement: Ozon HTTP 客户端统一鉴权

`OzonApiClient` SHALL 向 `OZON_API_BASE_URL`（默认 `https://api-seller.ozon.ru`）发起请求，每个请求 MUST 携带 HTTP 头 `Client-Id`、`Api-Key`、`Content-Type: application/json`。

#### Scenario: POST 请求成功

- **WHEN** 凭证有效且请求 path 与 body 正确
- **THEN** 返回 Ozon JSON 响应体

#### Scenario: 认证失败

- **WHEN** Ozon 返回 HTTP 401 或 403
- **THEN** 返回结构化错误，code 为 `OZON_AUTH_FAILED`

### Requirement: 限流保护

系统 SHALL 对同一 `Client-Id` 实施每秒最多 50 次 Ozon API 调用的进程内限流。

#### Scenario: 未超限

- **WHEN** 1 秒内调用次数 ≤ 50
- **THEN** 请求正常发往 Ozon

#### Scenario: 超限

- **WHEN** 1 秒内调用次数 > 50
- **THEN** tool 返回 `OZON_RATE_LIMIT`，message 提示稍后重试

### Requirement: Ozon API 错误映射

客户端 SHALL 将 Ozon HTTP 错误映射为统一结构：`OZON_AUTH_FAILED`（401/403）、`OZON_RATE_LIMIT`（429）、`OZON_API_ERROR`（其他 4xx/5xx 及网络超时）。

#### Scenario: 请求超时

- **WHEN** httpx 请求超过 30 秒无响应
- **THEN** 返回 `OZON_API_ERROR`，message 提示 Ozon 服务暂不可用

### Requirement: MCP Resources 注册

Server SHALL 注册至少三个 Resource：`ozon://api/overview`、`ozon://api/endpoints`、`ozon://api/workflows`，内容来自项目 `reference/Ozon_Seller_API_*.md`。

#### Scenario: 读取端点目录

- **WHEN** Agent 请求 resource `ozon://api/endpoints`
- **THEN** 返回按模块分类的 Ozon API 端点清单文本
