## Context

- 当前认证体系：`POST /api/v1/auth/login`（邮箱+密码）→ JWT；`User` 模型以 `email` 为唯一标识，`password_hash` 必填
- 前端 `AuthProvider` 提供 `login(email, password)`，登录页 `/login` 仅邮箱密码表单
- 项目已集成腾讯云 TMT、火山引擎等云服务，配置模式为 `Settings` + `.env`，无阿里云 SDK 依赖
- 阿里云号码认证服务（Dypnsapi）提供 [SendSmsVerifyCode](https://next.api.aliyun.com/document/Dypnsapi/2017-05-25/SendSmsVerifyCode) 与 [CheckSmsVerifyCode](https://next.api.aliyun.com/document/Dypnsapi/2017-05-25/CheckSmsVerifyCode) 接口，验证码生成、频控、核验均由阿里云托管；个人开发者可使用控制台赠送签名/模板，[免资质快速接入](https://help.aliyun.com/zh/pnvs/use-cases/sms-verify-for-individual-developers)

## Goals / Non-Goals

**Goals:**

- 用户输入中国大陆手机号 → 获取短信验证码 → 验证通过后登录（首次自动注册）
- 验证码发送与核验调用阿里云 Dypnsapi，复用其频控（默认 60s 间隔）与有效期（默认 300s）
- 登录成功后返回与密码登录一致的 JWT（`TokenResponse`）
- 前端登录页增加「短信登录」Tab，含 60s 倒计时与错误提示
- 保留现有邮箱+密码登录，两种登录方式并存

**Non-Goals:**

- 短信注册独立页面（首次短信登录即自动注册）
- 手机号绑定/换绑、多因素认证（MFA）
- 国际手机号（CountryCode 固定 86）
- 自建 Redis 验证码存储（核验完全依赖阿里云 CheckSmsVerifyCode）
- 短信找回密码、短信修改密码
- 图形验证码 / 滑块人机验证（后续按需加）

## Decisions

### 1. 核验策略：阿里云 CheckSmsVerifyCode，非本地 Redis

**选择**: 发送时调用 `SendSmsVerifyCode`（`TemplateParam={"code":"##code##","min":"5"}`，`CodeType=1` 纯数字）；登录时调用 `CheckSmsVerifyCode`，以 `Model.VerifyResult == "PASS"` 为成功依据。

**理由**: 阿里云文档明确核验结果仅以 `VerifyResult` 为准；避免本地存储验证码的一致性与安全问题；频控由 `Interval` 参数与阿里云侧策略承担。

**备选**: Redis 存验证码 + 本地比对 — 与阿里云能力重复，且 `CheckSmsVerifyCode` 无法校验非阿里云生成的码。

### 2. 用户模型：新增 `phone`，首次登录自动注册

**选择**:

- `users.phone`：`String(20)`，唯一索引，可空（兼容历史邮箱用户）
- `password_hash` 改为可空（短信注册用户无密码）
- 首次短信登录：若 `phone` 不存在则 `INSERT`，`name` 默认为 `用户{phone后4位}`，`email` 使用占位 `{phone}@sms.ozonhelper.local`（内部标识，非真实邮箱）
- 已有手机号用户：直接签发 JWT

**理由**: 最小改动实现「手机号即账号」；占位 email 满足现有 `email NOT NULL UNIQUE` 约束，不影响邮箱登录用户。

**备选**: 单独 `phone_accounts` 表 — 过度设计，MVP 不必要。

### 3. API 设计

**选择**:

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/sms/send` | POST | `{ "phone": "13800138000" }` → 调用 SendSmsVerifyCode |
| `/api/v1/auth/sms/login` | POST | `{ "phone": "13800138000", "code": "123456" }` → CheckSmsVerifyCode + 签发 JWT |

发送接口额外校验：手机号格式（`^1[3-9]\d{9}$`）；可选 Redis 记录发送次数防刷（MVP 依赖阿里云 Interval）。

**理由**: RESTful、与现有 `/auth/login` 并列，前端易集成。

### 4. 阿里云 SDK 集成

**选择**: 使用 [Python Tea SDK](https://next.api.aliyun.com/api-tools/sdk/Dypnsapi?version=2017-05-25&language=python-tea)：

```python
pip install alibabacloud_dypnsapi20170525 alibabacloud_credentials
```

封装 `AliyunSmsService`：

- `send_verify_code(phone: str) -> None`
- `check_verify_code(phone: str, code: str) -> bool`

配置项（`Settings`）：

| 环境变量 | 说明 |
|----------|------|
| `ALIYUN_ACCESS_KEY_ID` | RAM 用户 AccessKey |
| `ALIYUN_ACCESS_KEY_SECRET` | AccessKey Secret |
| `ALIYUN_SMS_SIGN_NAME` | 控制台赠送签名，如「速通互联验证码」 |
| `ALIYUN_SMS_TEMPLATE_CODE` | 赠送模板 CODE，如 `100001` |
| `ALIYUN_SMS_SCHEME_NAME` | 方案名称，默认「默认方案」 |
| `ALIYUN_SMS_CODE_LENGTH` | 验证码长度，默认 6 |
| `ALIYUN_SMS_VALID_TIME` | 有效秒数，默认 300 |
| `ALIYUN_SMS_INTERVAL` | 发送间隔秒数，默认 60 |

**理由**: 官方 SDK 处理签名与重试；与项目其他云服务封装模式一致。

### 5. 前端登录页 UX

**选择**: `/login` 页顶部 Tab 切换「密码登录 | 短信登录」：

- 短信 Tab：手机号输入、`获取验证码` 按钮（60s 倒计时）、验证码输入、登录
- `AuthProvider.loginWithSms(phone, code)` 调用 `/auth/sms/login`，成功后与密码登录相同存储 token
- Apple Design 风格保持一致（pill 按钮、Action Blue）

**理由**: 单页双模式，用户无需跳转；倒计时在前端本地实现，发送失败显示后端错误信息。

### 6. 安全与错误处理

**选择**:

- 手机号格式校验前后端双重校验
- 阿里云返回非 `OK` 或 `VerifyResult != PASS` 时返回 `401` / `429`（频控）/ `503`（服务未配置）
- 日志记录 RequestId，不记录完整验证码
- AccessKey 仅环境变量，不入库、不前端暴露

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 阿里云账号未开通号码认证服务 | 启动时可选健康检查；未配置时 send/login 返回 `503 SMS_NOT_CONFIGURED` |
| 短信费用与恶意刷接口 | 依赖阿里云 Interval + 后续可加 IP 限流 / 图形验证码 |
| 占位 email 与真实邮箱冲突 | 使用 `@sms.ozonhelper.local` 后缀，文档说明不可用于邮箱登录 |
| `password_hash` 可空影响旧逻辑 | 邮箱登录路径仍校验 password_hash 非空；注册路径不变 |
| CheckSmsVerifyCode 需与 Send 时 SchemeName 一致 | 统一从 Settings 读取同一 scheme_name |

## Migration Plan

1. Alembic 迁移：`ADD COLUMN phone`，`ALTER password_hash DROP NOT NULL`，创建 `phone` 唯一索引
2. 部署前在阿里云控制台开通号码认证、配置赠送签名/模板、创建 RAM 子账号并授予 `AliyunDypnsFullAccess`
3. 配置 `.env` 阿里云密钥与签名/模板参数
4. 部署后端 → 部署前端
5. 回滚：关闭 SMS Tab（前端 feature flag 或 revert）；数据库迁移可保留 phone 列（nullable，无数据影响）

## Open Questions

- [ ] 用户是否需在控制台确认具体的 **SignName** 与 **TemplateCode**（需在阿里云赠送签名/模板页面选取）
- [ ] 是否允许已有邮箱用户后续绑定手机号（本阶段不做，留作迭代）
- [ ] 生产环境是否需接入图形验证码防刷（MVP 暂不实现）

## 实施前需用户提供的资料

| 资料 | 用途 | 获取方式 |
|------|------|----------|
| 阿里云 AccessKey ID / Secret | API 鉴权 | [RAM 控制台](https://ram.console.aliyun.com/) 创建子账号，授予 `AliyunDypnsFullAccess` |
| 号码认证服务开通 | 启用 Dypnsapi | [号码认证控制台](https://dypns.console.aliyun.com/) 开通短信认证 |
| SignName（签名名称） | SendSmsVerifyCode 必填 | 控制台「赠送签名配置」页面选择，如「速通互联验证码」 |
| TemplateCode（模板 CODE） | SendSmsVerifyCode 必填 | 控制台「赠送模板配置」页面选择，须与签名配套 |
| SchemeName（方案名称） | 发送与核验需一致 | 控制台认证方案，不填则默认「默认方案」 |
| TemplateParam 格式 | 模板变量 | 通常为 `{"code":"##code##","min":"5"}`，以控制台模板变量为准 |
| 测试手机号 | 联调发送/登录 | 开发者本人手机号，注意短信费用 |
