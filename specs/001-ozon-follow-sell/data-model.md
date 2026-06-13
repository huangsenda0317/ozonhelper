# 数据模型设计: Ozon 跟卖全链路平台

**日期**: 2026-06-12 | **功能**: [spec.md](./spec.md)

## 实体关系图 (ERD)

```
User ──< Store          (一对多: 用户绑定多个店铺)
User ──< SelectedProduct (一对多: 用户的选品池)
User ──< CollectedProduct (一对多: 用户采集的商品)
User ──< Notification    (一对多: 用户的通知)

RankedProduct ──< SelectedProduct (一对多: 榜单商品被多个用户选入)

CollectedProduct ──< SupplySource     (一对多: 一个采集商品对应多个1688货源)
CollectedProduct ──< ProcessingTask   (一对多: AI 改图/翻译任务)
CollectedProduct ──< Listing          (一对多: 商品可能多次上架到不同店铺)

Store ──< Listing      (一对多: 店铺下的刊登记录)
Store ──< SalesData     (一对多: 店铺下的销售数据)
Store ──< Notification  (一对多: 店铺维度的通知)

Listing ──< SalesData   (一对多: 刊登商品的销售数据)
```

## 实体详细定义

### User (用户)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `email` | VARCHAR(255) | 登录邮箱 | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | 密码哈希 | NOT NULL |
| `name` | VARCHAR(100) | 用户名 | NOT NULL |
| `profit_threshold` | DECIMAL(5,2) | 高潜力毛利率阈值 | DEFAULT 25.00 |
| `is_active` | BOOLEAN | 账号启用状态 | DEFAULT TRUE |
| `created_at` | TIMESTAMP | 注册时间 | NOT NULL |
| `updated_at` | TIMESTAMP | 最后更新时间 | NOT NULL |

### ApiKey (API 密钥)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `user_id` | UUID | 所属用户 | FK → User |
| `name` | VARCHAR(100) | 密钥名称 (如 "Chrome 插件") | NOT NULL |
| `key_hash` | VARCHAR(255) | 密钥哈希 (SHA-256) | UNIQUE |
| `key_prefix` | VARCHAR(8) | 密钥前缀 (展示用, 如 "oz-") | NOT NULL |
| `is_active` | BOOLEAN | 是否启用 | DEFAULT TRUE |
| `last_used_at` | TIMESTAMP | 最后使用时间 | NULLABLE |
| `created_at` | TIMESTAMP | 创建时间 | NOT NULL |
| `revoked_at` | TIMESTAMP | 吊销时间 | NULLABLE |

### Store (Ozon 店铺)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `user_id` | UUID | 所属用户 | FK → User |
| `name` | VARCHAR(200) | 店铺名称 | NOT NULL |
| `ozon_client_id` | VARCHAR(255) | Ozon API Client ID | 加密存储 |
| `ozon_api_key_encrypted` | TEXT | Ozon API Key (加密) | 加密存储 |
| `is_active` | BOOLEAN | 店铺连接状态 | DEFAULT TRUE |
| `last_sync_at` | TIMESTAMP | 最后数据同步时间 | NULLABLE |
| `created_at` | TIMESTAMP | 绑定时间 | NOT NULL |

### RankedProduct (榜单商品)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `ozon_product_id` | VARCHAR(50) | Ozon 商品 ID | NOT NULL |
| `title` | VARCHAR(500) | 商品标题 (俄文) | NOT NULL |
| `category` | VARCHAR(200) | 类目 | NOT NULL |
| `price_rub` | DECIMAL(12,2) | Ozon 售价 (卢布) | NOT NULL |
| `rating` | DECIMAL(3,1) | 评分 (1-5) | NULLABLE |
| `review_count` | INTEGER | 评价数 | DEFAULT 0 |
| `sales_trend` | VARCHAR(50) | 销量趋势 (上升/稳定/下降) | NULLABLE |
| `rank_type` | VARCHAR(20) | 榜单类型 (hot/rising/new) | NOT NULL |
| `rank_position` | INTEGER | 排名 | NOT NULL |
| `image_url` | TEXT | 主图 URL | NULLABLE |
| `cached_at` | TIMESTAMP | 数据抓取时间 | NOT NULL |

### SelectedProduct (选品池商品)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `user_id` | UUID | 所属用户 | FK → User |
| `ranked_product_id` | UUID | 关联榜单商品 | FK → RankedProduct, NULLABLE |
| `note` | TEXT | 用户备注 | NULLABLE |
| `added_at` | TIMESTAMP | 加入时间 | NOT NULL |

> **数据隔离**: SelectedProduct 属于账号级共享资源，跨店铺可复用。

### CollectedProduct (已采集商品)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `user_id` | UUID | 采集用户 | FK → User |
| `ozon_product_id` | VARCHAR(50) | Ozon 商品 ID | NOT NULL |
| `source_url` | TEXT | Ozon 商品链接 | NOT NULL |
| `title` | VARCHAR(500) | 商品标题 (俄文原文) | NOT NULL |
| `title_zh` | VARCHAR(500) | 标题 (中文翻译) | NULLABLE |
| `title_ru` | VARCHAR(500) | 标题 (俄文 AI 翻译) | NULLABLE |
| `description` | TEXT | 商品描述 (俄文原文) | NULLABLE |
| `description_ru` | TEXT | 描述 (俄文 AI 翻译) | NULLABLE |
| `price_rub` | DECIMAL(12,2) | Ozon 售价 (卢布) | NOT NULL |
| `attributes` | JSONB | 属性参数 (键值对) | DEFAULT '{}' |
| `variants` | JSONB | SKU 变体列表 | DEFAULT '[]' |
| `images` | JSONB | 图片 URL 列表 [{url, type}] | DEFAULT '[]' |
| `video_urls` | JSONB | 视频 URL 列表 | DEFAULT '[]' |
| `category_path` | VARCHAR(500) | Ozon 类目路径 | NULLABLE |
| `is_manual` | BOOLEAN | 是否手动录入 | DEFAULT FALSE |
| `collected_at` | TIMESTAMP | 采集时间 | NOT NULL |

> **数据隔离**: CollectedProduct 属于账号级共享资源，跨店铺可复用。
> **去重**: `(user_id, ozon_product_id)` 联合唯一约束。

### SupplySource (1688 货源)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `collected_product_id` | UUID | 关联采集商品 | FK → CollectedProduct |
| `title` | VARCHAR(500) | 1688 商品标题 | NOT NULL |
| `price_cny` | DECIMAL(12,2) | 1688 价格 (人民币) | NOT NULL |
| `min_order` | INTEGER | 起批量 | DEFAULT 1 |
| `supplier_name` | VARCHAR(200) | 供应商名称 | NULLABLE |
| `supplier_url` | TEXT | 1688 商品链接 | NULLABLE |
| `image_url` | TEXT | 主图 URL | NULLABLE |
| `similarity_score` | DECIMAL(3,2) | 相似度评分 (0-1) | NULLABLE |
| `searched_at` | TIMESTAMP | 搜索时间 | NOT NULL |

### ProfitCalculation (利润计算)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `collected_product_id` | UUID | 关联采集商品 | FK → CollectedProduct |
| `supply_source_id` | UUID | 关联货源 | FK → SupplySource, NULLABLE |
| `ozon_price_cny` | DECIMAL(12,2) | Ozon 售价 (人民币) | NOT NULL |
| `supply_cost_cny` | DECIMAL(12,2) | 进货成本 (人民币) | NOT NULL |
| `logistics_cost_cny` | DECIMAL(12,2) | 预估物流成本 | NOT NULL |
| `commission_rate` | DECIMAL(5,2) | Ozon 佣金率 (%) | NOT NULL |
| `exchange_rate` | DECIMAL(10,4) | 卢布→人民币汇率 | NOT NULL |
| `gross_margin` | DECIMAL(5,2) | 毛利率 (%) | NOT NULL |
| `calculated_at` | TIMESTAMP | 计算时间 | NOT NULL |

### ProcessingTask (AI 处理任务)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `collected_product_id` | UUID | 关联商品 | FK → CollectedProduct |
| `task_type` | VARCHAR(20) | 任务类型 (image_edit/translate) | NOT NULL |
| `status` | VARCHAR(20) | 状态 (pending/running/success/failed) | DEFAULT 'pending' |
| `input_data` | JSONB | 输入数据 (改图: prompt/seed/scale; 翻译: fields/source_lang/target_lang/text_length) | NOT NULL |
| `output_data` | JSONB | 输出结果 (改图: 处理后图片 URL 列表; 翻译: 俄文 TargetText + UsedAmount) | NULLABLE |
| `seededit_task_ids` | JSONB | SeedEdit 异步任务 ID 列表 (仅 image_edit 类型) | NULLABLE |
| `seededit_status` | VARCHAR(20) | SeedEdit 任务状态 (in_queue/generating/done/not_found/expired)，仅 image_edit 类型 | NULLABLE |
| `error_message` | TEXT | 错误信息 | NULLABLE |
| `error_code` | VARCHAR(30) | 错误码 (SeedEdit: 50429/50430/50411; TMT: NoFreeAmount/ServiceIsolate/LimitedAccessFrequency)，依 task_type 区分 | NULLABLE |
| `retry_count` | INTEGER | 重试次数 | DEFAULT 0 |
| `cost_amount` | DECIMAL(8,4) | AI 调用成本 (元) | DEFAULT 0 |
| `created_at` | TIMESTAMP | 创建时间 | NOT NULL |
| `completed_at` | TIMESTAMP | 完成时间 | NULLABLE |

### Listing (刊登记录)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `user_id` | UUID | 所属用户 | FK → User |
| `store_id` | UUID | 目标店铺 | FK → Store |
| `collected_product_id` | UUID | 关联采集商品 | FK → CollectedProduct |
| `category` | VARCHAR(500) | Ozon 类目 | NOT NULL |
| `title_ru` | VARCHAR(500) | 俄文标题 | NOT NULL |
| `description_ru` | TEXT | 俄文描述 | NULLABLE |
| `attributes` | JSONB | 刊登属性 | DEFAULT '{}' |
| `images` | JSONB | 处理后图片列表 | DEFAULT '[]' |
| `price_rub` | DECIMAL(12,2) | 售价 (卢布) | NOT NULL |
| `stock` | INTEGER | 库存数量 | DEFAULT 0 |
| `status` | VARCHAR(20) | 刊登状态 (draft/submitting/success/failed) | DEFAULT 'draft' |
| `ozon_product_id` | VARCHAR(50) | Ozon 返回的商品 ID | NULLABLE |
| `error_message` | TEXT | 失败原因 | NULLABLE |
| `submitted_at` | TIMESTAMP | 提交时间 | NULLABLE |

> **数据隔离**: Listing 属于店铺级数据，通过 `store_id` 隔离。

### SalesData (销售数据)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `store_id` | UUID | 所属店铺 | FK → Store |
| `listing_id` | UUID | 关联刊登 | FK → Listing, NULLABLE |
| `ozon_product_id` | VARCHAR(50) | Ozon 商品 ID | NOT NULL |
| `views` | INTEGER | 浏览量 | DEFAULT 0 |
| `orders` | INTEGER | 订单数 | DEFAULT 0 |
| `sales_quantity` | INTEGER | 销量 | DEFAULT 0 |
| `revenue_rub` | DECIMAL(14,2) | 收入 (卢布) | DEFAULT 0 |
| `conversion_rate` | DECIMAL(5,2) | 转化率 (%) | NULLABLE |
| `stock` | INTEGER | 当前库存 | DEFAULT 0 |
| `rating` | DECIMAL(3,1) | 当前评分 | NULLABLE |
| `review_count` | INTEGER | 评价数 | DEFAULT 0 |
| `synced_at` | TIMESTAMP | 同步时间 | NOT NULL |

> **数据隔离**: SalesData 属于店铺级数据，通过 `store_id` 隔离。

### Notification (通知)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| `id` | UUID | 主键 | PK |
| `user_id` | UUID | 接收用户 | FK → User |
| `store_id` | UUID | 关联店铺 | FK → Store, NULLABLE |
| `type` | VARCHAR(30) | 类型 (stock_alert/negative_review/sync_failed) | NOT NULL |
| `title` | VARCHAR(200) | 通知标题 | NOT NULL |
| `content` | TEXT | 通知内容 | NULLABLE |
| `related_product_id` | UUID | 关联商品 | FK → CollectedProduct, NULLABLE |
| `is_read` | BOOLEAN | 已读状态 | DEFAULT FALSE |
| `triggered_at` | TIMESTAMP | 触发时间 | NOT NULL |

## 状态机

### ProcessingTask 状态流转 (image_edit / translate)

```
pending → running → success
                  → failed (可手动重试 → pending)
```

**image_edit 类型 (SeedEdit 3.0) 详细流转**:

```
pending → running (提交 SeedEdit: CVSync2AsyncSubmitTask)
                  ├── seededit_status: in_queue (任务排队中)
                  ├── seededit_status: generating (SeedEdit 生成中)
                  ├── seededit_status: done → Pillow 尺寸标准化 → success
                  ├── seededit_status: not_found / expired → 标记 failed
                  └── 错误码 50429/50430 (限流) → 指数退避重试 (≤3次)
                       ├── 重试成功 → success
                       └── 重试耗尽 → failed (用户可手动重试 → pending)
```

**translate 类型 (腾讯云 TMT) 详细流转**:

```
pending → running (提交 TMT TextTranslate: zh→ru)
                  ├── 返回 TargetText + UsedAmount → success
                  ├── 错误码 LimitExceeded.LimitedAccessFrequency → 限速重试 (≤3次)
                  ├── 错误码 InternalError.BackendTimeout → 超时重试 (≤2次)
                  ├── 错误码 UnsupportedOperation.TextTooLong → 自动分段翻译
                  └── 错误码 NoFreeAmount / ServiceIsolate → 标记 failed (手动重试 → pending)
```

### Listing 状态流转

```
draft → submitting → success → (已上架)
                   → failed  → draft (用户修正后重新提交)
```

## 索引设计

| 表 | 索引 | 类型 | 用途 |
|----|------|------|------|
| RankedProduct | `(category, rank_type, cached_at)` | 复合 | 榜单按类目+类型查询 |
| CollectedProduct | `(user_id, collected_at)` | 复合 | 用户采集列表 + 去重 |
| SupplySource | `(collected_product_id)` | 单列 | 按商品查货源 |
| Listing | `(store_id, status)` | 复合 | 店铺刊登状态筛选 |
| SalesData | `(store_id, synced_at)` | 复合 | 销售数据时间序列 |
| Notification | `(user_id, is_read, triggered_at)` | 复合 | 用户未读通知 |
