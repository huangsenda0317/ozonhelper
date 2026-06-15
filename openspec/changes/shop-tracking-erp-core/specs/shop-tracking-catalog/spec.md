## ADDED Requirements

### Requirement: 商品本地同步索引

系统 SHALL 通过 Celery 任务将 Ozon 商品同步至 `synced_products` 表，字段至少含：
`store_id`、`product_id`、`offer_id`、`sku`、`name`、`price`、`currency`、`stock_present`、`status_name`、`visibility`、`is_exception`、`exception_reason`、`primary_image_url`、`ordered_units`、`hits_view`、`conversion_rate`、`synced_at`。

#### Scenario: 增量同步

- **WHEN** 定时任务执行且店铺有已同步记录
- **THEN** 使用游标分页更新/插入变更商品，更新 `synced_at`

### Requirement: 商品列表读本地索引

`GET /api/v1/tracking/products` SHALL 默认从 `synced_products` 查询，保留原有 Query 参数（search、visibility、status、has_stock、sort_by、sort_order、page、limit），并新增：
- `is_exception`（boolean）：筛选异常商品
- `store_id`（必填或默认活跃店铺）

响应每条摘要 MUST 额外包含：`ordered_units`、`hits_view`、`conversion_rate`、`synced_at`、`is_exception`。

#### Scenario: 按销量排序

- **WHEN** 用户请求 `sort_by=ordered_units&sort_order=desc`
- **THEN** 按本地缓存销量降序返回（FR-034）

#### Scenario: 筛选异常商品

- **WHEN** 用户请求 `is_exception=true`
- **THEN** 仅返回审核驳回、违规下架等异常标记商品

### Requirement: 异常商品自动标记

同步任务 SHALL 根据 Ozon 返回状态自动设置 `is_exception=true` 及 `exception_reason`：
- 审核未通过（`is_created=false` 且含 errors）
- 非 ARCHIVED 的 INVISIBLE 状态
- 信息缺失（必填属性为空）

#### Scenario: 审核驳回标记

- **WHEN** Ozon 返回商品含 validation errors
- **THEN** `is_exception=true`，`exception_reason` 含首条错误信息

### Requirement: 批量上下架

后端 SHALL 提供 `POST /api/v1/tracking/products/batch-visibility`，Body 含 `product_ids[]`、`action`（`archive` | `unarchive`），调用 Ozon 对应 API 并更新本地索引。

#### Scenario: 批量下架

- **WHEN** 用户选择 5 个商品并执行 archive
- **THEN** 返回成功/失败明细，成功项本地 `visibility` 更新

### Requirement: 商品中心页面

前端 SHALL 在 `/tracking/products` 提供 MVP 列表能力并扩展：
- 销售指标列（销量、浏览量、转化率）
- 异常商品筛选 Tab
- 批量选择与批量上下架操作
- 同步时间戳与「刷新」按钮
- 多选后批量操作栏

#### Scenario: 批量下架 UI

- **WHEN** 用户勾选 3 个商品并点击「批量下架」
- **THEN** 确认后调用 API，列表刷新显示更新状态

### Requirement: 商品详情扩展

`/tracking/products/{id}` SHALL 展示销售指标、异常原因、`synced_at`，并提供「实时刷新」拉取最新 Ozon 数据。

#### Scenario: 详情页销售指标

- **WHEN** 用户打开已同步商品详情
- **THEN** 展示销量、浏览量、转化率及最后同步时间
