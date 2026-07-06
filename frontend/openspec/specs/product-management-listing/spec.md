## ADDED Requirements

### Requirement: 管理页待上架 Tab

商品管理页 SHALL 默认展示「待上架商品」列表；路由为 `/ozon-assistant/management`。

#### Scenario: 默认列表

- **WHEN** 用户访问 `/ozon-assistant/management`
- **THEN** 展示待上架商品表格
- **AND** OzonAssistantShell 中「商品管理」Tab 处于 active 状态

### Requirement: 管理页筛选栏

待上架列表 SHALL 提供筛选：关键词（商品标题）、来源状态（全部/已采集/已加工等 mock 选项）、关联店铺（mock 下拉）、加入时间（全部/今日/昨日/近七天），以及「查询」「重置」。

#### Scenario: 按关键词筛选

- **WHEN** 用户输入关键词并点击「查询」
- **THEN** 表格仅展示标题匹配的待上架记录

#### Scenario: 重置筛选

- **WHEN** 用户点击「重置」
- **THEN** 所有筛选恢复默认

### Requirement: 待上架表格列

待上架表格 SHALL 展示列：商品信息、当前价格、品牌/卖家、来源状态、加入待上架时间、操作。

#### Scenario: 商品信息列

- **WHEN** 表格渲染一行待上架记录
- **THEN** 商品信息列展示缩略图、中文标题、SKU

#### Scenario: 操作列

- **WHEN** 用户查看某行操作列
- **THEN** 展示「详情」「移出待上架」入口

### Requirement: 管理页多选与批量操作

待上架列表 SHALL 支持多选；选中时启用「批量上架」与「移出待上架」。

#### Scenario: 批量上架

- **WHEN** 用户选中多条记录并点击「批量上架」
- **THEN** 系统确认后 mock 更新上架状态
- **AND** toast 提示上架任务已提交（首期 mock）

#### Scenario: 移出待上架

- **WHEN** 用户点击「移出待上架」并确认
- **THEN** 该记录从待上架列表移除
- **AND** 关联加工单可再次「加入待上架」

#### Scenario: 未选中时批量按钮禁用

- **WHEN** 无选中行
- **THEN** 「批量上架」「移出待上架」为 disabled

### Requirement: 待上架详情页

访问 `/ozon-assistant/management/[id]` SHALL 展示待上架商品详情，包含：主图与详情图、类目、品牌、库存（mock）、来源状态、采集标签、详情页浏览量（mock）、当前价格。

#### Scenario: 打开详情

- **WHEN** 用户点击某行「详情」
- **THEN** 导航至 `/ozon-assistant/management/[id]`
- **AND** 面包屑展示「商品管理 / 待上架详情」

#### Scenario: 返回列表

- **WHEN** 用户点击「返回待上架」
- **THEN** 导航回 `/ozon-assistant/management`

### Requirement: 管理页空态

待上架列表无数据时 SHALL 展示空态，引导用户前往商品加工加入待上架。

#### Scenario: 空待上架列表

- **WHEN** 待上架列表无任何记录
- **THEN** 展示空态与跳转 `/ozon-assistant/processing` 的链接

### Requirement: 管理页响应式与无障碍

管理页 SHALL 表格容器支持横向滚动；筛选栏在 viewport < md 时折叠；可点击元素具备 hover 过渡与键盘 focus 态。

#### Scenario: 移动端表格

- **WHEN** viewport < md
- **THEN** 表格外层 `overflow-x-auto`，布局不撑破页面
