## Requirements

### Requirement: AI 问答页面路由

系统 SHALL 提供 `/ai-qa` 页面，需登录后访问；未登录用户重定向至登录页。

#### Scenario: 已登录访问

- **WHEN** 已登录用户导航至 `/ai-qa`
- **THEN** 显示 AI 问答工作台

#### Scenario: 未登录访问

- **WHEN** 未登录用户访问 `/ai-qa`
- **THEN** 重定向至 `/login`

### Requirement: Ant Design X 对话布局

页面 SHALL 使用 `@ant-design/x` 组件构建对话区：`Welcome`、`Prompts`、`Bubble.List`、`Sender`、`Think`。助手消息 SHALL 使用 `@ant-design/x-markdown` 的 `XMarkdown` 流式渲染。

#### Scenario: 空态展示

- **WHEN** 用户首次进入且无消息
- **THEN** 显示 `Welcome` 文案与 `Prompts` 快捷问题卡片

#### Scenario: 对话中展示气泡

- **WHEN** 用户发送消息并收到助手回复
- **THEN** `Bubble.List` 分别展示 user 与 assistant 气泡，assistant 正文为 Markdown 渲染结果

#### Scenario: 流式更新

- **WHEN** SSE 推送 `delta` 事件
- **THEN** 当前 assistant 气泡正文增量更新

### Requirement: 思考过程与工具调用展示

助手回复 SHALL 在正文上方使用外层 `Think` 展示思考过程；工具调用置于思考区顶部，每项工具使用内层可展开/收起的 `Think`。进行中自动展开，完成后默认收起，用户可手动展开查看。

#### Scenario: 思考流式展示

- **WHEN** SSE 推送 `think_delta` 事件
- **THEN** 外层 Think 内推理文本增量更新，不重复创建 DOM

#### Scenario: 工具调用状态

- **WHEN** SSE 收到 `tool_start` / `tool_end`
- **THEN** 在思考区顶部追加工具 Think 项，调用中展开并 loading，完成后收起

### Requirement: 店铺选择器

页面顶栏 SHALL 提供店铺下拉，数据源为 `StoreContext`。无店铺时引导至 `/settings/stores` 并禁用发送。

#### Scenario: 切换店铺

- **WHEN** 用户从下拉框选择另一店铺
- **THEN** 后续聊天请求使用新 `store_id`

### Requirement: 模型选择器

页面顶栏 SHALL 提供模型下拉，选项至少包含 `deepseek-v4-flash`（默认）、`deepseek-v4-pro`。

#### Scenario: 切换模型

- **WHEN** 用户选择 `deepseek-v4-pro`
- **THEN** 下一次请求 `model` 为 `deepseek-v4-pro`

### Requirement: 发送消息与加载状态

用户通过 `Sender` 提交问题后调用 `POST /api/v1/ai/chat` 并以 SSE 消费；发送期间 `Sender` loading 且不可重复提交。

#### Scenario: 成功提问

- **WHEN** 用户输入问题并发送
- **THEN** 追加 user 气泡，创建 assistant 气泡并流式填充至 `done`

#### Scenario: 请求失败

- **WHEN** API 返回错误或 SSE `error` 事件
- **THEN** 展示错误提示，恢复 `Sender` 可编辑状态

### Requirement: 快捷提问

`Prompts` SHALL 提供至少 4 条预设问题，点击后自动发送。

#### Scenario: 点击快捷提问

- **WHEN** 用户点击某条 Prompt
- **THEN** 该文本作为 user 消息发送并触发聊天 API

### Requirement: 主题兼容

对话区 SHALL 在浅色与深色主题下均可读，通过 `XProvider` / `ConfigProvider` 适配 `useTheme()`。

#### Scenario: 深色模式

- **WHEN** 用户切换为深色主题
- **THEN** 气泡、输入框与 Markdown 对比度满足可读性
