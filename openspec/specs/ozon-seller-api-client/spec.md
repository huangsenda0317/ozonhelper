## Purpose

封装 Ozon Seller API HTTP 客户端，为店铺 ERP 同步与 Phase2 业务（改价、刊登、履约、财务）提供统一鉴权与端点调用。
## Requirements
### Requirement: Ozon Seller API 客户端统一鉴权

后端 SHALL 提供 `OzonSellerClient`，向 `Settings.ozon_api_base_url`（默认 `https://api-seller.ozon.ru`）发起请求，每个请求 MUST 携带 HTTP 头 `Client-Id` 与 `Api-Key`。

客户端 MUST 通过 Store 记录构造：
- `OzonSellerClient.from_credentials(client_id, api_key)`：绑定店铺时校验凭证
- `OzonSellerClient.from_store(store)`：从 `Store` 模型解密凭证（运行时首选）

凭证 MUST NOT 从环境变量 `OZON_CLIENT_ID` / `OZON_API_KEY` 读取。

#### Scenario: 从 Store 构造客户端

- **WHEN** 调用 `ozon_client_for_store(store)` 且 store 凭证有效
- **THEN** 客户端使用 store 的 client_id 与解密后的 api_key 发起请求

#### Scenario: 凭证未配置

- **WHEN** 用户尚未绑定店铺或凭证为空
- **THEN** 调用方收到 `503` 或 `404`，错误码 `OZON_NOT_CONFIGURED` 或 `STORE_NOT_BOUND`

### Requirement: 封装库存端点

`OzonSellerClient` SHALL 提供：
- `product_stocks_info(...)` → `POST /v4/product/info/stocks`
- `update_stocks(stocks)` → `POST /v2/products/stocks`

#### Scenario: 查询库存

- **WHEN** 传入 product_id 列表
- **THEN** 返回各 SKU 的 present、reserved 等库存字段

### Requirement: 封装订单端点

`OzonSellerClient` SHALL 提供：
- `posting_fbs_list(...)` → `POST /v4/posting/fbs/list`
- `posting_fbo_list(...)` → `POST /v3/posting/fbo/list`

#### Scenario: 拉取 FBS 订单

- **WHEN** 调用 posting_fbs_list 且 since 为 24 小时前
- **THEN** 返回该时间范围内的 FBS 订单列表

### Requirement: 封装 Analytics 端点

`OzonSellerClient` SHALL 提供：
- `analytics_data(...)` → `POST /v1/analytics/data`

#### Scenario: 拉取日级销量

- **WHEN** 请求 metrics 含 ordered_units、date_from/date_to 为 7 天
- **THEN** 返回按日聚合的数据点

### Requirement: 封装商品归档端点

`OzonSellerClient` SHALL 提供：
- `product_archive(product_ids)` → `POST /v1/product/archive`
- `product_unarchive(product_ids)` → `POST /v1/product/unarchive`

#### Scenario: 批量归档

- **WHEN** 传入 product_id 列表调用 product_archive
- **THEN** Ozon 接受请求并返回结果

### Requirement: 卖家信息校验

`OzonSellerClient` SHALL 提供：
- `seller_info()` → `POST /v1/seller/info`，用于店铺绑定时验证凭证

#### Scenario: 校验有效凭证

- **WHEN** client_id 与 api_key 有效
- **THEN** 返回卖家信息且无异常

### Requirement: 内置限流

客户端 SHALL 内置 per-Client-Id 请求频率控制，遇 429 时指数退避重试。

#### Scenario: 限流保护

- **WHEN** 短时间内大量请求
- **THEN** 客户端排队等待而非立即发送

### Requirement: 封装改价端点

`OzonSellerClient` SHALL 提供：
- `price_import(prices[])` → `POST /v2/product/import/prices` 或官方等价 `product/price/import` 路径

#### Scenario: 批量改价

- **WHEN** 传入 10 条 offer_id + price
- **THEN** Ozon 接受改价请求

### Requirement: 封装刊登端点

`OzonSellerClient` SHALL 提供：
- `product_import(items[])` → `POST /v2/product/import`
- `product_import_info(task_id)` → 查询 import 任务状态

#### Scenario: 提交刊登

- **WHEN** 调用 product_import 含 1 条有效商品
- **THEN** 返回 task_id 供轮询

### Requirement: 封装履约端点

`OzonSellerClient` SHALL 提供：
- `posting_fbs_ship(posting_number, ...)` → FBS 发货
- `posting_tracking(posting_number)` → 物流轨迹（路径以 Ozon 文档为准）

#### Scenario: FBS 发货

- **WHEN** 传入有效 posting_number 与 tracking_number
- **THEN** Ozon 更新订单为已发货

### Requirement: 封装财务端点

`OzonSellerClient` SHALL 提供：
- `finance_transaction_list(since, ...)` → 财务交易列表
- `returns_list(since, ...)` → 退货/退款列表（若 API 可用）

#### Scenario: 拉取交易

- **WHEN** since 为 7 天前
- **THEN** 返回该范围内交易记录

