## ADDED Requirements

### Requirement: Ozon Seller API 客户端统一鉴权

后端 SHALL 提供 `OzonSellerClient`，使用 `Settings.ozon_client_id` 与 `Settings.ozon_api_key` 向 `Settings.ozon_api_base_url`（默认 `https://api-seller.ozon.ru`）发起请求，每个请求 MUST 携带 HTTP 头 `Client-Id` 与 `Api-Key`。

#### Scenario: 凭证已配置时成功发起请求

- **WHEN** `.env` 中已设置有效的 `OZON_CLIENT_ID` 与 `OZON_API_KEY`
- **THEN** 客户端可向 Ozon API 发送 POST 请求并收到 JSON 响应

#### Scenario: 凭证未配置

- **WHEN** `ozon_client_id` 或 `ozon_api_key` 为空
- **THEN** 调用方收到 `503` 错误，错误码 `OZON_NOT_CONFIGURED`，提示用户配置环境变量

### Requirement: 封装商品列表与详情 Ozon 端点

`OzonSellerClient` SHALL 提供：
- `product_list(filter, last_id, limit)` → 调用 `POST /v3/product/list`
- `product_info_list(product_ids)` → 调用 `POST /v3/product/info/list`，单次最多 1000 个 product_id

#### Scenario: 获取商品 ID 列表

- **WHEN** 调用 `product_list` 且 `filter.visibility` 为 `ALL`
- **THEN** 返回 Ozon 响应中的 `result.items`（含 product_id、offer_id）及 `result.last_id` 游标

#### Scenario: 批量获取商品详情

- **WHEN** 调用 `product_info_list` 并传入 20 个 product_id
- **THEN** 返回 Ozon 响应中的 `items` 数组，每项含 name、prices、stocks、statuses、images 等字段

### Requirement: Ozon API 错误映射

客户端 SHALL 将 Ozon HTTP 错误映射为应用层异常：
- 401/403 → `OZON_AUTH_FAILED`
- 429 → `OZON_RATE_LIMIT`
- 5xx 或网络超时 → `OZON_API_ERROR`

#### Scenario: API Key 无效

- **WHEN** Ozon 返回 HTTP 403
- **THEN** 抛出 `AppException`，code 为 `OZON_AUTH_FAILED`，message 提示检查 Client-Id 与 Api-Key

#### Scenario: 请求超时

- **WHEN** httpx 请求超过 30 秒无响应
- **THEN** 抛出 `AppException`，code 为 `OZON_API_ERROR`，message 提示 Ozon 服务暂不可用
