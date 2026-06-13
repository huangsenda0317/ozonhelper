# API 接口契约: Ozon 跟卖全链路平台

**日期**: 2026-06-12 | **版本**: 1.0.0

## 概述

所有 API 以 `/api/v1` 为基础路径。请求/响应使用 JSON 格式，编码 UTF-8。

**认证方式**: 
- Web 前端: Bearer Token (JWT)
- 浏览器插件: API Key (通过 `X-API-Key` Header)

**通用响应格式**:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**错误响应**:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "商品未找到"
  },
  "meta": null
}
```

---

## 1. 认证模块

### POST /api/v1/auth/register

注册新用户。

**请求**:
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "张三"
}
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "name": "张三",
    "created_at": "2026-06-12T10:00:00Z"
  },
  "error": null,
  "meta": null
}
```

### POST /api/v1/auth/login

用户登录。

**请求**:
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token",
    "token_type": "bearer",
    "expires_in": 86400
  },
  "error": null,
  "meta": null
}
```

### POST /api/v1/auth/api-keys

创建 API 密钥。

**Headers**: `Authorization: Bearer <jwt>`

**请求**:
```json
{
  "name": "Chrome 插件"
}
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Chrome 插件",
    "key": "oz-a1b2c3d4e5f6g7h8",  // 仅创建时返回完整密钥
    "created_at": "2026-06-12T10:00:00Z"
  },
  "error": null,
  "meta": null
}
```

### GET /api/v1/auth/api-keys

获取 API 密钥列表 (不返回完整密钥)。

### DELETE /api/v1/auth/api-keys/{key_id}

吊销 API 密钥。

---

## 2. 榜单发现模块

### GET /api/v1/rankings

获取排行榜商品列表。

**Query Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | string | 是 | 商品类目 |
| `rank_type` | string | 是 | 榜单类型: hot/rising/new |
| `page` | integer | 否 | 页码, 默认 1 |
| `limit` | integer | 否 | 每页条数, 默认 50, 最大 100 |
| `price_min` | decimal | 否 | 最低价格 (卢布) |
| `price_max` | decimal | 否 | 最高价格 (卢布) |
| `rating_min` | decimal | 否 | 最低评分 (1-5) |
| `sales_min` | integer | 否 | 最低销量 |

**响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ozon_product_id": "123456",
      "title": "Постельное белье ...",
      "category": "家居用品",
      "price_rub": 2499.00,
      "rating": 4.7,
      "review_count": 328,
      "sales_trend": "rising",
      "rank_type": "hot",
      "rank_position": 1,
      "image_url": "https://...",
      "is_selected": true
    }
  ],
  "error": null,
  "meta": {
    "total": 500,
    "page": 1,
    "limit": 50,
    "cached_at": "2026-06-12T08:00:00Z"
  }
}
```

### GET /api/v1/rankings/categories

获取可用的商品类目列表。

---

## 3. 选品池模块

### POST /api/v1/selection-pool

添加商品到选品池。

**请求**:
```json
{
  "ranked_product_id": "uuid",
  "note": "看起来不错，价格合理"
}
```

### GET /api/v1/selection-pool

获取选品池列表 (支持分页和搜索)。

### DELETE /api/v1/selection-pool/{id}

从选品池移除商品。

### POST /api/v1/selection-pool/batch-delete

批量移除。

**请求**:
```json
{
  "ids": ["uuid1", "uuid2"]
}
```

---

## 4. 商品采集模块

### POST /api/v1/products

创建已采集商品 (手动录入或插件采集)。

**Headers**: `X-API-Key: oz-...` (插件采集) 或 `Authorization: Bearer <jwt>`

**请求**:
```json
{
  "ozon_product_id": "123456",
  "source_url": "https://www.ozon.ru/product/123456",
  "title": "Постельное белье ...",
  "price_rub": 2499.00,
  "description": "Описание товара ...",
  "attributes": {
    "material": "хлопок",
    "size": "200x220"
  },
  "variants": [
    {"sku": "color-red", "color": "красный", "price": 2499.00}
  ],
  "images": [
    {"url": "https://...", "type": "main"},
    {"url": "https://...", "type": "detail"}
  ],
  "video_urls": ["https://..."],
  "category_path": "Дом/Постельное белье"
}
```

### GET /api/v1/products

获取已采集商品列表 (分页、搜索、排序、去重检测)。

**Query Parameters**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 搜索关键词 (标题) |
| `sort_by` | string | collected_at/price_rub |
| `sort_order` | string | asc/desc |
| `has_image` | boolean | 是否有图片 |
| `page` | integer | 页码 |
| `limit` | integer | 每页条数 |

### GET /api/v1/products/{id}

获取单个已采集商品详情。

### DELETE /api/v1/products/{id}

删除已采集商品。

### GET /api/v1/products/{id}/check-duplicate

检查商品是否已采集。

**响应**:
```json
{
  "success": true,
  "data": {
    "is_duplicate": true,
    "existing_id": "uuid"
  }
}
```

---

## 5. 1688 比价模块

### POST /api/v1/sourcing/search

对采集商品发起 1688 货源搜索。

**请求**:
```json
{
  "collected_product_id": "uuid"
}
```

**响应** (202): 任务已创建, 返回 task_id 用于轮询状态。

### GET /api/v1/sourcing/results/{collected_product_id}

获取 1688 货源搜索匹配结果。

**响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "同款纯棉床品四件套",
      "price_cny": 89.00,
      "min_order": 10,
      "supplier_name": "义乌纺织品有限公司",
      "supplier_url": "https://detail.1688.com/...",
      "image_url": "https://...",
      "similarity_score": 0.92
    }
  ],
  "error": null,
  "meta": null
}
```

### POST /api/v1/sourcing/calculate-profit

计算利润。

**请求**:
```json
{
  "collected_product_id": "uuid",
  "supply_source_id": "uuid",
  "supply_cost_cny": 89.00,
  "logistics_cost_cny": 35.00,
  "commission_rate": 12.0,
  "exchange_rate": 0.078
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "ozon_price_rub": 2499.00,
    "ozon_price_cny": 194.92,
    "supply_cost_cny": 89.00,
    "logistics_cost_cny": 35.00,
    "commission_cny": 23.39,
    "gross_profit_cny": 47.53,
    "gross_margin": 24.38,
    "is_high_potential": false
  }
}
```

### GET /api/v1/sourcing/profit-history/{collected_product_id}

获取商品的利润计算历史。

---

## 6. AI 处理模块

### POST /api/v1/ai/image-edit

发起 AI 改图任务（SeedEdit 3.0 异步提交）。

**请求**:
```json
{
  "collected_product_id": "uuid",
  "image_ids": ["all"],
  "prompt": "去除图片中的所有中文水印和文字，把背景换成白色纯色背景",
  "seed": -1,
  "scale": 0.5
}
```

**请求参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `collected_product_id` | string | 是 | 采集商品的 ID |
| `image_ids` | array of string | 是 | 图片 ID 列表，`["all"]` 处理所有图片 |
| `prompt` | string | 是 | SeedEdit 编辑提示词，建议 ≤ 120 字符，最长 800 字符 |
| `seed` | int | 否 | 随机种子，默认 -1（随机）。相同正整数+相同参数 = 大概率相同输出 |
| `scale` | float | 否 | 编辑强度 0-1，默认 0.5。越大指令越强，输入图影响越小 |

**响应** (202):
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "seededit_task_ids": ["7392616336519610409"],
    "status": "pending"
  }
}
```

**处理流程**: 后端提交 SeedEdit 异步任务 → 轮询结果 → Pillow 尺寸标准化 → 完成。

### POST /api/v1/ai/translate

发起 AI 翻译任务（腾讯云 TMT TextTranslate）。

**请求**:
```json
{
  "collected_product_id": "uuid",
  "fields": ["title", "description"],
  "source_lang": "zh",
  "target_lang": "ru",
  "untranslated_text": ""
}
```

**请求参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `collected_product_id` | string | 是 | 采集商品的 ID |
| `fields` | array of string | 是 | 需要翻译的字段，可选 `title`、`description` |
| `source_lang` | string | 是 | 源语言代码，默认 `zh`（简体中文） |
| `target_lang` | string | 是 | 目标语言代码，默认 `ru`（俄语） |
| `untranslated_text` | string | 否 | 不希望被翻译的标记文本（如品牌名、商标符号），单次仅支持一个词 |

**处理流程**: 后端调用腾讯云 TMT TextTranslate API → 分段翻译（超 6000 字符自动分段）→ 合并结果 → 存储翻译文本和消耗字符数。

**响应** (202):
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "status": "pending"
  }
}
```

### GET /api/v1/ai/tasks

获取 AI 任务列表 (支持按状态、类型筛选)。

### GET /api/v1/ai/tasks/{task_id}

获取单个 AI 任务详情与结果。

### POST /api/v1/ai/image-edit/{task_id}/retry

重新处理单张图片 (修改 prompt 后重新提交 SeedEdit 任务)。

**请求**:
```json
{
  "prompt": "把衣服颜色改成蓝色",
  "scale": 0.7
}
```

### PUT /api/v1/ai/tasks/{task_id}/output

手动修改 AI 输出结果 (翻译文本覆盖、图片裁剪参数)。

### GET /api/v1/ai/tasks/{task_id}/progress

查询 SeedEdit 异步任务进度。

**响应**:
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "seededit_status": "generating",
    "items_total": 5,
    "items_completed": 2
  }
}
```

> `seededit_status` 取值: `in_queue` (排队中), `generating` (处理中), `done` (已完成), `not_found` (任务未找到/过期), `expired` (已过期)

---

## 7. 批量上架模块

### POST /api/v1/listings/generate

为选中商品预填刊登信息。

**请求**:
```json
{
  "collected_product_ids": ["uuid1", "uuid2"],
  "store_id": "uuid",
  "defaults": {
    "stock": 100,
    "price_multiplier": 2.5
  }
}
```

### GET /api/v1/listings

获取刊登列表 (可按 store_id, status 筛选)。

### PUT /api/v1/listings/{id}

修改刊登记录中的字段。

### POST /api/v1/listings/submit

批量提交刊登至 Ozon。

**请求**:
```json
{
  "listing_ids": ["uuid1", "uuid2"],
  "store_id": "uuid"
}
```

**响应** (202):
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "total": 10,
    "status": "processing"
  }
}
```

### GET /api/v1/listings/submit-status/{task_id}

获取批量提交任务的进度与结果。

**响应**:
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "total": 10,
    "success_count": 8,
    "failed_count": 2,
    "results": [
      {
        "listing_id": "uuid",
        "status": "success",
        "ozon_product_id": "ozon-123"
      },
      {
        "listing_id": "uuid",
        "status": "failed",
        "error_message": "缺少必填属性: weight"
      }
    ]
  }
}
```

### POST /api/v1/listings/export

导出刊登信息。

**请求**:
```json
{
  "listing_ids": ["uuid1", "uuid2"],
  "format": "excel"
}
```

**响应**: 文件下载 (Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

---

## 8. 店铺跟踪模块

### GET /api/v1/tracking/dashboard

获取店铺整体数据概览。

**Query**: `store_id` (必填), `period` (today/week/month)

**响应**:
```json
{
  "success": true,
  "data": {
    "total_products": 156,
    "total_sales": 423,
    "total_orders": 312,
    "conversion_rate": 3.2,
    "total_revenue_rub": 1045890.00
  }
}
```

### GET /api/v1/tracking/products

获取在线商品销售指标列表。

**Query Parameters**: `store_id` (必填), `sort_by` (sales/views/conversion/rating), `sort_order`, `page`, `limit`

### GET /api/v1/tracking/products/{listing_id}/trends

获取商品销售趋势数据。

**Query**: `period` (7d/30d/90d)

**响应**:
```json
{
  "success": true,
  "data": {
    "sales_trend": [
      {"date": "2026-06-01", "sales": 12, "revenue": 29988.00},
      {"date": "2026-06-02", "sales": 15, "revenue": 37485.00}
    ],
    "conversion_trend": [
      {"date": "2026-06-01", "rate": 3.1},
      {"date": "2026-06-02", "rate": 3.5}
    ]
  }
}
```

---

## 9. 店铺管理模块

### POST /api/v1/stores

绑定 Ozon 店铺。

**请求**:
```json
{
  "name": "我的Ozon店铺",
  "ozon_client_id": "...",
  "ozon_api_key": "..."
}
```

### GET /api/v1/stores

获取已绑定的店铺列表。

### PUT /api/v1/stores/{id}

更新店铺信息/凭证。

### DELETE /api/v1/stores/{id}

解绑店铺。

---

## 10. 通知模块

### GET /api/v1/notifications

获取通知列表 (分页, 可按 type, is_read 筛选)。

### PUT /api/v1/notifications/{id}/read

标记通知为已读。

### PUT /api/v1/notifications/read-all

标记所有通知为已读。

---

## 11. 汇率模块

### GET /api/v1/exchange-rate

获取当前 RUB/CNY 汇率。

**响应**:
```json
{
  "success": true,
  "data": {
    "rub_to_cny": 0.078,
    "updated_at": "2026-06-12T00:00:00Z"
  }
}
```

---

## 事件通知 (SSE)

### GET /api/v1/events

服务器推送事件流 (Server-Sent Events)，用于实时通知。

**事件类型**:
| 事件 | 说明 |
|------|------|
| `task.progress` | AI 任务/批量提交进度更新 |
| `notification.new` | 新通知 (库存预警/差评提醒) |
| `sync.completed` | 数据同步完成 |
