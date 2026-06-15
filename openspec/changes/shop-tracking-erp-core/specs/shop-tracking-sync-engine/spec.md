## ADDED Requirements

### Requirement: 同步任务类型

Celery Worker SHALL 注册以下任务：
- `sync_store_products(store_id)`
- `sync_store_inventory(store_id)`
- `sync_store_orders(store_id)`
- `sync_store_analytics(store_id)`（日级 analytics 缓存）
- `sync_store_all(store_id)`（编排上述子任务）

#### Scenario: 全量同步编排

- **WHEN** 触发 `sync_store_all`
- **THEN** 依次执行商品→库存→订单→analytics，任一失败记录 error 但不阻断后续（best effort）

### Requirement: 游标分页全量拉取

商品同步 MUST 使用 `POST /v3/product/list` 的 `last_id` 游标分页，直至无更多数据，禁止 offset 深分页。

#### Scenario: 大店全量同步

- **WHEN** 店铺有 5000+ SKU
- **THEN** 任务通过游标遍历全部 product_id 并完成 upsert

### Requirement: 定时调度

Celery Beat SHALL 每 15 分钟为所有 `is_active=true` 的店铺触发 `sync_store_all`。

#### Scenario: 定时触发

- **WHEN** Beat 调度到达
- **THEN** 每个活跃店铺入队一个 sync 任务

### Requirement: 手动触发同步

后端 SHALL 提供 `POST /api/v1/tracking/sync?store_id=&scope=products|inventory|orders|all`，返回 `sync_job_id`。

#### Scenario: 手动全量同步

- **WHEN** 用户点击「立即同步」
- **THEN** 创建 SyncJob 记录，入队 Celery，返回 job id

### Requirement: 同步任务状态 API

后端 SHALL 提供 `GET /api/v1/tracking/sync-jobs/{job_id}`，返回：
`status`（pending/running/succeeded/failed）、`job_type`、`started_at`、`finished_at`、`records_processed`、`error_message`。

#### Scenario: 轮询同步进度

- **WHEN** 前端每 2s 轮询 running 状态的 job
- **THEN** 直至 status 变为 succeeded 或 failed

### Requirement: SyncJob 持久化

`sync_jobs` 表 SHALL 记录每次同步的执行元数据，保留最近 30 天供审计。

#### Scenario: 失败记录

- **WHEN** Ozon API 持续 429 导致任务失败
- **THEN** SyncJob.status=failed，error_message 含限流说明

### Requirement: 限流与重试

同步任务 MUST 遵守 Ozon 50 req/s per Client-Id 限制；遇 429 MUST 指数退避重试最多 3 次。

#### Scenario: 429 重试

- **WHEN** 单次请求返回 429
- **THEN** 等待 backoff 后重试，3 次失败后标记 job failed
