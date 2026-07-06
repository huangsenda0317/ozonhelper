## ADDED Requirements

### Requirement: 加工页状态 Tab

商品加工页 SHALL 提供状态 Tab：加工池、加工中、加工成品、加工失败；切换 Tab 时表格仅展示对应 `status` 的加工单。

#### Scenario: 默认展示加工池

- **WHEN** 用户访问 `/ozon-assistant/processing`
- **THEN** 「加工池」Tab 处于 active 状态
- **AND** 表格展示 `status = pool` 的加工单

#### Scenario: 切换至加工成品

- **WHEN** 用户点击「加工成品」Tab
- **THEN** 表格仅展示 `status = finished` 的加工单

### Requirement: 加工页筛选栏

商品加工页 SHALL 提供筛选：关键词（商品标题）、来源平台（全部/OZON/1688）、创建时间（全部/今日/昨日/近七天），以及「查询」「重置」按钮。

#### Scenario: 按关键词筛选

- **WHEN** 用户输入关键词并点击「查询」
- **THEN** 表格仅展示标题或 SKU 匹配关键词的加工单

#### Scenario: 重置筛选

- **WHEN** 用户点击「重置」
- **THEN** 所有筛选恢复默认

### Requirement: 加工表格列

加工页表格 SHALL 展示列：商品信息、商品标题、属性完整度、加工状态、操作。

#### Scenario: 商品信息列

- **WHEN** 表格渲染一行加工单
- **THEN** 商品信息列展示缩略图、SKU、来源平台 tag

#### Scenario: 属性完整度列

- **WHEN** 加工单缺少标题或描述
- **THEN** 属性完整度以百分比或进度条展示低于 100% 的值

#### Scenario: 操作列

- **WHEN** 用户查看加工池行操作列
- **THEN** 展示「编辑加工」「删除」入口

#### Scenario: 加工成品操作列

- **WHEN** 用户查看加工成品行操作列
- **THEN** 展示「编辑加工」「加入待上架」「重新创建加工单」入口

### Requirement: 加工页多选与批量操作

加工页 SHALL 支持表格多选；选中时启用「批量删除」；加工成品 Tab 下额外启用「批量加入待上架」。

#### Scenario: 批量删除

- **WHEN** 用户选中多条记录并点击「批量删除」
- **THEN** 系统确认后删除选中加工单
- **AND** 关联采集项 `processing_status` 回退为 `pending`（若存在）

#### Scenario: 批量加入待上架

- **WHEN** 用户在「加工成品」Tab 选中多条记录并点击「批量加入待上架」
- **THEN** 选中项写入商品管理待上架列表
- **AND** toast 提示前往商品管理

#### Scenario: 未选中时批量按钮禁用

- **WHEN** 无选中行
- **THEN** 批量操作按钮为 disabled

### Requirement: 编辑加工页

访问 `/ozon-assistant/processing/[id]` SHALL 展示全页编辑加工表单，包含区块：基本信息（商品标题、商品标签、商品描述）、类目与属性、规格配置、商品图片素材。

#### Scenario: 打开编辑页

- **WHEN** 用户点击某行「编辑加工」
- **THEN** 导航至 `/ozon-assistant/processing/[id]`
- **AND** 面包屑展示「商品加工 / 编辑加工」

#### Scenario: 保存信息

- **WHEN** 用户修改字段并点击「保存信息」
- **THEN** 加工单更新并 toast「保存成功」
- **AND** 属性完整度重新计算

#### Scenario: 规格模式切换

- **WHEN** 用户选择「所有规格共用一套图」或「每个规格独立一套图」
- **THEN** 图片素材区切换对应布局

### Requirement: 加入待上架

加工成品 SHALL 提供「加入待上架」操作；成功后该加工单在待上架列表可见。

#### Scenario: 加入待上架成功

- **WHEN** 用户对加工成品点击「加入待上架」
- **THEN** 系统在商品管理待上架列表创建对应记录
- **AND** toast 提示「已加入待上架，请前往商品管理查看」

#### Scenario: 信息不完整时禁用

- **WHEN** 加工单标题为空
- **THEN** 「加入待上架」按钮为 disabled
- **AND** tooltip 说明需先完善标题

### Requirement: 重新加工

加工失败或加工成品 SHALL 支持「重新创建加工单」或「重新加工」，将状态重置为加工池并保留已编辑中文文案。

#### Scenario: 重新创建加工单

- **WHEN** 用户点击「重新创建加工单」并确认
- **THEN** 加工单 `status` 更新为 `pool`
- **AND** 保留 `title_zh`、`tags_zh`、`description_zh` 等已填字段

### Requirement: 加工页空态与加载态

加工池无数据时 SHALL 展示空态，引导用户前往商品采集创建加工单；加载时展示 skeleton。

#### Scenario: 空加工池

- **WHEN** 加工池无任何记录
- **THEN** 展示空态与跳转 `/ozon-assistant/collection` 的链接

### Requirement: 加工页响应式与无障碍

加工页 SHALL 表格容器支持横向滚动；筛选栏在 viewport < md 时折叠；可点击元素具备 hover 过渡与键盘 focus 态。

#### Scenario: 移动端表格

- **WHEN** viewport < md
- **THEN** 表格外层 `overflow-x-auto`，布局不撑破页面
