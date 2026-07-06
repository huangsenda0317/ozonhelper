## ADDED Requirements

### Requirement: 页面无重复标题

AI 改图页 SHALL NOT 在页面内容区展示「AI 改图」主标题（`<h1>` 或等效大标题），导航上下文由 GlobalNav 提供。

#### Scenario: 页面加载无 h1 标题

- **WHEN** 用户访问 `/ai-edit`
- **THEN** 页面内容区不包含「AI 改图」文字作为主标题，工作区直接可见

### Requirement: 横向 1/3 + 2/3 工作区布局

AI 改图页主工作区 SHALL 在桌面端（≥ md）采用横向布局：左侧占 1/3 宽度为图片上传区，右侧占 2/3 宽度为 prompt 输入区。

#### Scenario: 桌面端分栏

- **WHEN** 用户在 viewport ≥ md 访问改图页
- **THEN** 上传区与 prompt 输入区并排显示，宽度比例约为 1:2

#### Scenario: 移动端垂直堆叠

- **WHEN** 用户在 viewport < md 访问改图页
- **THEN** 上传区在上、prompt 输入区在下，全宽显示

### Requirement: 推荐提示词折叠面板

工作区下方 SHALL 提供 Ant Design Collapse 面板「推荐提示词」，内含预设 prompt 模板列表，点击后将模板填入 prompt 输入框。

#### Scenario: 展开并选择预设

- **WHEN** 用户展开「推荐提示词」面板并点击某条预设
- **THEN** 右侧 prompt textarea 内容更新为该预设文本

#### Scenario: 默认折叠

- **WHEN** 用户首次进入改图页
- **THEN** 「推荐提示词」面板处于折叠状态

### Requirement: 高级参数折叠面板

工作区下方 SHALL 提供 Ant Design Collapse 面板「高级」，内含随机种子（seed）和编辑强度（scale）控件。

#### Scenario: 调整高级参数

- **WHEN** 用户展开「高级」面板并调整 seed 或 scale
- **THEN** 对应 state 更新，发起改图时使用最新值

#### Scenario: 默认折叠

- **WHEN** 用户首次进入改图页
- **THEN** 「高级」面板处于折叠状态

### Requirement: 提交按钮位置

「发起 AI 改图」按钮 SHALL 位于 Collapse 面板下方，行为与现有一致（无图片时 disabled）。

#### Scenario: 无图片禁止提交

- **WHEN** 用户未上传任何图片
- **THEN** 「发起 AI 改图」按钮为 disabled 状态
