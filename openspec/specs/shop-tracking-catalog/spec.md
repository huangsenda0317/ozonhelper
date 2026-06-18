## Purpose

定义店铺 ERP 商品目录的本地同步、列表展示与异常筛选能力。
## Requirements
### Requirement: 商品本地同步索引

系统 SHALL 通过同步任务将 Ozon 商品同步至 `synced_products` 表，字段至少含：
`store_id`、`product_id`、`offer_id`、`sku`、`name`、`price`、`currency`、`stock_present`、`status_name`、`visibility`、`is_exception`、`exception_reason`、`primary_image_url`、`ordered_units`、`hits_view`、`conversion_rate`、`synced_at`。

#### Scenario: 增量同步

- **WHEN** 定时任务执行且店铺有已同步记录
- **THEN** 使用游标分页更新/插入变更商品，更新 `synced_at`

### Requirement: 商品列表读本地索引

`GET /api/v1/tracking/products` SHALL 默认从 `synced_products` 查询，保留 Query 参数（search、visibility、status、has_stock、sort_by、sort_order、page、limit），并支持：
- `is_exception`（boolean）：筛选异常商品
- `store_id`（默认活跃店铺）
- `realtime`（boolean）：强制走 Ozon 实时代理

响应每条摘要 MUST 额外包含：`ordered_units`、`hits_view`、`conversion_rate`、`synced_at`、`is_exception`。

#### Scenario: 按销量排序

- **WHEN** 用户请求 `sort_by=ordered_units&sort_order=desc`
- **THEN** 按本地缓存销量降序返回

#### Scenario: 筛选异常商品

- **WHEN** 用户请求 `is_exception=true`
- **THEN** 仅返回审核驳回、违规下架等异常标记商品

### Requirement: 异常商品自动标记

同步任务 SHALL 根据 Ozon 返回状态自动设置 `is_exception=true` 及 `exception_reason`。

#### Scenario: 审核驳回标记

- **WHEN** Ozon 返回商品含 validation errors
- **THEN** `is_exception=true`，`exception_reason` 含首条错误信息

### Requirement: 批量上下架

后端 SHALL 提供 `POST /api/v1/tracking/products/batch-visibility`，Body 含 `product_ids[]`、`action`（`archive` | `unarchive`），调用 Ozon 对应 API 并更新本地索引。

#### Scenario: 批量下架

- **WHEN** 用户选择 5 个商品并执行 archive
- **THEN** 返回成功/失败明细，成功项本地 `visibility` 更新

### Requirement: 商品中心页面

前端 SHALL 在 `/tracking/products` 提供：
- 列表列：图片、名称、SKU、价格、库存、销量、浏览量、转化率、状态、**保本价对比**
- Tab：全部 / 在售 / 下架 / 异常 / **价格异常**
- 批量选择与批量上下架
- 同步时间戳与「刷新」入口

#### Scenario: 价格异常 Tab

- **WHEN** 用户切换至价格异常 Tab
- **THEN** 列表仅展示 price_anomaly 商品且低于保本价标红

### Requirement: 价格异常筛选

`GET /api/v1/tracking/products` SHALL 支持 Query 参数 `price_anomaly`（boolean）：筛选当前价低于保本价的商品。

#### Scenario: 筛选价格异常商品

- **WHEN** 用户请求 `price_anomaly=true`
- **THEN** 返回售价低于 suggested_min_price 的商品列表

### Requirement: 刊登来源标记

`synced_products` SHALL 可选字段 `listing_job_id`；商品详情 API 响应 MAY 含 `source=listing|sync`。

#### Scenario: 刊登商品标识

- **WHEN** 商品由 listing job 创建且已同步
- **THEN** 商品详情展示「刊登来源」标签

