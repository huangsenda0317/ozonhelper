## ADDED Requirements

### Requirement: Excel 模板与上传

后端 SHALL 提供：
- `GET /api/v1/tracking/listing/template`：下载标准 `.xlsx` 模板
- `POST /api/v1/tracking/listing/upload?store_id=`：multipart 上传，解析为 `listing_jobs` + `listing_items`

模板列 MUST 含：`offer_id`、`name`、`category_id`、`price`、`primary_image_url`、`attributes_json`（可选）。

单次上传 MUST 限制 ≤500 行。

#### Scenario: 上传有效 Excel

- **WHEN** 用户上传符合模板的 50 行文件
- **THEN** 创建 listing_job 状态 pending 并返回 job_id

#### Scenario: 格式错误

- **WHEN** 缺少必填列 offer_id
- **THEN** 返回 422 与行级错误明细

### Requirement: 刊登任务处理

Celery 任务 `process_listing_job` SHALL 分批调用 `POST /v2/product/import`（每批 ≤100），并轮询 import 任务状态更新 `listing_items.status`（pending/importing/success/failed/rejected）。

#### Scenario: 批量刊登成功

- **WHEN** Ozon 接受 import 且审核通过
- **THEN** listing_item 状态 success 且 synced_products 在下次商品同步后出现

#### Scenario: 审核驳回

- **WHEN** Ozon 返回 reject 原因
- **THEN** listing_item 存 `error_message` 与 `rejection_reason`

### Requirement: 刊登任务 API

后端 SHALL 提供：
- `GET /api/v1/tracking/listing/jobs?store_id=`：任务列表
- `GET /api/v1/tracking/listing/jobs/{id}`：任务详情含 items 分页
- `POST /api/v1/tracking/listing/jobs/{id}/retry`：重试 failed items

#### Scenario: 查看任务进度

- **WHEN** 用户打开 job 详情
- **THEN** 展示总数、成功/失败/进行中计数与 items 表格

### Requirement: 新品刊登页面

前端 SHALL 在 `/tracking/listing` 提供：
- 模板下载按钮
- Excel 拖拽上传区
- 任务列表（状态、创建时间、进度条）
- 任务详情抽屉/页：items 表格与驳回原因

#### Scenario: 上传并跟踪

- **WHEN** 用户上传文件
- **THEN** 跳转或刷新任务列表并轮询 job 状态至完成
