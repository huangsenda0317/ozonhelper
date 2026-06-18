# shop-tracking-pricing Specification

## Purpose
TBD - created by archiving change shop-tracking-erp-phase2. Update Purpose after archive.
## Requirements
### Requirement: 价格快照同步

系统 SHALL 通过 Celery 任务 `sync_store_prices` 将当前店铺商品价格同步至 `price_snapshots` 表，字段至少含：
`store_id`、`product_id`、`offer_id`、`price`、`old_price`、`min_price_ozon`、`currency`、`synced_at`。

#### Scenario: 定时价格同步

- **WHEN** Celery Beat 触发价格同步任务
- **THEN** 批量拉取 Ozon 价格并 upsert 本地快照

### Requirement: 批量改价 API

后端 SHALL 提供 `POST /api/v1/tracking/pricing/batch-update?store_id=`，请求体含：
- `items[]`：`offer_id`、`price`、`old_price`（可选）、`min_price`（可选）
- 或 `adjustment`：`type`（fixed/percent）、`value`、`apply_to`（selected/all_filtered）

系统 MUST 调用 `POST /v2/product/price/import`，每批 ≤1000，并写入 `operation_logs`。

#### Scenario: 选中商品统一加价 10%

- **WHEN** 用户提交 percent adjustment +10% 作用于 5 个 SKU
- **THEN** Ozon 接受改价请求且本地 price_snapshots 在下次同步后更新

#### Scenario: 改价二次确认

- **WHEN** 批量改价影响超过 50 个 SKU
- **THEN** API 要求 `confirm_token` 或前端必须先展示确认对话框

### Requirement: 成本定价模型

后端 SHALL 提供 `GET/PUT /api/v1/tracking/pricing/profit-config?store_id=`，支持 SKU 级或默认店铺级配置：
`purchase_cost`、`logistics_cost`、`platform_fee_rate`（0-1）、`exchange_rate`（CNY→RUB）、`margin_buffer`（0-1）。

系统 SHALL 计算并返回 `suggested_min_price` 供列表展示。

#### Scenario: 查看保本价

- **WHEN** 用户配置成本且 SKU 有 price_snapshot
- **THEN** 价格列表展示当前价 vs 保本价，低于保本价标红

### Requirement: 价格异常检测

同步或改价后，系统 SHALL 检测：
- 当前价 < `suggested_min_price` → alert type `price_anomaly` severity `warning`
- 当前价 > 用户配置 `max_price_threshold`（可选）→ alert type `price_anomaly` severity `info`

#### Scenario: 低价违规预警

- **WHEN** 商品售价低于保本价
- **THEN** 生成价格异常 alert 并在 alerts hub 展示

### Requirement: 价格中心页面

前端 SHALL 在 `/tracking/pricing` 提供：
- 价格列表（商品名、SKU、当前价、活动价、保本价、价差）
- 多选 + 底部批量操作栏（改价对话框：固定价/百分比/活动价）
- 成本模型配置入口（Tab 或子页）
- 表格 `overflow-x-auto`，skeleton 加载态

#### Scenario: 批量改价 UI

- **WHEN** 用户选中 3 个商品并提交新价格
- **THEN** 展示 progress 与成功/失败 toast，列表刷新

