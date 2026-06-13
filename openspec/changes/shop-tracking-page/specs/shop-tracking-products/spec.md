## ADDED Requirements

### Requirement: 在线商品列表 API

后端 SHALL 提供 `GET /api/v1/tracking/products`，需 JWT 认证，返回当前 `.env` 配置店铺下的在线商品列表。

支持的 Query 参数：
- `search`（可选）：按商品名称或 offer_id 模糊匹配（不区分大小写）
- `visibility`（可选，默认 `ALL`）：对应 Ozon `filter.visibility`（ALL / VISIBLE / INVISIBLE / ARCHIVED 等）
- `status`（可选）：按 Ozon `statuses.status_name` 筛选（如「Продается」/ 在售）
- `has_stock`（可选，boolean）：true 仅返回有库存，false 仅返回无库存
- `sort_by`（可选，默认 `updated_at`）：`price` | `updated_at` | `name`
- `sort_order`（可选，默认 `desc`）：`asc` | `desc`
- `page`（默认 1）、`limit`（默认 20，最大 100）

响应 MUST 使用 `ApiResponse[list[TrackingProductSummary]]` 并含 `PaginationMeta`（total、page、limit）。

每条摘要至少包含：`product_id`、`offer_id`、`sku`、`name`、`price`、`currency`、`stock_present`、`status_name`、`primary_image_url`、`updated_at`。

#### Scenario: 默认加载第一页商品

- **WHEN** 已登录用户请求 `GET /api/v1/tracking/products?page=1&limit=20`
- **THEN** 返回最多 20 条商品摘要及分页 meta

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

前端 SHALL 在 `/tracking` 提供店铺跟踪列表页，包含：
- 页面标题「店铺跟踪」
- 搜索框（debounce 300ms，placeholder「搜索商品名称或 Offer ID」）
- 筛选面板（可见性、销售状态、库存有无）
- 商品卡片列表（缩略图、名称、价格、库存、状态）
- 分页控件
- 点击商品跳转 `/tracking/{product_id}`

#### Scenario: 页面正常加载

- **WHEN** 已登录用户访问 `/tracking` 且后端凭证有效
- **THEN** 展示商品列表，无 404

#### Scenario: Ozon 凭证未配置

- **WHEN** 后端返回 `OZON_NOT_CONFIGURED`
- **THEN** 页面展示空状态，提示在 `backend/.env` 配置 `OZON_CLIENT_ID` 与 `OZON_API_KEY`

#### Scenario: 搜索触发刷新

- **WHEN** 用户在搜索框输入「test」并停止输入 300ms
- **THEN** 列表以 `search=test` 重新请求并更新结果

#### Scenario: 空结果

- **WHEN** 筛选条件无匹配商品
- **THEN** 展示「暂无匹配商品」空状态
