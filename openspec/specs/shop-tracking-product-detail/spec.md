## Requirements

### Requirement: 在线商品详情 API

后端 SHALL 提供 `GET /api/v1/tracking/products/{product_id}`，需 JWT 认证。`product_id` 为 Ozon 数字 product_id。接受 `store_id` Query 参数。

默认从 `synced_products` 读取；`?realtime=true` 时实时调用 Ozon `product/info/list`。

响应 MUST 返回 `ApiResponse[TrackingProductDetail]`，至少包含：
- 标识：`product_id`、`offer_id`、`sku`
- 基本信息：`name`、`barcode`（若有）
- 价格：`price`、`old_price`、`min_price`、`currency`
- 库存：`stock_present`、`stock_reserved`、`has_stock`
- 状态：`status_name`、`status_description`、`moderate_status`、`validation_status`
- 媒体：`primary_image`、`images`（URL 数组）
- 时间：`created_at`、`updated_at`
- 外链：`ozon_url`
- 销售指标：`ordered_units`、`hits_view`、`conversion_rate`
- 异常：`is_exception`、`exception_reason`
- 同步：`synced_at`

#### Scenario: 成功获取详情

- **WHEN** 已登录用户请求存在的 `product_id`
- **THEN** 返回 200 及完整商品详情 JSON

#### Scenario: 实时刷新

- **WHEN** 用户请求 `?realtime=true`
- **THEN** 从 Ozon 拉取最新数据

#### Scenario: 商品不存在

- **WHEN** 请求的 `product_id` 在店铺中不存在
- **THEN** 返回 404，错误码 `PRODUCT_NOT_FOUND`

### Requirement: 店铺跟踪商品详情页

前端 SHALL 在 `/tracking/products/[productId]` 提供商品详情页，包含：
- 返回列表链接（指向 `/tracking/products`）
- 主图与图片画廊
- 基本信息区（名称、Offer ID、SKU、状态）
- 价格与库存区
- 销售指标区（销量、浏览量、转化率）
- 异常原因展示（若 is_exception）
- 同步时间戳与「实时刷新」按钮
- Ozon 前台链接（新标签打开）

#### Scenario: 从列表进入详情

- **WHEN** 用户在列表页点击某商品
- **THEN** 导航至 `/tracking/products/{product_id}` 并展示该商品详情

#### Scenario: 加载失败

- **WHEN** API 返回 404 或 Ozon 错误
- **THEN** 展示错误提示及「返回列表」按钮
