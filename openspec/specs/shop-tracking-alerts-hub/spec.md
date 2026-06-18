# shop-tracking-alerts-hub Specification

## Purpose
TBD - created by archiving change shop-tracking-erp-phase2. Update Purpose after archive.
## Requirements
### Requirement: 统一预警聚合 API

后端 SHALL 扩展 `GET /api/v1/tracking/alerts?store_id=` 支持 `type` 筛选：
`low_stock`、`order_overdue`、`product_exception`、`logistics`、`bad_review`、`price_anomaly`、`all`。

响应项 MUST 含：`id`、`type`、`severity`、`title`、`message`、`resource_type`、`resource_id`、`created_at`、`status`（unhandled/handled/ignored，适用时）。

`alert_counts` 在 dashboard 中 MUST 扩展含：`logistics`、`bad_review`、`price_anomaly`。

#### Scenario: 获取全部未处理预警

- **WHEN** type=all status=unhandled
- **THEN** 返回各类型未处理预警合并列表，logistics 与 order_overdue 置顶

### Requirement: 差评提醒 FR-036

系统 SHALL 在商品收到新差评（评分 ≤ 2 星）时生成 alert type `bad_review`。

Celery 任务 `sync_review_alerts` SHALL 增量检测并写入 `review_alerts` 与统一 alerts 表。

#### Scenario: 新差评通知

- **WHEN** 同步发现 SKU 新增 2 星评价
- **THEN** 生成 bad_review alert 且 alerts hub 展示商品名与评分

#### Scenario: 已读差评

- **WHEN** 用户标记 alert handled
- **THEN** 同 SKU 同 review_id 不重复提醒

### Requirement: 预警 hub 页面

前端 SHALL 重构 `/tracking/alerts` 为统一预警中心：
- 类型 Tab 或筛选器（全部/库存/订单/商品/物流/差评/价格）
- 列表项：图标（Lucide SVG）、标题、时间、severity 色条、快捷跳转
- 批量标记已处理/忽略
- 空状态引导同步

#### Scenario: 物流预警跳转

- **WHEN** 用户点击 logistics 类型 alert
- **THEN** 跳转 `/tracking/logistics-alerts` 或对应订单详情

### Requirement: 可选实时推送

后端 SHALL 在未来迭代提供 `GET /api/v1/tracking/alerts/stream` SSE，用于推送新 alert 事件；Phase2 当前版本不要求实现该端点。前端 MAY 在 SSE 可用时展示浏览器通知（需用户授权）。

#### Scenario: SSE 新预警

- **WHEN** 检测任务产生新 logistics alert 且客户端已订阅 SSE
- **THEN** SSE 客户端收到 event 且 alerts 列表可增量更新

