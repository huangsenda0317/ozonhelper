## Requirements

### Requirement: 在线商品列表 API

后端 SHALL 提供 `GET /api/v1/tracking/products`，需 JWT 认证，返回指定 `store_id` 店铺下的在线商品列表（默认读 `synced_products` 本地索引，支持 `?realtime=true` 强制走 Ozon 实时代理）。

支持的 Query 参数：
- `store_id`（可选，默认活跃店铺）
- `search`（可选）：按商品名称或 offer_id 模糊匹配（不区分大小写）
- `visibility`（可选，默认 `ALL`）
- `status`（可选）：按 `statuses.status_name` 筛选
- `has_stock`（可选，boolean）
- `is_exception`（可选，boolean）
- `sort_by`（可选，默认 `updated_at`）：`price` | `updated_at` | `name` | `ordered_units` | `hits_view`
- `sort_order`（可选，默认 `desc`）：`asc` | `desc`
- `page`（默认 1）、`limit`（默认 20，最大 100）
- `realtime`（可选，boolean）

响应 MUST 使用 `ApiResponse[list[TrackingProductSummary]]` 并含 `PaginationMeta`。

#### Scenario: 默认加载第一页商品

- **WHEN** 已登录用户请求 `GET /api/v1/tracking/products?page=1&limit=20`
- **THEN** 从本地索引返回最多 20 条商品摘要及分页 meta

#### Scenario: 关键词搜索

- **WHEN** 用户请求 `GET /api/v1/tracking/products?search=phone`
- **THEN** 返回名称或 offer_id 包含 "phone"（不区分大小写）的商品

#### Scenario: 筛选仅有库存商品

- **WHEN** 用户请求 `GET /api/v1/tracking/products?has_stock=true`
- **THEN** 返回 `stock_present > 0` 的商品

#### Scenario: 未登录拒绝访问

- **WHEN** 请求未携带有效 JWT
- **THEN** 返回 401 Unauthorized

### Requirement: 店铺跟踪列表页

前端 SHALL 在 `/tracking/products` 提供店铺跟踪列表页，包含：
- 页面标题「商品中心」
- 搜索框（debounce 300ms）
- 筛选面板（可见性、销售状态、库存有无、异常商品）
- 商品列表（缩略图、名称、价格、库存、状态、销量指标）
- 分页控件
- 批量选择与批量上下架
- 点击商品跳转 `/tracking/products/{product_id}`

#### Scenario: 页面正常加载

- **WHEN** 已登录用户访问 `/tracking/products` 且店铺已绑定
- **THEN** 展示商品列表，无 404

#### Scenario: 未绑定店铺

- **WHEN** 用户无已绑定店铺
- **THEN** 页面展示空状态，引导绑定店铺

#### Scenario: 空结果

- **WHEN** 筛选条件无匹配商品
- **THEN** 展示「暂无匹配商品」空状态
