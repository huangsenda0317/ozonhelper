## ADDED Requirements

### Requirement: 库存快照同步

系统 SHALL 通过 Celery 任务调用 `POST /v4/product/info/stocks` 同步库存至 `inventory_snapshots` 表，字段含：
`store_id`、`product_id`、`offer_id`、`present`（可用）、`reserved`（预留）、`warehouse_id`、`synced_at`。

#### Scenario: 库存定时同步

- **WHEN** 库存同步任务执行
- **THEN** 更新所有已同步商品的库存快照

### Requirement: 库存列表 API

后端 SHALL 提供 `GET /api/v1/tracking/inventory?store_id=`，支持：
- `search`、`has_stock`、`low_stock`（低于阈值）
- `sort_by`（present、offer_id、name）
- 分页

#### Scenario: 低库存筛选

- **WHEN** 用户请求 `low_stock=true`
- **THEN** 返回 `present < threshold` 的商品库存记录

### Requirement: 批量改库存

后端 SHALL 提供 `POST /api/v1/tracking/inventory/batch-update`，Body 含 `items[]`（`product_id`、`warehouse_id`、`stock`），调用 `POST /v2/products/stocks` 并更新本地快照。

单次请求 MUST 不超过 Ozon 官方上限（100 条），超出时后端分批执行。

#### Scenario: 批量改库存成功

- **WHEN** 用户提交 10 条库存变更且 Ozon 接受
- **THEN** 返回全部成功，本地快照更新

#### Scenario: 部分失败

- **WHEN** Ozon 对部分 SKU 返回错误
- **THEN** 返回逐条 success/failure 明细

### Requirement: 低库存预警配置

后端 SHALL 提供 `PUT /api/v1/tracking/inventory/alert-config?store_id=`，Body 含 `low_stock_threshold`（默认 5）。

系统 MUST 在同步后检测 `present < threshold` 并写入 `alerts` 表（FR-035）。

#### Scenario: 配置阈值

- **WHEN** 用户设置阈值为 10
- **THEN** 后续同步中 present < 10 的商品产生低库存预警

### Requirement: 库存中心页面

前端 SHALL 在 `/tracking/inventory` 提供：
- 库存列表（商品名、SKU、可用/预留库存、仓库）
- 低库存高亮（标红）
- 行内编辑或批量改库存对话框
- 预警阈值设置入口

#### Scenario: 库存页低库存高亮

- **WHEN** 商品可用库存低于阈值
- **THEN** 该行以警告色展示
