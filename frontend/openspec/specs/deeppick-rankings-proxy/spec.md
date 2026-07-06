## ADDED Requirements

### Requirement: DeepPick API 代理端点

后端 SHALL 提供 `GET /api/v1/ozon-rankings` 端点，代理 DeepPick `GET /api/v1/ozon/rankings/products`，要求用户已登录（JWT）。

#### Scenario: 获取商品榜数据

- **WHEN** 已登录用户请求 `GET /api/v1/ozon-rankings?view=product&page=1&limit=50&sort_key=sum_gmv_desc`
- **THEN** 返回 `ApiResponse`，`data.items` 为商品榜列表，`data.summary` 为 KPI 摘要，`meta` 含分页信息

#### Scenario: 获取聚合榜数据

- **WHEN** 已登录用户请求 `GET /api/v1/ozon-rankings?view=category&page=1&limit=50`
- **THEN** 返回类目聚合维度数据（label、total_gmv、item_count 等）

#### Scenario: 未登录拒绝

- **WHEN** 未携带有效 JWT 的请求访问该端点
- **THEN** 返回 401 Unauthorized

### Requirement: 查询参数支持

代理端点 SHALL 支持以下查询参数：`view`（product/category/brand/seller/opportunity）、`sort_key`、`keyword`、`category`、`sales_schema`、`page`、`limit`。

#### Scenario: 关键词筛选

- **WHEN** 请求包含 `keyword=手机`
- **THEN** 代理将 keyword 透传至 DeepPick API 并返回过滤结果

#### Scenario: 发货方式筛选

- **WHEN** 请求包含 `sales_schema=FBO`
- **THEN** 代理将 sales_schema 透传至 DeepPick API

### Requirement: DeepPick 认证管理

后端 SHALL 从环境变量读取 DeepPick 认证凭据（`DEEPPICK_ACCESS_TOKEN`、`DEEPPICK_REFRESH_TOKEN`、`DEEPPICK_DEVICE_ID`），请求时附加 `Authorization: Bearer` 与 `x-device-id` 头。

#### Scenario: Token 自动刷新

- **WHEN** DeepPick API 返回 401 且配置了 refresh_token
- **THEN** 后端自动调用 `POST /api/v1/auth/refresh` 获取新 token 并重试原请求

#### Scenario: 凭据缺失

- **WHEN** 未配置 `DEEPPICK_ACCESS_TOKEN`
- **THEN** 返回 503，错误信息提示管理员配置凭据

### Requirement: Redis 缓存

后端 SHALL 将 DeepPick 响应缓存至 Redis，默认 TTL 30 分钟，缓存 key 包含 view、sort_key、category、keyword、sales_schema、page、limit。

#### Scenario: 缓存命中

- **WHEN** 相同查询参数在 TTL 内再次请求
- **THEN** 直接返回 Redis 缓存数据，不调用 DeepPick API

#### Scenario: 缓存过期后重新拉取

- **WHEN** 缓存已过期
- **THEN** 调用 DeepPick API 获取新数据并更新缓存

### Requirement: 降级策略

当 DeepPick API 不可用时，后端 SHALL 尝试返回 Redis 中的过期缓存数据，并在 `meta` 中标注 `stale=true`。

#### Scenario: API 不可用有缓存

- **WHEN** DeepPick API 请求超时或返回 5xx，且 Redis 存在历史缓存
- **THEN** 返回缓存数据，`meta.stale=true`

#### Scenario: API 不可用无缓存

- **WHEN** DeepPick API 不可用且无缓存
- **THEN** 返回 503 Service Unavailable

### Requirement: 数据字段标准化

后端 SHALL 将 DeepPick 原始响应映射为统一 schema，商品榜/机会榜使用 `ProductRankingItem`，类目/品牌/卖家榜使用 `AggregatedRankingItem`。

#### Scenario: 商品字段映射

- **WHEN** view=product 的响应包含 rank_no、sku、name、gmv_sum、sold_count
- **THEN** 映射为 `ProductRankingItem` 并返回

#### Scenario: 机会榜额外字段

- **WHEN** view=opportunity 的响应包含 opportunity_score、opportunity_reasons
- **THEN** 映射字段包含在 `ProductRankingItem` 中

### Requirement: 定时预热任务

Celery beat SHALL 每 6 小时执行预热任务，抓取各 view（product/category/brand/seller/opportunity）默认排序第 1 页数据写入 Redis 缓存。

#### Scenario: 定时预热执行

- **WHEN** Celery beat 触发 `warmup_deeppick_rankings` 任务
- **THEN** 依次请求五个 view 的第 1 页数据并写入 Redis
