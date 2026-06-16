## ADDED Requirements

### Requirement: AI 问答页面路由

系统 SHALL 提供 `/ai-qa` 页面，需登录后访问；未登录用户重定向至登录页。

#### Scenario: 已登录访问

- **WHEN** 已登录用户导航至 `/ai-qa`
- **THEN** 显示 AI 问答工作台

#### Scenario: 未登录访问

- **WHEN** 未登录用户访问 `/ai-qa`
- **THEN** 重定向至 `/login`

### Requirement: Ant Design X 对话布局

页面 SHALL 使用 `@ant-design/x` 组件构建对话区：`Welcome`（空态欢迎）、`Prompts`（快捷提问）、`Bubble.List`（消息列表）、`Sender`（底部输入框）。助手消息内容 SHALL 使用 `@ant-design/x-markdown` 的 `XMarkdown` 流式渲染。

#### Scenario: 空态展示

- **WHEN** 用户首次进入且无消息
- **THEN** 显示 `Welcome` 文案与 `Prompts` 快捷问题卡片

#### Scenario: 对话中展示气泡

- **WHEN** 用户发送消息并收到助手回复
- **THEN** `Bubble.List` 分别展示 user 与 assistant 气泡，assistant 内容为 Markdown 渲染结果

#### Scenario: 流式更新

- **WHEN** SSE 推送 `delta` 事件
- **THEN** 当前 assistant 气泡内容增量更新，`XMarkdown` 流式渲染

### Requirement: 店铺选择器

页面顶栏 SHALL 提供店铺下拉选择，数据源为 `StoreContext`（`/api/v1/stores`）。无店铺时显示引导链接至 `/settings/stores`。

#### Scenario: 切换店铺

- **WHEN** 用户从下拉框选择另一店铺
- **THEN** 后续聊天请求使用新 `store_id`；当前会话消息可保留或清空（实现二选一，默认保留并提示上下文店铺已切换）

#### Scenario: 无绑定店铺

- **WHEN** 用户无任何店铺
- **THEN** 显示「绑定店铺」引导，`Sender` 禁用

### Requirement: 模型选择器

页面顶栏 SHALL 提供模型下拉，选项至少包含：`glm-4-flash`（默认）、`glm-4-plus`、`glm-4-air`。选中值传入聊天 API 的 `model` 字段。

#### Scenario: 切换模型

- **WHEN** 用户选择 `glm-4-plus`
- **THEN** 下一次发送的消息请求 `model` 为 `glm-4-plus`

### Requirement: 发送消息与加载状态

用户通过 `Sender` 提交问题后，系统 SHALL 调用 `POST /api/v1/ai/chat` 并以 SSE 消费响应；发送期间 `Sender` 进入 loading 且不可重复提交。

#### Scenario: 成功提问

- **WHEN** 用户输入问题并发送
- **THEN** 立即追加 user 气泡，创建空 assistant 气泡，流式填充至 `done`

#### Scenario: 工具调用状态展示

- **WHEN** SSE 收到 `tool_start` 事件
- **THEN** 在 assistant 气泡上方或内部显示「正在调用 {工具名}…」状态提示

#### Scenario: 请求失败

- **WHEN** API 返回错误或 SSE `error` 事件
- **THEN** 展示错误提示，恢复 `Sender` 可编辑状态

### Requirement: 快捷提问

`Prompts` SHALL 提供至少 4 条预设问题，点击后等价于用户输入并自动发送，例如：「今日待发货订单有多少？」「查询卖家账户信息」「最近 7 天 FBS 订单概况」「库存为 0 的商品有哪些？」。

#### Scenario: 点击快捷提问

- **WHEN** 用户点击某条 Prompt
- **THEN** 该文本作为 user 消息发送并触发聊天 API

### Requirement: 主题兼容

对话区 SHALL 在浅色与深色主题下均可读；通过 `XProvider` 或 antd `ConfigProvider` 适配 `useTheme()` 的 `resolvedTheme`。

#### Scenario: 深色模式

- **WHEN** 用户切换为深色主题
- **THEN** 气泡、输入框与 Markdown 文字对比度满足可读性，无硬编码仅浅色样式
