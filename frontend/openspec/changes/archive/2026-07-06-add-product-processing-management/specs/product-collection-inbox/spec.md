## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: 加工单去重

批量加工或重复加工时，系统 SHALL 按 `collection_item_id` 去重，已存在加工单的采集项跳过并 toast 提示。

#### Scenario: 重复批量加工

- **WHEN** 用户对已在加工池的采集项再次批量加工
- **THEN** 跳过已存在加工单的项
- **AND** toast 说明跳过数量
