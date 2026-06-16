## Context

- `/tracking` 看板已通过 `fetchTrends(storeId, range)` 拉取 `TrendPoint[]`（`date`, `orders`, `units_sold`, `revenue`）
- 当前 `SimpleTrendChart` 用 div 高度模拟柱形，无 Tooltip/坐标轴，ERP 规格要求「销售趋势折线图（7/30 天切换）」
- 原 ERP 设计文档提及 Recharts，本变更统一改用 **ECharts 6.x**（用户已安装）
- 设计系统主色：`accent-violet`（图表主系列），Financial Dashboard 风格

## Goals / Non-Goals

**Goals:**

- ECharts 折线图展示按日 `units_sold`，7/30 天切换
- 同一数据支持折线 ↔ 柱状图切换（Segmented 或 pill 按钮）
- Hover Tooltip 显示日期、销量、订单数（及 revenue 若有）
- 容器 resize 时图表自适应；切换 dark/light 主题时颜色同步
- 无数据时显示「暂无趋势数据」空状态

**Non-Goals:**

- 多指标双 Y 轴、订单/销量叠加对比（后续迭代）
- 后端 analytics 同步逻辑变更
- 其他页面（商品、库存）图表
- 导出图片 / 数据下钻

## Decisions

### 1. 封装独立 Client Component

**选择**：新建 `frontend/src/components/features/SalesTrendChart.tsx`，`"use client"` + `echarts/core` 按需引入（`LineChart`, `BarChart`, `GridComponent`, `TooltipComponent`, `LegendComponent`）。

**理由**：ECharts 依赖 DOM，必须在客户端初始化；独立组件便于看板复用与单测。

**备选**：Recharts — 项目 ERP 文档曾提及，但用户明确要求 ECharts 且已安装。

### 2. 图表类型切换

**选择**：组件内 `chartType: 'line' | 'bar'` state；切换时 `setOption` 更新 `series.type`，不重新请求 API。

**理由**：同一 `TrendPoint[]` 适用于两种类型，切换应瞬时完成。

### 3. 主题与颜色

**选择**：通过 `useTheme()` 读取 `resolvedTheme`，在 option 中设置：
- 折线/柱：`#7C3AED`（accent-violet）或 design token CSS 变量读取
- 网格/轴文字：`text-muted` 对应色
- Tooltip：surface-elevated 背景

**理由**：与现有 Tailwind 主题一致，避免图表在 dark mode 下不可读。

### 4. 生命周期与性能

**选择**：
- `useRef` 持有 DOM 与 `echarts.init` 实例
- `useEffect` 在 `data` / `chartType` / `theme` 变化时 `setOption`
- `ResizeObserver` 或 `window.resize` 调用 `chart.resize()`
- `useEffect` cleanup 中 `chart.dispose()`

**理由**：防止内存泄漏与 Next.js 严格模式下重复 init。

### 5. 依赖安装位置

**选择**：`pnpm add echarts` 在 **frontend/** 目录执行。

**理由**：Next.js 应用独立打包；根目录 `package.json` 的 echarts 属于其他 Vite 项目，不会被 frontend 解析。

## Risks / Trade-offs

- **[Risk] frontend 未安装 echarts** → 实施时第一步在 frontend 安装并 type-check
- **[Risk] SSR hydration** → 组件仅 client mount 后 init，容器设 min-height 避免布局跳动
- **[Risk] 空数据全 0** → 仍渲染图表但 Y 轴 minInterval=1；全空数组走空状态 UI
- **[Trade-off] 单系列仅销量** → 订单数仅在 Tooltip 展示，不增加第二条线（保持简洁）

## Migration Plan

1. frontend 安装 echarts
2. 新增 `SalesTrendChart`，看板页替换 `SimpleTrendChart`
3. 手动验证：7/30 天切换、折线/柱图切换、暗色模式、无数据店铺
4. 无数据库或 API 迁移；可独立部署前端

## Open Questions

- 是否在图表区增加「销量 / 订单数」指标切换？**当前版本：固定销量为主系列，订单在 Tooltip**
