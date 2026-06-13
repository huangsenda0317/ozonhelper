## Context

- 前端 `GlobalNav` 与首页已链接 `/tracking`，但 `frontend/src/app/tracking/` 目录不存在，访问 404
- 后端 `backend/src/services/tracker/` 为空占位，`main.py` 未注册 tracking 路由
- Ozon 凭证已通过 `Settings.ozon_client_id` / `Settings.ozon_api_key` 从 `.env` 加载，无需本阶段实现多店铺 Store CRUD
- 项目已有 `httpx` 异步 HTTP 客户端模式（SeedEdit、MinIO 等），前端已有 `products/page.tsx` 列表页可参考

## Goals / Non-Goals

**Goals:**

- 实现 Ozon Seller API 后端代理，凭证仅存服务端，前端不暴露 Client-Id / Api-Key
- 提供在线商品列表 API + `/tracking` 页面：搜索（标题/offer_id）、筛选（可见性、销售状态、库存有无）、排序（价格/更新时间）、分页
- 提供商品详情 API + `/tracking/[productId]` 页面：展示 Ozon 返回的完整字段（名称、价格、库存、状态、图片、SKU、类目等）
- 凭证缺失或 Ozon API 错误时给出明确错误提示

**Non-Goals:**

- 多店铺绑定与管理 UI（Store 模型、settings/stores 页面）
- 销售仪表盘、趋势图、转化率统计（需 `/v1/analytics/data` 与本地 SalesData 表）
- 库存预警、差评通知、SSE 推送、Celery 定时同步
- 本地缓存 SalesData 表（本阶段实时调用 Ozon API，可后续加 Redis 缓存）

## Decisions

### 1. Ozon API 调用策略：两阶段 list + info

**选择**: 先 `POST /v3/product/list` 获取 product_id 分页列表，再批量 `POST /v3/product/info/list` 拉取详情字段。

**理由**: `product/list` 仅返回 ID 与 visibility；列表展示需要的 title、price、stock、image 均在 `product/info/list`。单次 info 请求最多 1000 个 ID，列表页每页默认 20 条，性能可接受。

**备选**: 仅用 `product/list` — 字段不足，无法满足 UI 需求。

### 2. 凭证来源：环境变量单店铺

**选择**: MVP 使用 `get_settings().ozon_client_id` / `ozon_api_key`，未配置时 API 返回 `503 OZON_NOT_CONFIGURED`。

**理由**: 用户已写入 `.env`；Store 多店铺模型尚未实现 API，避免过度设计。

**备选**: 立即实现 Store 表 + 加密凭证 — 工作量大，与当前诉求不符。

### 3. 搜索与筛选实现位置：后端聚合 + 内存过滤

**选择**:
- Ozon `product/list` 支持 `filter.visibility`（ALL/VISIBLE/INVISIBLE/ARCHIVED 等）
- 关键词搜索（title、offer_id）在拿到 info 结果后于后端内存过滤（因 Ozon list API 无全文搜索）
- 价格区间、是否有库存同样在 info 结果上过滤
- 排序在过滤后的结果集上执行，分页在最终结果切片

**理由**: Ozon API 不提供卖家侧 title 搜索；单店铺商品量通常 < 几千，内存过滤足够。若商品量极大，后续可引入本地索引表。

**备选**: 全量拉取缓存到 PostgreSQL — 需同步任务，超出 MVP 范围。

### 4. HTTP 客户端封装

**选择**: 新建 `backend/src/services/ozon/client.py`，封装 `OzonSellerClient`：
- 统一 headers: `Client-Id`, `Api-Key`, `Content-Type: application/json`
- 方法: `product_list(filter, last_id, limit)`, `product_info_list(product_ids)`
- 错误映射: 401/403 → `OZON_AUTH_FAILED`, 429 → `OZON_RATE_LIMIT`, 其他 → `OZON_API_ERROR`

**理由**: 与现有 `httpx.AsyncClient` 模式一致，便于后续扩展 analytics、orders 等端点。

### 5. API 路由设计

| 端点 | 说明 |
|------|------|
| `GET /api/v1/tracking/products` | Query: `search`, `visibility`, `status`, `has_stock`, `sort_by`, `sort_order`, `page`, `limit` |
| `GET /api/v1/tracking/products/{product_id}` | Path: Ozon product_id；调用 info/list 单条 |

响应格式沿用项目 `ApiResponse[T]` + `PaginationMeta`。

### 6. 前端页面结构

```
/tracking                    → 列表页（SearchInput + TrackingFilterPanel + 商品卡片列表 + 分页）
/tracking/[productId]        → 详情页（主图、基本信息、价格库存、状态、属性）
```

- 新建 `TrackingFilterPanel`（visibility、status、has_stock），不复用榜单 `FilterPanel`（字段不同）
- 新建 `useTracking.ts` hook
- 需登录（JWT），与现有页面一致

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| Ozon API 限流 / 超时 | httpx timeout 30s；列表页 limit 默认 20；错误信息友好提示 |
| 内存过滤性能（大店铺） | MVP 可接受；后续加 Redis 缓存或 SalesData 同步表 |
| 搜索需拉取多页 list 才能匹配 | 首版：遍历 list 直到凑够一页或达到 max_scan_pages=10 上限；文档说明大店搜索可能不完整 |
| 凭证硬编码在 .env 不支持多店 | 提案已明确 Non-Goal；后续 Store 模型可替换凭证来源 |
| Ozon 字段变更 | client 层做字段映射，Pydantic schema 可选字段 + 默认值 |

## Migration Plan

1. 部署后端新路由（无 DB 迁移）
2. 确认 `.env` 已配置 `OZON_CLIENT_ID`、`OZON_API_KEY`
3. 部署前端新页面
4. 回滚：移除 tracking 路由注册与前端页面即可，无数据迁移

## Open Questions

- 是否需要在本阶段展示 Ozon 商品在 ozon.ru 的前台链接？→ 建议详情页提供 `https://www.ozon.ru/product/{sku}` 外链（若 API 返回 sku）
- 列表是否需要展示 analytics（浏览量/销量）？→ 本阶段不含，需额外 analytics API 调用，留后续迭代
