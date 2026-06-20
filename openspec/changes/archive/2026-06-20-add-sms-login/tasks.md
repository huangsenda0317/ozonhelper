## 1. 阿里云账号与配置准备（需用户配合）

- [x] 1.1 在阿里云开通号码认证服务，选取赠送 SignName 与 TemplateCode
- [ ] 1.2 创建 RAM 子账号，授予 `AliyunDypnsFullAccess`，获取 AccessKey ID / Secret
- [x] 1.3 在 `backend/.env` 与 `.env.example` 添加 `ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`ALIYUN_SMS_SIGN_NAME`、`ALIYUN_SMS_TEMPLATE_CODE`、`ALIYUN_SMS_SCHEME_NAME` 等配置项

## 2. 后端依赖与 Settings

- [x] 2.1 在 `backend/requirements.txt`（或 pyproject）添加 `alibabacloud_dypnsapi20170525`、`alibabacloud_credentials`
- [x] 2.2 在 `backend/src/config.py` 的 `Settings` 增加阿里云 SMS 相关字段及默认值

## 3. 数据库迁移

- [x] 3.1 修改 `backend/src/models/user.py`：新增 `phone` 字段，`password_hash` 改为可空
- [x] 3.2 创建 Alembic 迁移：`ADD COLUMN phone UNIQUE`，`ALTER password_hash DROP NOT NULL`
- [ ] 3.3 执行迁移并验证现有用户数据不受影响

## 4. 阿里云 SMS 服务封装

- [x] 4.1 新建 `backend/src/services/sms/aliyun_sms.py`：封装 `AliyunSmsService`
- [x] 4.2 实现 `send_verify_code(phone)`：调用 SendSmsVerifyCode（SignName、TemplateCode、SchemeName、TemplateParam、CodeType、Interval、ValidTime）
- [x] 4.3 实现 `check_verify_code(phone, code) -> bool`：调用 CheckSmsVerifyCode，判断 `VerifyResult == PASS`
- [x] 4.4 配置缺失时抛出可识别异常；日志记录 RequestId，不记录验证码

## 5. 后端 Schema 与 API

- [x] 5.1 在 `backend/src/schemas/auth.py` 新增 `SmsSendRequest`、`SmsLoginRequest`
- [x] 5.2 在 `backend/src/api/auth.py` 新增 `POST /api/v1/auth/sms/send`：手机号格式校验、调用 send_verify_code、错误码映射（INVALID_PHONE、SMS_RATE_LIMITED、SMS_SEND_FAILED、SMS_NOT_CONFIGURED）
- [x] 5.3 在 `backend/src/api/auth.py` 新增 `POST /api/v1/auth/sms/login`：check_verify_code、查找/自动创建用户、签发 JWT、错误码映射（INVALID_SMS_CODE、USER_DISABLED）
- [x] 5.4 实现短信用户自动注册逻辑：占位 email `{phone}@sms.ozonhelper.local`、默认 name

## 6. 前端 AuthProvider

- [x] 6.1 在 `frontend/src/lib/auth-context.tsx` 新增 `loginWithSms(phone, code)` 方法
- [x] 6.2 导出 `loginWithSms` 到 `useAuth` hook，成功后存储 token 与 user 信息

## 7. 前端登录页 UI

- [x] 7.1 改造 `frontend/src/app/login/page.tsx`：增加「密码登录 | 短信登录」Tab 切换
- [x] 7.2 实现短信登录表单：手机号、验证码输入、获取验证码按钮（60s 倒计时）
- [x] 7.3 前端手机号格式校验（`^1[3-9]\d{9}$`），错误提示与 Apple Design 样式一致
- [x] 7.4 短信登录成功后跳转 `/tracking`

## 8. 联调与验证

- [ ] 8.1 配置阿里云密钥后，手动测试发送验证码（真实手机号收短信）
- [ ] 8.2 手动测试短信登录（已有用户 + 首次自动注册）
- [ ] 8.3 手动测试频控（60s 内重复发送）、错误验证码、配置缺失 503
- [ ] 8.4 确认邮箱密码登录路径未回归
