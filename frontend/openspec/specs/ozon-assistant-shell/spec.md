## ADDED Requirements

### Requirement: GlobalNav 一级入口 OZON助手

GlobalNav SHALL 在已登录用户导航栏中展示「OZON助手」菜单项，链接至 `/ozon-assistant`（默认进入选品排行榜）。

#### Scenario: 桌面端导航可见

- **WHEN** 已登录用户访问任意页面（viewport ≥ lg）
- **THEN** 顶部导航栏显示「OZON助手」链接
- **AND** 不显示独立的「选品排行榜」一级菜单项

#### Scenario: 移动端抽屉导航可见

- **WHEN** 已登录用户在移动端打开导航抽屉
- **THEN** 抽屉菜单中包含「OZON助手」链接

#### Scenario: OZON助手一级高亮

- **WHEN** 用户访问 `/ozon-assistant` 或其任意子路径
- **THEN** GlobalNav 中「OZON助手」导航项处于 active 状态

### Requirement: 二级 Tab 导航

OzonAssistantShell SHALL 在 OZON 助手模块内提供二级 Tab：选品排行榜、商品采集、商品加工、商品管理。

#### Scenario: Tab 列表展示

- **WHEN** 用户访问任意 `/ozon-assistant/*` 子路由
- **THEN** 页面顶部展示四个二级 Tab，标签分别为「选品排行榜」「商品采集」「商品加工」「商品管理」

#### Scenario: 选品排行榜 Tab 高亮

- **WHEN** 用户访问 `/ozon-assistant/rankings`
- **THEN** 「选品排行榜」Tab 处于 active 状态

#### Scenario: Tab 切换导航

- **WHEN** 用户点击「商品采集」Tab
- **THEN** 浏览器导航至 `/ozon-assistant/collection`
- **AND** 「商品采集」Tab 处于 active 状态

### Requirement: 默认 landing 重定向

访问 `/ozon-assistant` SHALL 自动重定向至 `/ozon-assistant/rankings`。

#### Scenario: 根路径重定向

- **WHEN** 用户访问 `/ozon-assistant`
- **THEN** 重定向至 `/ozon-assistant/rankings`

### Requirement: 未实现模块占位页

商品采集、商品加工、商品管理路由在功能未就绪时 SHALL 展示占位页，说明功能开发中，不得出现 404。

#### Scenario: 商品采集占位

- **WHEN** 用户访问 `/ozon-assistant/collection`
- **THEN** 展示占位内容（非 404 错误页）
- **AND** OzonAssistantShell 二级 Tab 正常显示

#### Scenario: 商品加工占位

- **WHEN** 用户访问 `/ozon-assistant/processing`
- **THEN** 展示占位内容（非 404 错误页）

#### Scenario: 商品管理占位

- **WHEN** 用户访问 `/ozon-assistant/management`
- **THEN** 展示占位内容（非 404 错误页）

### Requirement: 壳层样式与 TrackingShell 一致

OzonAssistantShell 二级 Tab SHALL 复用 TrackingShell 相同的布局模式：max-w-7xl 容器、border-b Tab 栏、nav-tab-active / interactive-muted-soft 样式、Lucide 图标。

#### Scenario: 桌面端 Tab 栏

- **WHEN** 用户在桌面端访问 OZON 助手模块
- **THEN** 二级 Tab 以水平 flex-wrap 排列，带图标与标签

#### Scenario: 深色模式兼容

- **WHEN** 用户切换深色/浅色主题
- **THEN** OzonAssistantShell Tab 栏颜色适配当前主题
