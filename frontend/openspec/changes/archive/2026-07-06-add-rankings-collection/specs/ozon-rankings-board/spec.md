## MODIFIED Requirements

### Requirement: 数据表格

表格 SHALL 根据当前 Tab 动态渲染列，支持分页（每页 50 条，可翻页），数值列右对齐并千分位格式化；并 SHALL 提供 checkbox 多选列与采集操作（见 `rankings-collection-actions` capability）。

#### Scenario: 商品榜表格列

- **WHEN** 当前 Tab 为「商品榜」
- **THEN** 表格展示列：多选、排名、商品（含图片+名称）、类目路径、卖家、GMV、销量、销售额、均价、搜索会话、曝光、搜索加购、PDP加购、库存、更新时间、操作（含「添加采集」）

#### Scenario: 机会榜额外列

- **WHEN** 当前 Tab 为「机会榜」
- **THEN** 表格额外展示机会评分（opportunity_score）与机会原因（opportunity_reasons）

#### Scenario: 分页

- **WHEN** 数据总数超过每页条数
- **THEN** 表格底部展示分页器，支持翻页

## ADDED Requirements

### Requirement: Tab 栏批量采集入口

榜单 Tab 栏 SHALL 在 Tab 列表最右侧展示「批量采集」按钮；无选中行时 disabled，有选中行时可点击（行为见 `rankings-collection-actions`）。

#### Scenario: 批量按钮位置

- **WHEN** 用户查看任意榜单 Tab 栏
- **THEN** 「批量采集」按钮位于 Tab 列表同一行最右侧

#### Scenario: 切换 Tab 清空选中

- **WHEN** 用户切换榜单 Tab
- **THEN** 当前页选中行清空
- **AND** 「批量采集」恢复 disabled
