## REMOVED Requirements

### Requirement: 一级导航入口

**Reason**: 选品排行榜导航入口迁移至 OZON 助手二级 Tab，由 `ozon-assistant-shell` 规范接管 GlobalNav 行为。

**Migration**: 用户通过 GlobalNav「OZON助手」进入，再点击二级 Tab「选品排行榜」；旧书签 `/ozon-rankings` 重定向至 `/ozon-assistant/rankings`。

## MODIFIED Requirements

### Requirement: 五大榜单 Tab

选品排行榜页面 SHALL 提供五个 Tab：商品榜、类目榜、品牌榜、卖家榜、机会榜，切换 Tab 时加载对应 view 数据。页面路由为 `/ozon-assistant/rankings`，嵌套于 OzonAssistantShell layout 内。

#### Scenario: 默认展示商品榜

- **WHEN** 用户访问 `/ozon-assistant/rankings`
- **THEN** 默认选中「商品榜」Tab 并展示商品维度数据

#### Scenario: 切换 Tab 更新数据

- **WHEN** 用户点击「类目榜」Tab
- **THEN** 表格列切换为类目聚合维度（排名、类目、GMV、销量、搜索会话、曝光、均价、平均搜索加购、代表商品、操作）
- **AND** URL query 更新为 `?view=category`

## ADDED Requirements

### Requirement: 旧路由重定向

系统 SHALL 将 `/ozon-rankings` 及其 query 参数重定向至 `/ozon-assistant/rankings`，保留原有 query string。

#### Scenario: 旧路径带 query 重定向

- **WHEN** 用户访问 `/ozon-rankings?view=brand&page=2`
- **THEN** 重定向至 `/ozon-assistant/rankings?view=brand&page=2`

#### Scenario: 旧路径无 query 重定向

- **WHEN** 用户访问 `/ozon-rankings`
- **THEN** 重定向至 `/ozon-assistant/rankings`
