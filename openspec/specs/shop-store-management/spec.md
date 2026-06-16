## Requirements

### Requirement: 店铺列表 API

后端 SHALL 提供 `GET /api/v1/stores`，需 JWT 认证，返回当前用户绑定的 Ozon 店铺列表（不含 api_key 明文）。

每条记录至少包含：`id`、`name`、`is_active`、`last_sync_at`、`created_at`。

#### Scenario: 获取店铺列表

- **WHEN** 已登录用户请求 `GET /api/v1/stores`
- **THEN** 返回该用户所有店铺，按 `created_at` 降序

### Requirement: 新增店铺绑定

后端 SHALL 提供 `POST /api/v1/stores`，Body 含 `name`、`client_id`、`api_key`。

系统 MUST 调用 Ozon 卖家信息校验 API 验证凭证有效性，通过后加密存储凭证并返回 201。

#### Scenario: 绑定成功

- **WHEN** 用户提供有效 Client-Id 与 Api-Key
- **THEN** 创建 Store 记录，返回店铺 id，并触发首次同步任务

#### Scenario: 凭证无效

- **WHEN** Ozon 返回 401/403
- **THEN** 返回 400，`code=OZON_AUTH_FAILED`，不创建记录

### Requirement: 解绑店铺

后端 SHALL 提供 `DELETE /api/v1/stores/{store_id}`，删除店铺及关联同步数据（级联清理 synced_products、orders、alerts 等）。

#### Scenario: 解绑成功

- **WHEN** 用户删除自己拥有的店铺
- **THEN** 返回 204，该店铺不再出现在列表中

### Requirement: 凭证校验端点

后端 SHALL 提供 `POST /api/v1/stores/{store_id}/verify`，重新校验已存凭证是否仍有效。

#### Scenario: 密钥仍有效

- **WHEN** Ozon 校验通过
- **THEN** 返回 `{ "valid": true }`

#### Scenario: 密钥已失效

- **WHEN** Ozon 返回 401/403
- **THEN** 返回 `{ "valid": false, "reason": "..." }`，前端展示重新绑定提示

### Requirement: 店铺切换与数据隔离

所有 tracking 域 API SHALL 接受 `store_id` Query 参数；未传时使用用户最近创建的活跃店铺。

用户 MUST 只能访问自己 `user_id` 下的店铺数据。

#### Scenario: 跨用户访问拒绝

- **WHEN** 用户 A 请求用户 B 的 `store_id`
- **THEN** 返回 404 Not Found

### Requirement: 店铺管理 UI

前端 SHALL 在 `/settings/stores` 提供：
- 店铺列表（名称、最后同步时间、状态）
- 新增店铺表单（名称、Client-Id、Api-Key）
- 删除确认对话框
- 凭证校验操作

凭证 MUST 仅通过页面绑定，不支持从 `.env` 自动创建默认店铺。

#### Scenario: 新增店铺表单提交

- **WHEN** 用户填写有效凭证并提交
- **THEN** 列表刷新，显示新店铺，并写入 localStorage 活跃店铺 id
