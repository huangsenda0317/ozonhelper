## Requirements

### Requirement: DeepSeek 与 GLM 配置

后端 Settings SHALL 从环境变量 `DEEPSEEK_API_KEY` 读取 DeepSeek API 密钥；可选从 `GLM_API_KEY` 读取智谱密钥。使用 DeepSeek 模型时未配置 `DEEPSEEK_API_KEY` 返回 `503`，错误码 `DEEPSEEK_NOT_CONFIGURED`。

#### Scenario: DeepSeek 密钥已配置

- **WHEN** `DEEPSEEK_API_KEY` 非空且用户选择 DeepSeek 模型发起聊天
- **THEN** 后端可向 `https://api.deepseek.com/chat/completions` 发起调用

#### Scenario: DeepSeek 密钥缺失

- **WHEN** `DEEPSEEK_API_KEY` 未设置且请求 DeepSeek 模型
- **THEN** 返回 HTTP 503，body 含 `DEEPSEEK_NOT_CONFIGURED` 及配置提示

### Requirement: 流式聊天 API

系统 SHALL 提供 `POST /api/v1/ai/chat`，接受 JSON：`store_id`（必填）、`model`（可选，默认 `deepseek-v4-flash`）、`messages`（对话历史数组）。响应为 `text/event-stream` SSE 流。

#### Scenario: 成功发起对话

- **WHEN** 已登录用户提交有效 `store_id` 与至少一条 user 消息
- **THEN** 返回 SSE 流，依次可能包含 `think_delta`、`think_done`、`tool_start`、`tool_end`、`delta`、`done` 事件

#### Scenario: 店铺不属于用户

- **WHEN** `store_id` 不存在或不属于当前用户
- **THEN** 返回 HTTP 404，错误码 `STORE_NOT_FOUND`

#### Scenario: 店铺未绑定 Ozon 凭证

- **WHEN** 店铺 `client_id` 或 `api_key` 为空
- **THEN** 返回 HTTP 503，错误码 `OZON_NOT_CONFIGURED`

### Requirement: 按店铺注入 Ozon 凭证

聊天服务 SHALL 根据 `store_id` 解密店铺凭证，为本次请求构造 Ozon HTTP 客户端；MUST NOT 使用环境变量 `OZON_CLIENT_ID` / `OZON_API_KEY` 作为运行时凭证。

#### Scenario: 使用店铺凭证调用工具

- **WHEN** 模型触发 `get_seller_info` 工具
- **THEN** 请求携带该店铺的 `Client-Id` 与 `Api-Key` 发往 Ozon API

### Requirement: Ozon 只读工具注册

聊天服务 SHALL 注册至少以下 Function Calling 工具：`get_seller_info`、`get_product_list`、`get_product_stocks`、`get_fbs_unfulfilled_orders`、`get_fbs_orders`、`list_warehouses`、`ozon_api_call`。单次对话 tool 调用轮次 MUST ≤ 5。

#### Scenario: 查询卖家信息

- **WHEN** 用户问「我的店铺信息是什么」且模型选择 `get_seller_info`
- **THEN** 工具返回 Ozon 卖家 JSON，助手基于结果生成自然语言答复

#### Scenario: 超过工具调用上限

- **WHEN** 单次对话已执行 5 次 tool 调用仍未结束
- **THEN** 停止继续调用工具，助手基于已有信息作答或提示用户缩小问题范围

### Requirement: 模型选择

API SHALL 接受 `model` 参数，允许值至少包含：`deepseek-v4-flash`、`deepseek-v4-pro`（可选 `glm-4.7-flash`）。非法值返回 `400 VALIDATION_ERROR`。

#### Scenario: 使用默认模型

- **WHEN** 请求未传 `model`
- **THEN** 使用 `deepseek-v4-flash` 调用 DeepSeek API

#### Scenario: 指定 pro 模型

- **WHEN** 请求 `model` 为 `deepseek-v4-pro`
- **THEN** 请求体 `model` 字段为 `deepseek-v4-pro`

### Requirement: 鉴权

`POST /api/v1/ai/chat` MUST 要求有效 JWT，与现有 AI 端点一致。

#### Scenario: 未登录访问

- **WHEN** 请求无有效 Authorization
- **THEN** 返回 HTTP 401
