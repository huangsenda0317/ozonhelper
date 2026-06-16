## MODIFIED Requirements

### Requirement: 概览看板页面

前端 SHALL 在 `/tracking` 展示：
- KPI 卡片行（商品数、今日/本周/本月订单与销量、转化率）
- 销售趋势 **ECharts 图表**（折线/柱图切换，7/30 天范围切换）
- 预警摘要卡片（低库存、超时订单、异常商品），点击跳转 `/tracking/alerts`
- 「立即同步」按钮

#### Scenario: 看板渲染

- **WHEN** 用户进入 `/tracking` 且已有同步数据
- **THEN** 3 秒内完成 KPI 与 ECharts 趋势图渲染

#### Scenario: 同步进行中

- **WHEN** 用户点击「立即同步」
- **THEN** 按钮进入 loading 状态，完成后刷新 KPI 与 `last_synced_at`

#### Scenario: 趋势图范围切换

- **WHEN** 用户点击 7 天或 30 天按钮
- **THEN** 重新请求 trends API 并更新 ECharts 数据，图表类型选择不变

## REMOVED Requirements

### Requirement: CSS 占位趋势图

**Reason**: 已由 ECharts 交互图表替代，占位 div 柱形无 Tooltip 与坐标轴，不满足数据密集看板需求。

**Migration**: 删除 `SimpleTrendChart`，改用 `SalesTrendChart` 组件。
