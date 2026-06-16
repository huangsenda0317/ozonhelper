## 1. 依赖与基础

- [x] 1.1 在 `frontend/` 执行 `pnpm add echarts`，确认 `package.json` 含 echarts ^6.x
- [x] 1.2 运行 `pnpm type-check` 确认 TypeScript 编译通过

## 2. SalesTrendChart 组件

- [x] 2.1 新建 `frontend/src/components/features/SalesTrendChart.tsx`（client component）
- [x] 2.2 按需引入 echarts/core：LineChart、BarChart、Grid、Tooltip、CanvasRenderer
- [x] 2.3 实现 `chartType: 'line' | 'bar'` 切换与折线/柱图 setOption
- [x] 2.4 实现 Tooltip（日期、销量、订单数、revenue 可选）
- [x] 2.5 接入 `useTheme()`，light/dark 下轴/网格/系列颜色适配
- [x] 2.6 实现 resize 监听与 unmount dispose
- [x] 2.7 空数据时显示「暂无趋势数据」，不 init 图表

## 3. 看板页集成

- [x] 3.1 在 `frontend/src/app/tracking/page.tsx` 移除 `SimpleTrendChart`
- [x] 3.2 引入 `SalesTrendChart`，传入 `trends` 与 `loading` 状态
- [x] 3.3 在销售趋势卡片 header 保留 7/30 天切换，与折线/柱图切换控件并列布局
- [x] 3.4 切换 range 时重新 fetchTrends，保持 chartType 不变

## 4. 验证

- [x] 4.1 有同步数据的店铺：折线图、柱图、Tooltip、7/30 天切换正常
- [x] 4.2 无 trend 数据店铺：空状态文案显示
- [x] 4.3 切换 light/dark 主题后图表颜色可读
- [x] 4.4 浏览器窗口缩放后图表无布局溢出
