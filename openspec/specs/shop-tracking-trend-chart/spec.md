## Requirements

### Requirement: ECharts 销售趋势图表组件

前端 SHALL 提供 `SalesTrendChart` 客户端组件，接收 `TrendPoint[]`、`chartType`、`metric` 与 `loading` 可选 props，使用 ECharts 渲染销售趋势。

组件 MUST：
- 以 **折线图** 为默认展示类型
- X 轴为 `date`（格式化为 MM-DD 或 locale 短日期）
- Y 轴随指标切换：`units_sold`（销量，整数刻度）或 `revenue`（营收，₽ 金额）
- Tooltip 展示：日期、销量、订单数；若 `revenue` 非空则展示金额

#### Scenario: 有数据时渲染折线图

- **WHEN** 传入非空 `TrendPoint[]` 且默认 chartType 为 line、metric 为 units
- **THEN** 渲染带平滑折线与数据点的 ECharts 图表，高度不小于 240px

#### Scenario: 切换为柱状图

- **WHEN** 用户点击「柱图」切换控件
- **THEN** 同一数据集以柱状图重绘，无需重新请求 API

#### Scenario: 切换回折线图

- **WHEN** 用户在柱状图模式下点击「折线」
- **THEN** 图表恢复折线展示

#### Scenario: 切换销量与营收

- **WHEN** 用户点击「销量」或「营收」切换控件
- **THEN** Y 轴与主系列数据即时切换，无需重新请求 API；无营收数据时显示「暂无营收数据」

#### Scenario: 空数据

- **WHEN** 传入空数组
- **THEN** 不初始化 ECharts 实例，显示「暂无趋势数据」文案

### Requirement: 图表交互与响应式

组件 SHALL 支持 hover Tooltip、窗口/容器尺寸变化时自动 `resize`，并在 unmount 时 `dispose` 释放实例。

#### Scenario: Tooltip 悬停

- **WHEN** 用户鼠标悬停某一数据点
- **THEN** 显示该日期的销量、订单数与营收（若有）

#### Scenario: 容器尺寸变化

- **WHEN** 侧边栏折叠或视口宽度变化导致图表容器宽度改变
- **THEN** 图表在 300ms 内自适应新宽度，无溢出或截断

### Requirement: 主题适配

图表颜色与文字 MUST 随应用 light/dark 主题切换，轴标签与网格线在两种模式下均清晰可读。

#### Scenario: 暗色模式

- **WHEN** `resolvedTheme` 为 `dark`
- **THEN** 图表背景透明、轴标签使用浅色、主系列使用 accent-violet 色系

#### Scenario: 浅色模式

- **WHEN** `resolvedTheme` 为 `light`
- **THEN** 轴标签使用深色 muted 色，主系列颜色与看板其他 accent 元素一致

### Requirement: 图表控件

看板销售趋势卡片 SHALL 提供「销量 / 营收」「折线 / 柱图」「7 / 30 天」切换 UI（pill 或 segmented control），当前选中态有视觉高亮。

#### Scenario: 默认选中折线与销量

- **WHEN** 用户首次进入看板
- **THEN** 「折线」「销量」选项为选中态

#### Scenario: 切换状态持久化

- **WHEN** 用户在同一会话内切换 7/30 天范围
- **THEN** 当前 chartType 与 metric 选择保持不变
