## ADDED Requirements

### Requirement: FBS 订单列表与详情

MCP SHALL 提供：
- `get_fbs_unfulfilled_orders` → `POST /v4/posting/fbs/unfulfilled/list`
- `get_fbs_orders` → `POST /v4/posting/fbs/list`
- `get_fbs_order` → `POST /v3/posting/fbs/get`

#### Scenario: 获取未处理订单

- **WHEN** Agent 传入时间范围 `since`、`to` 及分页参数
- **THEN** 返回未处理货件列表

#### Scenario: 获取订单详情

- **WHEN** Agent 传入 `posting_number`
- **THEN** 返回货件商品、收件人、状态等完整信息

### Requirement: FBS 订单履约工具

MCP SHALL 提供：
- `ship_fbs_order` → `POST /v4/posting/fbs/ship`
- `print_package_label` → `POST /v2/posting/fbs/package-label`
- `mark_awaiting_delivery` → `POST /v2/posting/fbs/awaiting-delivery`
- `cancel_fbs_order` → `POST /v2/posting/fbs/cancel`

#### Scenario: 订单备货

- **WHEN** Agent 传入 `posting_number` 与 `packages` 装配信息
- **THEN** 返回备货结果

#### Scenario: 打印包裹标签

- **WHEN** Agent 传入 `posting_number`
- **THEN** 返回标签文件内容或下载链接

#### Scenario: 标记已发货

- **WHEN** Agent 传入 `posting_number`
- **THEN** 货件状态变更为等待发运/运输中

### Requirement: rFBS 物流状态工具

MCP SHALL 提供：
- `set_tracking_number` → `POST /v2/fbs/posting/tracking-number/set`
- `mark_delivering` → `POST /v2/fbs/posting/delivering`
- `mark_delivered` → `POST /v2/fbs/posting/delivered`

#### Scenario: 设置物流单号

- **WHEN** Agent 传入 `posting_number` 与 `tracking_number`
- **THEN** Ozon 记录跟踪号

#### Scenario: 标记已送达

- **WHEN** Agent 对 rFBS 订单调用 `mark_delivered`
- **THEN** 货件状态变更为已送达
