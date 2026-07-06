## ADDED Requirements

### Requirement: 表格行多选

选品排行榜表格 SHALL 提供 checkbox 列，支持当前页多选；全选仅作用于当前页数据。

#### Scenario: 勾选单行

- **WHEN** 用户勾选商品榜某一行的 checkbox
- **THEN** 该行进入选中集合
- **AND** Tab 栏右侧「批量采集」按钮变为可点击

#### Scenario: 未选中时批量按钮禁用

- **WHEN** 当前无任何行被选中
- **THEN** 「批量采集」按钮为 disabled 状态

#### Scenario: 代表商品缺失不可选

- **WHEN** 聚合榜某行无代表商品 URL/SKU
- **THEN** 该行 checkbox 与「添加采集」不可用（disabled）

### Requirement: 单行添加采集

可采集行 SHALL 在操作列展示「添加采集」按钮；点击后将商品写入采集箱并给予反馈。

#### Scenario: 商品榜添加采集

- **WHEN** 用户在商品榜某行点击「添加采集」
- **THEN** 系统将该商品写入采集箱（来源平台 OZON，加工状态未创建）
- **AND** 展示成功 toast，可选「前往采集箱」

#### Scenario: 重复采集

- **WHEN** 用户采集已在采集箱中的同一 SKU
- **THEN** 系统不重复写入
- **AND** 提示「该商品已在采集箱」

### Requirement: Tab 栏批量采集

五大榜单 Tab 栏最右侧 SHALL 展示「批量采集」按钮；选中 ≥1 行时可点击，点击后批量写入采集箱并导航至商品采集页。

#### Scenario: 批量采集并跳转

- **WHEN** 用户选中多行并点击「批量采集」
- **THEN** 所有可采集选中项写入采集箱
- **AND** 浏览器导航至 `/ozon-assistant/collection`

#### Scenario: 批量采集部分跳过

- **WHEN** 选中行中包含不可采集行
- **THEN** 仅写入可采集项
- **AND** toast 说明跳过数量

### Requirement: 排行榜到采集字段映射

采集写入 SHALL 映射排行榜商品字段：SKU、名称、图片、当前价格、评分、评论数、跟卖数、销量、品牌、卖家、采集名称（默认取商品名称）、采集时间（当前时间）、来源 view（product/category/…）。

#### Scenario: 字段完整性

- **WHEN** 从商品榜采集一条记录
- **THEN** 采集项包含上述字段中非空值
- **AND** `source_platform` 为 `OZON`
