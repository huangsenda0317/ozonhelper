## Why

店铺跟踪概览页（`/tracking`）的销售趋势目前使用 CSS 伪柱状图占位，缺少真实图表交互（Tooltip、坐标轴、图例）且无法切换柱图对比。用户已安装 ECharts，需要以专业图表替换占位实现，提升数据可读性与分析体验。

## What Changes

- 新增可复用 `SalesTrendChart` 组件，基于 **ECharts** 渲染销售趋势
- 默认 **折线图** 展示 `units_sold`（销量），支持切换为 **柱状图**
- 保留现有 **7 天 / 30 天** 范围切换，复用 `GET /api/v1/tracking/dashboard/trends` 数据，**无后端 API 变更**
- 图表样式对齐 OzonHelper 设计系统（accent-violet 主色、暗色模式适配）
- 移除 `SimpleTrendChart` 占位组件
- 在 `frontend/package.json` 添加 `echarts` 依赖（若尚未安装至 frontend 子项目）

## Capabilities

### New Capabilities

- `shop-tracking-trend-chart`：ECharts 销售趋势图表组件（折线/柱图切换、响应式、空状态、主题色）

### Modified Capabilities

- `shop-tracking-dashboard`：概览看板「销售趋势」区块从占位柱状图升级为 ECharts 交互图表

## Impact

- **前端**：`frontend/src/app/tracking/page.tsx`、`frontend/src/components/features/`（新图表组件）、`frontend/package.json`
- **后端**：无变更（`TrendPoint` 与 trends API 已就绪）
- **依赖**：`echarts`（frontend）；根目录 `package.json` 已有 echarts 但不影响 Next.js 应用，需在 frontend 独立安装
