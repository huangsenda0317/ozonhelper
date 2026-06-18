## Purpose

定义经营看板 KPI、销售趋势与 Phase2 财务摘要的数据契约与前端展示要求。
## Requirements
### Requirement: 概览 KPI API

后端 SHALL 提供 `GET /api/v1/tracking/dashboard?store_id=`，返回当前店铺经营概览：

- `total_products`：同步商品总数
- `orders_today` / `orders_week` / `orders_month`：订单数
- `units_sold_today` / `units_sold_week` / `units_sold_month`：销量
- `conversion_rate`：整体转化率
- `last_synced_at`：最近同步时间
- `alert_counts`：低库存、超时订单、异常商品、**物流预警**、**差评**、**价格异常**数量
- `revenue_month`、`fees_month`、`gross_profit_month`：财务 KPI（有 finance 同步数据时）

#### Scenario: 看板数据加载

- **WHEN** 已登录用户请求 dashboard 且 store 有效
- **THEN** 返回上述 KPI 字段，响应时间 < 2s（读本地 DB）

#### Scenario: 无同步数据

- **WHEN** 店铺从未同步
- **THEN** KPI 数值为 0，含 `sync_required: true` 提示

### Requirement: 销售趋势 API

后端 SHALL 提供 `GET /api/v1/tracking/dashboard/trends?store_id=&range=7|30` 返回按日聚合的：
- `date`、`orders`、`units_sold`、`revenue`（可选）

数据来源为 `analytics_daily` 本地缓存表。

#### Scenario: 7 天趋势

- **WHEN** 用户选择 7 天范围
- **THEN** 返回最近 7 个自然日的数据点数组

### Requirement: 概览看板页面

前端 SHALL 在 `/tracking` 展示：
- KPI 卡片行（商品数、今日/本周/本月订单与销量、转化率、**本月回款/毛利**）
- 销售趋势 **ECharts 图表**（销量/营收切换，折线/柱图切换，7/30 天范围切换）
- 预警摘要卡片（低库存、超时订单、异常商品、**物流**、**差评**、**价格异常**），点击跳转 `/tracking/alerts`
- 「立即同步」按钮（由 TrackingShell 提供）

#### Scenario: 看板渲染

- **WHEN** 用户进入 `/tracking` 且已有同步数据
- **THEN** 3 秒内完成 KPI 与 ECharts 趋势图渲染

#### Scenario: 同步进行中

- **WHEN** 用户点击「立即同步」
- **THEN** 按钮进入 loading 状态，完成后刷新 KPI 与 `last_synced_at`

#### Scenario: 趋势图范围切换

- **WHEN** 用户点击 7 天或 30 天按钮
- **THEN** 重新请求 trends API 并更新 ECharts 数据，图表类型与指标选择不变

#### Scenario: 财务 KPI 展示

- **WHEN** finance 数据已同步
- **THEN** 看板展示 revenue_month 与 gross_profit_month 卡片

