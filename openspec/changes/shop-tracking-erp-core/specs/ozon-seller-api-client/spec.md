## MODIFIED Requirements

### Requirement: Ozon Seller API 客户端统一鉴权

后端 SHALL 提供 `OzonSellerClient`，向 `Settings.ozon_api_base_url`（默认 `https://api-seller.ozon.ru`）发起请求，每个请求 MUST 携带 HTTP 头 `Client-Id` 与 `Api-Key`。

客户端 MUST 支持两种构造方式：
- `OzonSellerClient.from_settings()`：读取 `Settings.ozon_client_id` / `ozon_api_key`（向后兼容）
- `OzonSellerClient.from_store(store)`：从 `Store` 模型解密凭证（多店铺首选）

#### Scenario: 从 Store 构造客户端

- **WHEN** 调用 `OzonSellerClient.from_store(store)` 且 store 凭证有效
- **THEN** 客户端使用 store 的 client_id 与解密后的 api_key 发起请求

#### Scenario: 凭证未配置

- **WHEN** settings 与 store 均无有效凭证
- **THEN** 调用方收到 `503` 错误，错误码 `OZON_NOT_CONFIGURED`

## ADDED Requirements

### Requirement: 封装库存端点

`OzonSellerClient` SHALL 提供：
- `product_stocks_info(product_ids, warehouse_type)` → `POST /v4/product/info/stocks`
- `update_stocks(items)` → `POST /v2/products/stocks`

#### Scenario: 查询库存

- **WHEN** 传入 100 个 product_id
- **THEN** 返回各 SKU 的 present、reserved 等库存字段

#### Scenario: 批量改库存

- **WHEN** 传入符合 Ozon 格式的 stocks 数组
- **THEN** 返回 Ozon 更新结果

### Requirement: 封装订单端点

`OzonSellerClient` SHALL 提供：
- `posting_fbs_list(filter, limit, offset)` → `POST /v3/posting/fbs/list`
- `posting_fbo_list(filter, limit, offset)` → `POST /v3/posting/fbo/list`

#### Scenario: 拉取 FBS 订单

- **WHEN** 调用 posting_fbs_list 且 since 为 24 小时前
- **THEN** 返回该时间范围内的 FBS 订单列表

### Requirement: 封装 Analytics 端点

`OzonSellerClient` SHALL 提供：
- `analytics_data(date_from, date_to, metrics, dimension)` → `POST /v1/analytics/data`

#### Scenario: 拉取日级销量

- **WHEN** 请求 metrics 含 ordered_units、date_from/date_to 为 7 天
- **THEN** 返回按日聚合的数据点

### Requirement: 封装商品归档端点

`OzonSellerClient` SHALL 提供：
- `product_archive(product_ids)` → 调用 Ozon 商品归档/下架 API
- `product_unarchive(product_ids)` → 调用 Ozon 商品恢复 API

#### Scenario: 批量归档

- **WHEN** 传入 5 个 product_id 调用 product_archive
- **THEN** Ozon 接受请求并返回任务/结果状态

### Requirement: 卖家信息校验

`OzonSellerClient` SHALL 提供：
- `seller_info()` → 调用卖家信息/权限校验 API，用于店铺绑定时验证凭证

#### Scenario: 校验有效凭证

- **WHEN** client_id 与 api_key 有效
- **THEN** 返回卖家信息且无异常

### Requirement: 内置限流

客户端 SHALL 内置 per-Client-Id 请求频率控制（默认 50 req/s），遇 429 时配合调用方指数退避。

#### Scenario: 限流保护

- **WHEN** 1 秒内发起超过 50 次请求
- **THEN** 客户端排队等待而非立即发送
