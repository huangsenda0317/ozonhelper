# sms-auth Specification

## Purpose
TBD - created by archiving change add-sms-login. Update Purpose after archive.
## Requirements
### Requirement: 阿里云短信服务配置

后端 Settings SHALL 从环境变量读取阿里云号码认证配置：`ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`ALIYUN_SMS_SIGN_NAME`、`ALIYUN_SMS_TEMPLATE_CODE`；可选 `ALIYUN_SMS_SCHEME_NAME`（默认「默认方案」）、`ALIYUN_SMS_CODE_LENGTH`（默认 6）、`ALIYUN_SMS_VALID_TIME`（默认 300）、`ALIYUN_SMS_INTERVAL`（默认 60）。AccessKey ID 或 Secret 缺失时，SMS 端点 MUST 返回 HTTP 503，错误码 `SMS_NOT_CONFIGURED`。

#### Scenario: 配置完整

- **WHEN** 所有必填环境变量已设置且用户请求发送验证码
- **THEN** 后端可调用阿里云 `SendSmsVerifyCode` API

#### Scenario: 配置缺失

- **WHEN** `ALIYUN_ACCESS_KEY_ID` 或 `ALIYUN_ACCESS_KEY_SECRET` 未设置
- **THEN** 返回 HTTP 503，body 含 `SMS_NOT_CONFIGURED` 及配置提示

### Requirement: 发送短信验证码 API

系统 SHALL 提供 `POST /api/v1/auth/sms/send`，接受 JSON `{ "phone": "<11位手机号>" }`。后端 MUST 校验手机号为中国大陆格式（`^1[3-9]\d{9}$`），调用阿里云 [SendSmsVerifyCode](https://next.api.aliyun.com/document/Dypnsapi/2017-05-25/SendSmsVerifyCode)，使用配置的 SignName、TemplateCode、SchemeName 及 `TemplateParam={"code":"##code##","min":"5"}`。

#### Scenario: 成功发送验证码

- **WHEN** 用户提供有效手机号且阿里云返回 `Code=OK`
- **THEN** 返回 HTTP 200，`success=true`，不返回验证码明文

#### Scenario: 手机号格式无效

- **WHEN** 手机号不符合 `^1[3-9]\d{9}$`
- **THEN** 返回 HTTP 422，错误码 `INVALID_PHONE`

#### Scenario: 发送过于频繁

- **WHEN** 同一手机号在 Interval 内重复请求且阿里云拒绝
- **THEN** 返回 HTTP 429，错误码 `SMS_RATE_LIMITED`

#### Scenario: 阿里云服务异常

- **WHEN** 阿里云 API 返回非 OK 错误
- **THEN** 返回 HTTP 502，错误码 `SMS_SEND_FAILED`，日志记录 RequestId

### Requirement: 短信验证码登录 API

系统 SHALL 提供 `POST /api/v1/auth/sms/login`，接受 JSON `{ "phone": "<手机号>", "code": "<验证码>" }`。后端 MUST 调用阿里云 [CheckSmsVerifyCode](https://next.api.aliyun.com/document/Dypnsapi/2017-05-25/CheckSmsVerifyCode)，以响应 `Model.VerifyResult == "PASS"` 作为验证成功唯一依据。

#### Scenario: 验证码正确且用户已存在

- **WHEN** 手机号已注册且 `VerifyResult=PASS`
- **THEN** 返回 HTTP 200，body 含 `access_token`、`token_type=bearer`、`expires_in`（与密码登录一致）

#### Scenario: 验证码正确且首次登录自动注册

- **WHEN** 手机号不存在且 `VerifyResult=PASS`
- **THEN** 创建新用户（`phone` 填入、`password_hash` 为空、占位 email、`name` 默认「用户{后4位}」），返回 JWT

#### Scenario: 验证码错误或过期

- **WHEN** `VerifyResult` 不为 `PASS`
- **THEN** 返回 HTTP 401，错误码 `INVALID_SMS_CODE`

#### Scenario: 用户已被禁用

- **WHEN** 手机号对应用户 `is_active=false`
- **THEN** 返回 HTTP 403，错误码 `USER_DISABLED`

### Requirement: 用户模型手机号字段

`users` 表 SHALL 新增 `phone` 列（`VARCHAR(20)`，唯一索引，可空）。`password_hash` SHALL 改为可空以支持无密码短信用户。已有邮箱用户 MUST NOT 受影响。

#### Scenario: 短信用户无密码

- **WHEN** 用户仅通过短信注册
- **THEN** `password_hash` 为 NULL，邮箱登录不可用

#### Scenario: 手机号唯一

- **WHEN** 两个用户尝试绑定同一手机号
- **THEN** 数据库唯一约束阻止重复

### Requirement: 阿里云 SDK 封装

后端 SHALL 封装 `AliyunSmsService`，使用 `alibabacloud_dypnsapi20170525` SDK，提供 `send_verify_code(phone)` 与 `check_verify_code(phone, code) -> bool` 方法。日志 MUST NOT 记录完整验证码。

#### Scenario: 发送封装

- **WHEN** `send_verify_code("13800138000")` 被调用
- **THEN** SDK 发起 SendSmsVerifyCode，SchemeName 与配置一致

#### Scenario: 核验封装

- **WHEN** `check_verify_code("13800138000", "123456")` 被调用且阿里云返回 PASS
- **THEN** 方法返回 `True`

