# shop-tracking-logistics-alerts Specification

## Purpose
TBD - created by archiving change shop-tracking-erp-phase2. Update Purpose after archive.
## Requirements
### Requirement: 物流预警阈值配置

后端 SHALL 提供 `GET/PUT /api/v1/tracking/logistics-alerts/config?store_id=`，支持节点类型：
`pending_pack`、`pending_pickup`、`transport_stall`、`pending_delivery`、`abnormal`。

每项含 `enabled`（boolean）、`threshold_days`（1-30 整数）。

默认值 SHALL 为：2、3、5、7、3 天。

#### Scenario: 修改待打包阈值

- **WHEN** 用户设置 pending_pack threshold_days=1
- **THEN** 配置持久化且下次检测任务生效

### Requirement: 物流超时检测

Celery 任务 `check_logistics_alerts` SHALL 每 30 分钟执行，对比 `synced_orders` 节点时间与配置阈值，生成或更新 `logistics_alert_events`：
`store_id`、`posting_number`、`node_type`、`overdue_days`、`triggered_at`、`status`（unhandled/handled/ignored）、`note`、`handled_at`。

判定规则：
- pending_pack：订单创建后无 packed_at 超过阈值
- pending_pickup：shipped_at 后无揽收更新超过阈值
- transport_stall：last_tracking_at 超过阈值无更新
- pending_delivery：抵达目的地后无 delivered_at 超过阈值
- abnormal：tracking_status 含 return/exception 关键词

#### Scenario: 运输停滞预警

- **WHEN** 订单 last_tracking_at 距今 6 天且 transport_stall 阈值 5 天
- **THEN** 创建 logistics_alert_event status=unhandled

### Requirement: 物流预警 API

后端 SHALL 提供：
- `GET /api/v1/tracking/logistics-alerts?store_id=&status=&node_type=`：预警台账分页
- `PATCH /api/v1/tracking/logistics-alerts/{id}`：更新 status 与 note

#### Scenario: 标记已处理

- **WHEN** 用户 PATCH status=handled 并填写 note
- **THEN** 记录 handled_at 且列表默认不再展示（除非筛选全部）

### Requirement: 物流预警页面

前端 SHALL 在 `/tracking/logistics-alerts` 提供：
- 阈值配置面板（可折叠）
- 预警台账表格：订单号、节点类型、超时时长、商品摘要、状态、操作
- 未处理订单置顶标红
- 一键跳转 `/tracking/orders?posting_number=`

#### Scenario: 台账筛选

- **WHEN** 用户筛选 status=unhandled
- **THEN** 仅展示未处理预警且按 overdue_days desc 排序

