## ADDED Requirements

### Requirement: 中文编辑提示 Banner

编辑加工页 SHALL 在表单顶部展示 info banner，说明当前字段以中文编辑，上架前将自动转为俄文。

#### Scenario: Banner 展示

- **WHEN** 用户打开编辑加工页
- **THEN** 页面顶部展示 info banner
- **AND** 文案包含「当前以中文编辑，上架前将自动转为俄文」或等价说明

#### Scenario: 深色模式

- **WHEN** 用户切换深色主题
- **THEN** info banner 颜色与边框适配当前主题且文字可读

### Requirement: AI 一键优化入口

编辑加工页 SHALL 提供 primary 按钮「AI 一键优化」，位于 info banner 区域或 sticky 操作栏，使用 Lucide 图标（非 emoji）。

#### Scenario: 按钮可见

- **WHEN** 用户打开编辑加工页
- **THEN** 「AI 一键优化」按钮可见且可点击

#### Scenario: 优化进行中禁用

- **WHEN** AI 优化请求进行中
- **THEN** 「AI 一键优化」按钮展示 loading 态且不可重复点击

### Requirement: AI 优化覆盖字段

点击「AI 一键优化」SHALL 优化并覆写以下中文字段：商品标题（`title_zh`）、商品标签（`tags_zh`）、商品描述（`description_zh`）。

#### Scenario: 执行 AI 优化

- **WHEN** 用户点击「AI 一键优化」
- **THEN** 系统发起优化（首期 mock）
- **AND** 完成后 `title_zh`、`tags_zh`、`description_zh` 更新为优化后的中文内容
- **AND** 页面仍以中文展示上述字段

#### Scenario: 优化成功反馈

- **WHEN** AI 优化完成
- **THEN** 展示 toast「AI 优化完成，请核对后保存」
- **AND** 记录 `ai_optimized_at` 时间戳

#### Scenario: 空字段生成

- **WHEN** 某字段为空时执行 AI 优化
- **THEN** 系统为该字段生成示例中文内容（基于 SKU/采集名称等上下文）

#### Scenario: 已有内容改写

- **WHEN** 某字段已有中文内容时执行 AI 优化
- **THEN** 系统对该字段进行改写增强，结果仍为中文

### Requirement: 优化后可编辑

AI 优化完成后，用户 SHALL 可继续手动编辑 title、tags、description，并可通过「保存信息」持久化。

#### Scenario: 手动修改优化结果

- **WHEN** AI 优化完成后用户修改标题并保存
- **THEN** 保存的是用户修改后的中文标题

#### Scenario: 再次优化

- **WHEN** 用户再次点击「AI 一键优化」
- **THEN** 系统重新优化三字段并覆写当前值

### Requirement: 俄文转换说明（本期仅提示）

编辑加工页 SHALL NOT 在加工阶段展示俄文预览或执行真实翻译；俄文转换仅通过 banner 与上架流程说明，实际上架前由翻译服务处理。

#### Scenario: 无俄文字段展示

- **WHEN** 用户在编辑加工页查看标题、标签、描述
- **THEN** 字段均以中文展示
- **AND** 不展示俄文并列预览（首期）
