## Why

当前平台仅支持邮箱+密码登录，对国内运营人员不够友好——密码记忆成本高、注册流程繁琐。接入阿里云号码认证服务（Dypnsapi）短信验证码登录，可让用户用手机号快速登录或自动注册，降低使用门槛，同时复用阿里云托管的验证码生成、频控与核验能力，减少自建短信基础设施的安全与合规负担。

## What Changes

- 新增后端短信验证码发送接口 `POST /api/v1/auth/sms/send`，调用阿里云 [SendSmsVerifyCode](https://next.api.aliyun.com/document/Dypnsapi/2017-05-25/SendSmsVerifyCode) 向手机号下发验证码
- 新增后端短信登录接口 `POST /api/v1/auth/sms/login`，调用阿里云 [CheckSmsVerifyCode](https://next.api.aliyun.com/document/Dypnsapi/2017-05-25/CheckSmsVerifyCode) 核验验证码，成功后签发与现有密码登录一致的 JWT
- 扩展 `User` 模型：新增 `phone` 字段（唯一、可空），支持「手机号首次登录自动注册」；保留现有邮箱+密码登录不变
- 前端登录页增加「短信登录」Tab：手机号输入、获取验证码（倒计时）、验证码输入、登录
- 新增环境变量配置：阿里云 AccessKey、签名名称、模板 CODE、方案名称等
- 新增 Python 依赖：`alibabacloud_dypnsapi20170525`

## Capabilities

### New Capabilities

- `sms-auth`: 阿里云短信验证码发送与核验、手机号登录/自动注册、频控与错误处理
- `sms-login-ui`: 前端登录页短信登录 Tab、验证码倒计时、与 `AuthProvider` 集成

### Modified Capabilities

（无 — 现有 openspec 规格未定义认证行为；邮箱密码登录保持兼容，不修改其他能力规格）

## Impact

- **后端**: `backend/src/api/auth.py` 新增 SMS 路由；`backend/src/models/user.py` 新增 `phone` 字段及迁移；新增 `backend/src/services/sms/aliyun_sms.py`；`backend/src/schemas/auth.py` 新增 SMS 相关 Schema；`backend/src/config.py` 新增阿里云配置项
- **前端**: `frontend/src/app/login/page.tsx` 增加短信登录 UI；`frontend/src/lib/auth-context.tsx` 新增 `loginWithSms` 方法
- **数据库**: Alembic 迁移为 `users.phone` 添加唯一索引
- **配置**: `backend/.env` / `.env.example` 增加 `ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`ALIYUN_SMS_SIGN_NAME`、`ALIYUN_SMS_TEMPLATE_CODE`、`ALIYUN_SMS_SCHEME_NAME` 等
- **依赖**: `alibabacloud_dypnsapi20170525`、`alibabacloud_credentials`（或复用项目已有阿里云 SDK 模式）
- **外部系统**: 阿里云号码认证服务（Dypnsapi 2017-05-25）；需控制台开通服务并配置赠送签名/模板（个人开发者可免资质接入）
