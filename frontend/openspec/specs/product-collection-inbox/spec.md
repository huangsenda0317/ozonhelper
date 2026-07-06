## ADDED Requirements

### Requirement: 采集页筛选栏

商品采集页 SHALL 提供筛选：关键词（文本）、采集时间（今日/昨日/近七天）、来源平台（全部/1688/OZON）、加工状态（全部/已创建/未创建），以及「查询」「重置」按钮。

#### Scenario: 按采集时间筛选

- **WHEN** 用户选择「近七天」并点击「查询」
- **THEN** 表格仅展示近七天内采集的记录

#### Scenario: 按加工状态筛选

- **WHEN** 用户选择「未创建」并点击「查询」
- **THEN** 表格仅展示 `processing_status = pending` 的记录

#### Scenario: 重置筛选

- **WHEN** 用户点击「重置」
- **THEN** 所有筛选恢复默认（关键词空、时间不限、来源全部、加工状态全部）

### Requirement: 采集表格列

采集页表格 SHALL 展示列：商品信息、当前价格、评分、评论数、跟卖数、销量、采集名称、品牌/卖家、采集时间、操作。

#### Scenario: 商品信息列

- **WHEN** 表格渲染一行采集记录
- **THEN** 商品信息列展示商品名称、采集来源 tag（OZON/1688）、是否创建加工 tag（已创建/未创建）

#### Scenario: 操作列

- **WHEN** 用户查看某行操作列
- **THEN** 展示「详情」「编辑」「比价」「删除」四个操作入口

### Requirement: 采集页多选与批量操作

采集页 SHALL 支持表格多选，并在选中时启用「批量加工」「批量删除」按钮。

#### Scenario: 批量删除

- **WHEN** 用户选中多条记录并点击「批量删除」
- **THEN** 系统确认后删除选中采集项
- **AND** 表格刷新

#### Scenario: 批量加工

- **WHEN** 用户选中多条未创建加工的记录并点击「批量加工」
- **THEN** 选中项 `processing_status` 更新为 `created`
- **AND** 系统在商品加工池创建对应加工单（`status = pool`）
- **AND** toast 提示「已创建加工单，请前往商品加工查看」

#### Scenario: 未选中时批量按钮禁用

- **WHEN** 无选中行
- **THEN** 「批量加工」「批量删除」为 disabled

### Requirement: 详情抽屉

点击「详情」SHALL 打开抽屉，展示参考 DeepPick 详情页核心区块：商品基本信息（品牌、卖家、平台商品 ID、来源状态）、指标（跟卖数、评分、评论数、销量等）、商品图集占位。

#### Scenario: 打开详情

- **WHEN** 用户点击某行「详情」
- **THEN** URL 更新 `?id=<itemId>&panel=detail`
- **AND** 右侧抽屉展示该采集项详情

#### Scenario: 关闭详情

- **WHEN** 用户关闭抽屉
- **THEN** URL 移除 panel 参数

### Requirement: 编辑抽屉

点击「编辑」SHALL 打开抽屉，允许编辑采集名称、采集标签等可编辑字段，支持保存与取消。

#### Scenario: 保存编辑

- **WHEN** 用户修改采集名称并点击保存
- **THEN** 采集项更新并关闭抽屉
- **AND** 列表行反映新名称

### Requirement: 比价抽屉

点击「比价」SHALL 打开抽屉，展示源商品信息与 1688 比价结果区（首期 mock：未比价 / 最近成功比价候选列表）。

#### Scenario: 未比价状态

- **WHEN** 采集项无比价记录
- **THEN** 比价抽屉展示「未比价」与「打开源商品」链接

### Requirement: 单行删除

点击「删除」SHALL 经确认后删除该采集项。

#### Scenario: 确认删除

- **WHEN** 用户点击「删除」并在确认框确认
- **THEN** 该采集项从列表移除

### Requirement: 空态与加载态

采集页 SHALL 在无数据时展示空态引导（「从选品排行榜添加采集」链接至 rankings）；加载时展示 skeleton。

#### Scenario: 空采集箱

- **WHEN** 采集箱无任何记录
- **THEN** 展示空态与跳转选品排行榜的链接

### Requirement: 响应式与无障碍

采集页 SHALL 表格容器支持横向滚动；筛选栏在 viewport < md 时折叠；可点击元素具备 hover 过渡与键盘 focus 态。

#### Scenario: 移动端表格

- **WHEN** viewport < md
- **THEN** 表格外层 `overflow-x-auto`，布局不撑破页面

### Requirement: 加工单去重

批量加工或重复加工时，系统 SHALL 按 `collection_item_id` 去重，已存在加工单的采集项跳过并 toast 提示。

#### Scenario: 重复批量加工

- **WHEN** 用户对已在加工池的采集项再次批量加工
- **THEN** 跳过已存在加工单的项
- **AND** toast 说明跳过数量
