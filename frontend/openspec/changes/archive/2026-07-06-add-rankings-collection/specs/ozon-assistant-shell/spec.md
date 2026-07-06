## MODIFIED Requirements

### Requirement: 未实现模块占位页

商品加工、商品管理路由在功能未就绪时 SHALL 展示占位页，说明功能开发中，不得出现 404。商品采集路由 SHALL 展示完整采集箱页面（见 `product-collection-inbox` capability），不再使用 ComingSoon 占位。

#### Scenario: 商品采集页

- **WHEN** 用户访问 `/ozon-assistant/collection`
- **THEN** 展示商品采集箱列表页（非 ComingSoon 占位）
- **AND** OzonAssistantShell 二级 Tab 正常显示
- **AND** 「商品采集」Tab 处于 active 状态

#### Scenario: 商品加工占位

- **WHEN** 用户访问 `/ozon-assistant/processing`
- **THEN** 展示占位内容（非 404 错误页）

#### Scenario: 商品管理占位

- **WHEN** 用户访问 `/ozon-assistant/management`
- **THEN** 展示占位内容（非 404 错误页）
