## ADDED Requirements

### Requirement: 用户可终止 pending 状态的改图任务

系统 SHALL 在改图任务列表中为 `status === 'pending'` 的任务显示「终止」按钮。点击后调用 `POST /api/v1/ai/tasks/{task_id}/cancel`，将任务状态更新为 `cancelled`。

#### Scenario: 终止 pending 任务

- **WHEN** 用户对一条 pending 状态的改图任务点击「终止」
- **THEN** 任务状态变为 cancelled，按钮消失，任务不再进入 SeedEdit 处理

#### Scenario: running 任务不可终止

- **WHEN** 改图任务状态为 running
- **THEN** 不显示「终止」按钮

#### Scenario: 已终止任务不可再次终止

- **WHEN** 改图任务状态为 cancelled
- **THEN** 不显示「终止」按钮，StatusBadge 显示「已取消」

#### Scenario: 终止后 Celery 任务不执行

- **WHEN** pending 任务被终止且 Celery worker 尚未 pickup
- **THEN** Celery 任务被 revoke，worker 不会处理该任务

#### Scenario: Worker 入口检查 cancelled 状态

- **WHEN** Celery worker pickup 一个任务但 DB 状态已为 cancelled
- **THEN** worker 直接返回，不调用 SeedEdit API

### Requirement: 取消 API 校验与响应

后端 `POST /api/v1/ai/tasks/{task_id}/cancel` SHALL 仅接受 `status == 'pending'` 的任务，其他状态返回 409 Conflict。

#### Scenario: 成功取消

- **WHEN** 客户端请求取消一条 pending 任务
- **THEN** 返回 200，`data.status` 为 `cancelled`，`completed_at` 已设置

#### Scenario: 取消非 pending 任务

- **WHEN** 客户端请求取消一条 running 或 success 任务
- **THEN** 返回 409，`message` 说明「仅 pending 状态任务可终止」

#### Scenario: 取消不存在的任务

- **WHEN** 客户端请求取消一个不存在的 task_id
- **THEN** 返回 404 Not Found

### Requirement: cancelled 状态展示

前端 StatusBadge SHALL 支持 `cancelled` 状态，显示为灰色「已取消」标签。

#### Scenario: 任务列表展示已取消任务

- **WHEN** 任务列表包含 cancelled 状态的任务
- **THEN** StatusBadge 显示灰色「已取消」文字
