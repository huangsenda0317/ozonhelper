## ADDED Requirements

### Requirement: 登录页短信登录 Tab

登录页 `/login` SHALL 提供「密码登录」与「短信登录」Tab 切换。短信登录 Tab MUST 包含：手机号输入框、获取验证码按钮、验证码输入框、登录按钮。

#### Scenario: Tab 切换

- **WHEN** 用户点击「短信登录」Tab
- **THEN** 显示手机号与验证码表单，隐藏密码字段

#### Scenario: 密码登录不受影响

- **WHEN** 用户点击「密码登录」Tab
- **THEN** 显示原有邮箱密码表单，行为与改动前一致

### Requirement: 验证码倒计时

点击「获取验证码」成功后，按钮 MUST 进入 60 秒倒计时状态且不可再次点击；倒计时结束后恢复可点击。

#### Scenario: 发送成功后倒计时

- **WHEN** `/auth/sms/send` 返回成功
- **THEN** 按钮文案变为「{n}s 后重试」，60 秒内 disabled

#### Scenario: 发送失败不倒计时

- **WHEN** `/auth/sms/send` 返回错误
- **THEN** 显示错误提示，按钮保持可点击状态

### Requirement: AuthProvider 短信登录方法

`AuthProvider` SHALL 提供 `loginWithSms(phone: string, code: string)` 方法，调用 `POST /api/v1/auth/sms/login`，成功后 MUST 与 `login()` 相同方式存储 `access_token` 与 `user` 到 localStorage。

#### Scenario: 短信登录成功

- **WHEN** 用户提交有效手机号与验证码
- **THEN** localStorage 写入 token，`hasToken=true`，跳转至 `/tracking`

#### Scenario: 短信登录失败

- **WHEN** API 返回 401 或 429
- **THEN** 页面显示对应错误信息，不写入 token

### Requirement: 手机号前端校验

前端 MUST 在发送验证码前校验手机号为 11 位且符合 `^1[3-9]\d{9}$`；不符合时禁用发送按钮并提示「请输入正确的手机号」。

#### Scenario: 无效手机号

- **WHEN** 用户输入「12345」并点击获取验证码
- **THEN** 不发起 API 请求，显示校验错误

### Requirement: 视觉风格一致

短信登录 UI MUST 遵循项目 Apple Design 规范：Action Blue 主色、pill 形按钮、与现有登录卡片布局一致。

#### Scenario: 样式一致

- **WHEN** 用户查看短信登录 Tab
- **THEN** 按钮、输入框、卡片样式与密码登录 Tab 视觉统一
