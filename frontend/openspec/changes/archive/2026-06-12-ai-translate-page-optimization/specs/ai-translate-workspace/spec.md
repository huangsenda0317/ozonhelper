## ADDED Requirements

### Requirement: 左右分栏翻译工作区

AI 翻译页 SHALL 在主区域展示左右分栏工作区：左侧为可编辑 textarea 输入原文，右侧为只读区域展示译文，两栏之间居中放置「翻译」按钮。

#### Scenario: 桌面端三列布局

- **WHEN** 用户在 viewport ≥ md 断点访问 `/ai-edit/translate`
- **THEN** 页面显示左（输入）、中（按钮）、右（输出）三列布局，左右区域等高

#### Scenario: 移动端垂直堆叠

- **WHEN** 用户在 viewport < md 断点访问该页
- **THEN** 布局变为：输入区 → 翻译按钮 → 输出区，自上而下排列

### Requirement: 发起翻译并展示结果

用户点击「翻译」按钮后，系统 SHALL 将左侧 textarea 内容提交至 `POST /ai/translate-text`，并将返回的译文显示在右侧区域。

#### Scenario: 成功翻译流程

- **WHEN** 用户在左侧输入中文文本并点击「翻译」
- **THEN** 按钮进入 loading 状态且不可重复点击，请求成功后右侧显示俄文译文，loading 结束

#### Scenario: 空输入阻止提交

- **WHEN** 左侧 textarea 为空或仅空白，用户点击「翻译」
- **THEN** 不发起 API 请求，页面提示「请输入待翻译文本」

#### Scenario: 翻译失败展示

- **WHEN** API 返回错误
- **THEN** 右侧清空或保留上次结果，页面展示错误提示信息

### Requirement: 输入辅助信息

工作区 SHALL 显示字符计数与语言方向提示（中文 → 俄文，单次最长 6000 字符）。

#### Scenario: 字符计数更新

- **WHEN** 用户在 textarea 中输入或删除文字
- **THEN** 字符计数实时更新，超过 6000 时以警告样式提示且禁用翻译按钮

### Requirement: 译文可复制

右侧译文区域 SHALL 提供「复制」操作，一键将译文写入剪贴板。

#### Scenario: 复制成功

- **WHEN** 译文已生成且用户点击「复制」
- **THEN** 译文内容写入系统剪贴板，并短暂提示复制成功

#### Scenario: 无译文时复制不可用

- **WHEN** 右侧尚无译文
- **THEN** 「复制」按钮禁用或不可见

### Requirement: 历史任务次要展示

页面 MAY 在工作区下方以可折叠区块展示既有 Celery 翻译任务列表，不影响主工作区为默认焦点。

#### Scenario: 默认收起历史

- **WHEN** 用户首次进入翻译页
- **THEN** 历史任务区块默认收起，主工作区占据视觉焦点

#### Scenario: 展开历史任务

- **WHEN** 用户点击「历史任务」展开控件
- **THEN** 显示与当前实现一致的任务列表（状态、字段译文、错误信息）
