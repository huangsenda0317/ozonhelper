## Requirements

### Requirement: 类目与属性查询工具

MCP SHALL 提供语义工具：
- `get_category_tree` → `POST /v1/description-category/tree`
- `get_category_attributes` → `POST /v1/description-category/attribute`
- `get_attribute_values` → `POST /v1/description-category/attribute/values`

#### Scenario: 获取类目树

- **WHEN** Agent 调用 `get_category_tree` 无参数
- **THEN** 返回 Ozon 类目与类型树形结构 JSON

#### Scenario: 获取类目属性

- **WHEN** Agent 传入 `description_category_id` 与 `type_id`
- **THEN** 返回该类目下必填与可选属性列表

### Requirement: 商品导入与状态查询

MCP SHALL 提供：
- `import_products` → `POST /v3/product/import`（items 数组，单次最多 100 件）
- `get_import_status` → `POST /v1/product/import/info`（task_id）

#### Scenario: 批量导入商品

- **WHEN** Agent 传入符合 Ozon schema 的 `items` 数组（≤100 条）
- **THEN** 返回含 `task_id` 的导入任务响应

#### Scenario: 查询导入进度

- **WHEN** Agent 传入 `task_id`
- **THEN** 返回导入/更新任务状态与错误明细

### Requirement: 商品查询与管理工具

MCP SHALL 提供：
- `get_product_list` → `POST /v3/product/list`
- `get_product_info` → `POST /v3/product/info/list`
- `import_product_pictures` → `POST /v1/product/pictures/import`
- `archive_product` → `POST /v1/product/archive`
- `unarchive_product` → `POST /v1/product/unarchive`

#### Scenario: 分页列出商品

- **WHEN** Agent 传入 `visibility`（默认 ALL）、`limit`、`last_id`
- **THEN** 返回商品 ID 列表与 `last_id` 游标

#### Scenario: 批量获取商品详情

- **WHEN** Agent 传入 `product_ids`、`offer_ids` 或 `skus` 之一
- **THEN** 返回商品名称、价格、库存、状态、图片等详情

#### Scenario: 上传商品图片

- **WHEN** Agent 传入 `product_id` 与 `images` URL 列表
- **THEN** 返回图片导入结果
