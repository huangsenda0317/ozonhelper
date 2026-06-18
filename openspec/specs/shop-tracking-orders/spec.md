## Purpose

定义 FBS/FBO 订单同步、列表展示与 Phase2 履约操作（发货、导出、备注）能力。
## Requirements
### Requirement: 订单增量同步

系统 SHALL 通过同步任务同步 FBS 与 FBO 订单至 `synced_orders` 表，字段至少含：
`store_id`、`posting_number`、`order_id`、`status`、`fulfillment_type`（FBS/FBO）、`created_at`、`shipment_date`、`products[]`、`is_overdue`、`synced_at`、**`packed_at`**、**`shipped_at`**、**`last_tracking_at`**、**`delivered_at`**、**`tracking_status`**、**`tracking_events`**（JSONB）、**`seller_note`**。

增量同步 MUST 使用 `since` 参数基于上次同步时间点。

#### Scenario: FBS 订单同步

- **WHEN** 订单同步任务执行
- **THEN** 拉取 FBS 列表并 upsert 本地记录

#### Scenario: FBO 订单同步

- **WHEN** 订单同步任务执行
- **THEN** 拉取 FBO 列表并 upsert 本地记录

### Requirement: 订单列表 API

后端 SHALL 提供 `GET /api/v1/tracking/orders?store_id=`，支持：
- `status`：待打包、待发货、已签收、已取消等归类
- `fulfillment_type`：FBS / FBO / ALL
- `is_overdue`（boolean）
- `date_from`、`date_to`
- 分页与排序（created_at desc）

#### Scenario: 筛选超时未发货

- **WHEN** 用户请求 `is_overdue=true`
- **THEN** 返回超过配置天数仍未发货的 FBS 订单

### Requirement: 订单超时判定

系统 SHALL 对 FBS 订单在「待发货」状态下，若 `created_at` 距今超过 `order_overdue_hours`（默认 48，可配置）则标记 `is_overdue=true`。

#### Scenario: 超时标记

- **WHEN** 订单创建 50 小时前且仍为待发货
- **THEN** `is_overdue=true`

### Requirement: 订单中心页面

前端 SHALL 在 `/tracking/orders` 提供：
- 状态 Tab 筛选（全部、待打包、待发货、已签收、取消、**售后**）
- FBS/FBO 切换
- 超时订单高亮（标红 + 图标）
- 订单卡片/表格：订单号、商品摘要、金额、状态、创建时间
- **FBS 发货操作**（运单号录入）
- **批量导出、批量备注**
- **物流轨迹时间线**（有 tracking_events 时）
- **面单外链**（跳转 Ozon）

#### Scenario: 超时订单高亮

- **WHEN** 列表含 is_overdue 订单
- **THEN** 该行以警告样式展示

#### Scenario: 空店铺引导

- **WHEN** 无订单且从未同步
- **THEN** 展示「立即同步订单」引导

#### Scenario: FBS 发货入口

- **WHEN** 用户查看待发货 FBS 订单
- **THEN** 展示「发货」按钮打开运单表单

