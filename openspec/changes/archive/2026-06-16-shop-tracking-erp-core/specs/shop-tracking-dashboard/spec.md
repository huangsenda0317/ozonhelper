## ADDED Requirements

### Requirement: 概览 KPI API

后端 SHALL 提供 `GET /api/v1/tracking/dashboard?store_id=`，返回当前店铺经营概览（FR-033）：

- `total_products`：同步商品总数
- `orders_today` / `orders_week` / `orders_month`：订单数
- `units_sold_today` / `units_sold_week` / `units_sold_month`：销量
- `conversion_rate`：整体转化率（analytics 缓存或订单/浏览量计算）
- `last_synced_at`：最近同步时间
- `alert_counts`：低库存、超时订单、异常商品数量

#### Scenario: 看板数据加载

- **WHEN** 已登录用户请求 dashboard 且 store 有效
- **THEN** 返回上述 KPI 字段，响应时间 < 2s（读本地 DB）

#### Scenario: 无同步数据

- **WHEN** 店铺从未同步
- **THEN** KPI 数值为 0，含 `sync_required: true` 提示

### Requirement: 销售趋势 API

后端 SHALL 在同端点或 `GET /api/v1/tracking/dashboard/trends?store_id=&range=7|30` 返回按日聚合的：
- `date`、`orders`、`units_sold`、`revenue`（可选）

数据来源为 `analytics_daily` 本地缓存表（FR-037 基础版）。

#### Scenario: 7 天趋势

- **WHEN** 用户选择 7 天范围
- **THEN** 返回最近 7 个自然日的数据点数组

### Requirement: 概览看板页面

前端 SHALL 在 `/tracking` 展示：
- KPI 卡片行（商品数、今日/本周/本月订单与销量、转化率）
- 销售趋势折线图（7/30 天切换）
- 预警摘要卡片（低库存、超时订单、异常商品），点击跳转 `/tracking/alerts`
- 「立即同步」按钮

#### Scenario: 看板渲染

- **WHEN** 用户进入 `/tracking` 且已有同步数据
- **THEN** 3 秒内完成 KPI 与图表渲染

#### Scenario: 同步进行中

- **WHEN** 用户点击「立即同步」
- **THEN** 按钮进入 loading 状态，完成后刷新 KPI 与 `last_synced_at`
