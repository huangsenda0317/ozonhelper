## ADDED Requirements

### Requirement: 财务交易同步

Celery 任务 `sync_store_finance` SHALL 增量同步 Ozon 财务交易至 `finance_transactions` 表，字段至少含：
`store_id`、`transaction_id`、`type`、`amount`、`currency`、`posting_number`（可选）、`sku`（可选）、`operation_date`、`description`、`synced_at`。

#### Scenario: 增量同步

- **WHEN** 任务执行且存在上次同步时间点
- **THEN** 仅拉取新交易并 upsert

### Requirement: 财务汇总 API

后端 SHALL 提供 `GET /api/v1/tracking/finance/summary?store_id=&range=7|30|month` 返回：
- `total_revenue`、`total_fees`、`total_refunds`、`net_settlement`
- `gross_profit`（基于 profit_configs 与订单数据估算）
- `transaction_count`

#### Scenario: 月度汇总

- **WHEN** range=month
- **THEN** 返回当月聚合指标

### Requirement: 单品利润 API

后端 SHALL 提供 `GET /api/v1/tracking/finance/product-profit?store_id=` 分页返回每 SKU：
`product_id`、`offer_id`、`revenue`、`units_sold`、`platform_fees`、`estimated_cost`、`gross_profit`、`margin_rate`。

#### Scenario: 利润排序

- **WHEN** sort_by=margin_rate desc
- **THEN** 返回毛利率最高的 SKU 在前

### Requirement: 报表导出

后端 SHALL 提供 `GET /api/v1/tracking/finance/export?store_id=&range=&type=summary|transactions|product-profit`，返回 `.xlsx` 文件。

#### Scenario: 导出交易明细

- **WHEN** type=transactions range=30
- **THEN** 浏览器下载含 30 天交易行的 Excel

### Requirement: 财务中心页面

前端 SHALL 在 `/tracking/finance` 提供：
- KPI 卡片（回款、手续费、退款、毛利）
- ECharts 收入/费用趋势图（7/30 天）
- 交易明细表格（可筛选 type）
- 单品利润 Tab
- 导出按钮

页面 SHALL 使用 Dark 数据面板变体（ui-ux-pro-max：背景 `#F8FAFC` 或 dark tile `#0F172A`，数字列 Fira Sans）。

#### Scenario: 财务页加载

- **WHEN** 用户进入 finance 且已有同步数据
- **THEN** 3 秒内展示 KPI 与趋势图 skeleton→内容
