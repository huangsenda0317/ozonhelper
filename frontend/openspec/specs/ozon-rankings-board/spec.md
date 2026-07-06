## ADDED Requirements

### Requirement: 五大榜单 Tab

选品排行榜页面 SHALL 提供五个 Tab：商品榜、类目榜、品牌榜、卖家榜、机会榜，切换 Tab 时加载对应 view 数据。页面路由为 `/ozon-assistant/rankings`，嵌套于 OzonAssistantShell layout 内。

#### Scenario: 默认展示商品榜

- **WHEN** 用户访问 `/ozon-assistant/rankings`
- **THEN** 默认选中「商品榜」Tab 并展示商品维度数据

#### Scenario: 切换 Tab 更新数据

- **WHEN** 用户点击「类目榜」Tab
- **THEN** 表格列切换为类目聚合维度（排名、类目、GMV、销量、搜索会话、曝光、均价、平均搜索加购、代表商品、操作）
- **AND** URL query 更新为 `?view=category`

### Requirement: 旧路由重定向

系统 SHALL 将 `/ozon-rankings` 及其 query 参数重定向至 `/ozon-assistant/rankings`，保留原有 query string。

#### Scenario: 旧路径带 query 重定向

- **WHEN** 用户访问 `/ozon-rankings?view=brand&page=2`
- **THEN** 重定向至 `/ozon-assistant/rankings?view=brand&page=2`

#### Scenario: 旧路径无 query 重定向

- **WHEN** 用户访问 `/ozon-rankings`
- **THEN** 重定向至 `/ozon-assistant/rankings`

### Requirement: 筛选表单

页面 SHALL 提供筛选栏，包含：排序口径（下拉）、类目筛选（下拉）、发货方式（FBO/FBS）、关键词（文本输入），以及「查询」「重置」按钮。

#### Scenario: 提交筛选

- **WHEN** 用户设置排序口径为 GMV 并点击「查询」
- **THEN** 表格数据按新条件重新加载，页码重置为 1

#### Scenario: 重置筛选

- **WHEN** 用户点击「重置」
- **THEN** 所有筛选条件恢复默认值并重新加载数据

### Requirement: KPI 摘要栏

页面顶部 SHALL 展示数据摘要卡片，包含：总 GMV、总销量、热门类目、热门商品（名称 + GMV）。

#### Scenario: 摘要数据加载

- **WHEN** 榜单数据加载成功
- **THEN** KPI 卡片展示 `summary` 中的 total_gmv、total_sold_count、top_category、top_product_name

### Requirement: 数据表格

表格 SHALL 根据当前 Tab 动态渲染列，支持分页（每页 50 条，可翻页），数值列右对齐并千分位格式化。

#### Scenario: 商品榜表格列

- **WHEN** 当前 Tab 为「商品榜」
- **THEN** 表格展示列：排名、商品（含图片+名称）、类目路径、卖家、GMV、销量、销售额、均价、搜索会话、曝光、搜索加购、PDP加购、库存、更新时间

#### Scenario: 机会榜额外列

- **WHEN** 当前 Tab 为「机会榜」
- **THEN** 表格额外展示机会评分（opportunity_score）与机会原因（opportunity_reasons）

#### Scenario: 分页

- **WHEN** 数据总数超过每页条数
- **THEN** 表格底部展示分页器，支持翻页

### Requirement: 加载与错误状态

页面 SHALL 在数据请求期间展示 skeleton 加载态，请求失败时展示错误提示与重试按钮。

#### Scenario: 加载中

- **WHEN** 数据正在请求
- **THEN** 表格区域展示 skeleton 占位

#### Scenario: 请求失败

- **WHEN** API 返回错误
- **THEN** 展示错误信息与「重试」按钮

### Requirement: 响应式布局

页面 SHALL 在桌面端（≥ md）筛选栏单行展示，移动端（< md）筛选栏折叠为可展开面板。

#### Scenario: 移动端筛选折叠

- **WHEN** 用户在 viewport < md 访问页面
- **THEN** 筛选表单默认折叠，点击可展开

### Requirement: 深色模式兼容

页面 SHALL 兼容系统深色/浅色主题切换，复用项目现有 design token。

#### Scenario: 深色模式渲染

- **WHEN** 用户切换为深色模式
- **THEN** 表格、KPI 卡片、筛选栏背景与文字颜色适配深色主题
