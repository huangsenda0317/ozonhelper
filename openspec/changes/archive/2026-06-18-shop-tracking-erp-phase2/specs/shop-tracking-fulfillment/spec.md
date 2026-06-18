## ADDED Requirements

### Requirement: FBS 发货 API

后端 SHALL 提供 `POST /api/v1/tracking/orders/{posting_number}/ship?store_id=`，请求体含：
`tracking_number`、`delivery_method_id`（可选）、`packages[]`（可选）。

系统 MUST 调用 Ozon FBS ship 端点并更新 `synced_orders.status` 与 `shipped_at`。

#### Scenario: 单笔 FBS 发货

- **WHEN** 用户提交有效运单号
- **THEN** Ozon 订单状态更新为已发货且本地 synced_orders 同步

#### Scenario: 无效运单

- **WHEN** Ozon 拒绝 ship 请求
- **THEN** 返回 422 与 Ozon 错误信息，订单状态不变

### Requirement: FBO 物流轨迹同步

Celery 任务 `sync_order_tracking` SHALL 拉取 FBO/FBS 订单物流节点，写入 `synced_orders.tracking_events` JSONB 及 `last_tracking_at`。

#### Scenario: 轨迹更新

- **WHEN** Ozon 返回新物流节点
- **THEN** tracking_events 追加且 last_tracking_at 更新

### Requirement: 订单批量操作 API

后端 SHALL 提供：
- `POST /api/v1/tracking/orders/export?store_id=`：按筛选条件导出 CSV
- `PATCH /api/v1/tracking/orders/batch-note?store_id=`：批量更新卖家备注

#### Scenario: 导出待发货订单

- **WHEN** 用户筛选 status=待发货 并导出
- **THEN** 下载 CSV 含订单号、SKU、数量、金额、创建时间

### Requirement: 售后订单同步

Celery 任务 SHALL 同步退货/退款列表至 `return_orders` 表。后端提供 `GET /api/v1/tracking/returns?store_id=` 只读列表。

#### Scenario: 退货列表

- **WHEN** 用户访问售后 Tab
- **THEN** 展示 return_id、posting_number、status、reason、created_at

### Requirement: 订单履约 UI 扩展

前端 SHALL 在 `/tracking/orders` 扩展：
- 订单详情/行内「发货」按钮（FBS）：运单号表单
- 批量导出、批量备注
- 面单：「在 Ozon 打开面单」外链（新窗口）
- 物流轨迹时间线（有 tracking_events 时）

#### Scenario: FBS 发货流程

- **WHEN** 用户在待发货订单录入运单并确认
- **THEN** 订单位移出待发货 Tab 且展示成功 toast
