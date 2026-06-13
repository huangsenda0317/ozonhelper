# ai-translate-text Specification

## Purpose
TBD - created by archiving change ai-translate-page-optimization. Update Purpose after archive.
## Requirements
### Requirement: 同步文本翻译 API

系统 SHALL 提供 `POST /ai/translate-text` 端点，接受认证用户的原始文本及语言对，同步调用腾讯云 TMT 并返回译文。

#### Scenario: 成功翻译

- **WHEN** 已认证用户提交 `source_text`（1–6000 字符）、`source_lang=zh`、`target_lang=ru`
- **THEN** 系统返回 HTTP 200，`success=true`，`data.target_text` 为俄文译文，`data.used_amount` 为消耗字符数

#### Scenario: 空文本拒绝

- **WHEN** 用户提交空字符串或仅空白字符的 `source_text`
- **THEN** 系统返回 HTTP 422 校验错误

#### Scenario: 超长文本拒绝

- **WHEN** 用户提交超过 6000 字符的 `source_text`
- **THEN** 系统返回 HTTP 422 校验错误

#### Scenario: TMT 服务失败

- **WHEN** TMT API 返回错误或超时
- **THEN** 系统返回 HTTP 502 或 503，`success=false`，包含可读错误信息

#### Scenario: 未认证拒绝

- **WHEN** 未携带有效 JWT 的请求访问该端点
- **THEN** 系统返回 HTTP 401

### Requirement: 长文本自动分段

当 `source_text` 超过 TMT 单次请求上限时，系统 SHALL 使用现有 `TMTTranslator` 分段逻辑依次翻译并拼接结果。

#### Scenario: 分段翻译成功

- **WHEN** 用户提交 4000 字符文本且内部分段为 2 段
- **THEN** 系统返回完整拼接译文，`used_amount` 为各段消耗之和
