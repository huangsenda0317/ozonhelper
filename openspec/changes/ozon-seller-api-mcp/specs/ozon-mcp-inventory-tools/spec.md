## ADDED Requirements

### Requirement: 库存查询与更新

MCP SHALL 提供：
- `get_product_stocks` → `POST /v4/product/info/stocks`
- `get_fbs_stocks_by_warehouse` → `POST /v2/product/info/stocks-by-warehouse/fbs`
- `update_stocks` → `POST /v2/products/stocks`

#### Scenario: 查询商品库存

- **WHEN** Agent 传入 `product_ids` 或 `offer_ids`
- **THEN** 返回各 SKU 的 FBO/FBS 库存数量

#### Scenario: 更新 FBS 库存

- **WHEN** Agent 传入 `stocks` 数组（含 `offer_id`、`product_id`、`stock`、`warehouse_id`）
- **THEN** 返回 Ozon 库存更新结果

### Requirement: 价格查询与更新

MCP SHALL 提供：
- `get_product_prices` → `POST /v5/product/info/prices`
- `update_prices` → `POST /v1/product/import/prices`

#### Scenario: 查询商品价格

- **WHEN** Agent 传入 `product_ids` 或 `offer_ids`
- **THEN** 返回价格、促销价、最低价等字段

#### Scenario: 批量更新价格

- **WHEN** Agent 传入 `prices` 数组（含 `offer_id`、`price`、`old_price` 等）
- **THEN** 返回价格更新任务或结果
