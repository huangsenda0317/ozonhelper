## MODIFIED Requirements

### Requirement: 未实现模块占位页

商品加工、商品管理路由 SHALL 展示完整功能页面，不得出现 404 或 ComingSoon 占位。商品采集路由 SHALL 展示完整采集箱页面（见 `product-collection-inbox` capability）。

#### Scenario: 商品采集页

- **WHEN** 用户访问 `/ozon-assistant/collection`
- **THEN** 展示商品采集箱列表页（非 ComingSoon 占位）
- **AND** OzonAssistantShell 二级 Tab 正常显示
- **AND** 「商品采集」Tab 处于 active 状态

#### Scenario: 商品加工页

- **WHEN** 用户访问 `/ozon-assistant/processing`
- **THEN** 展示商品加工列表页（见 `product-processing-workbench`）
- **AND** 「商品加工」Tab 处于 active 状态

#### Scenario: 商品管理页

- **WHEN** 用户访问 `/ozon-assistant/management`
- **THEN** 展示商品管理待上架列表页（见 `product-management-listing`）
- **AND** 「商品管理」Tab 处于 active 状态

## ADDED Requirements

### Requirement: 加工与管理子路由 Tab 高亮

访问 `/ozon-assistant/processing/*` 或 `/ozon-assistant/management/*` 子路由时，OzonAssistantShell SHALL 保持对应二级 Tab 的 active 状态。

#### Scenario: 编辑加工子路由

- **WHEN** 用户访问 `/ozon-assistant/processing/[id]`
- **THEN** 「商品加工」Tab 处于 active 状态

#### Scenario: 待上架详情子路由

- **WHEN** 用户访问 `/ozon-assistant/management/[id]`
- **THEN** 「商品管理」Tab 处于 active 状态
