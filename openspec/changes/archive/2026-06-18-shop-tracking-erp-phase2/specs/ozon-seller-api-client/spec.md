## ADDED Requirements

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
