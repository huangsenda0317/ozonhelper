## Context

DeepPick（`http://www.deeppick.cn`）选品排行榜页面提供五大 Tab，均通过同一 API 端点 `GET /api/v1/ozon/rankings/products` 获取，以 `view` 参数区分：

| Tab | view 参数 | 数据形态 |
|-----|-----------|----------|
| 商品榜 | `product` | 单品维度：sku、name、brand、seller、gmv_sum、sold_count 等 |
| 类目榜 | `category` | 聚合维度：label（类目路径）、total_gmv、item_count、top_product 等 |
| 品牌榜 | `brand` | 聚合维度：label（品牌名）、total_gmv、sku_count 等 |
| 卖家榜 | `seller` | 聚合维度：label（卖家名）、total_gmv、item_count 等 |
| 机会榜 | `opportunity` | 单品维度 + opportunity_score、opportunity_reasons |

认证方式：Bearer token + `x-device-id` + `x-deeppick-client: web`。Token 可通过 `POST /api/v1/auth/refresh` 刷新。参考实现见 `scrape_deeppick.py`。

OzonHelper 现有 `/rankings` 为自研爬虫榜单（已隐藏导航），新功能独立路由 `/ozon-rankings`，不替换旧模块。

## Goals / Non-Goals

**Goals:**

- 还原 DeepPick 五大榜单 Tab 及核心筛选（排序口径、类目、发货方式、关键词）
- 后端代理 DeepPick API，隐藏 token，统一鉴权与缓存
- GlobalNav 新增「选品排行榜」一级菜单
- 数据密集型 UI：KPI 摘要 + 可排序表格 + 分页，遵循 Apple Design System 与 ui-ux-pro-max 建议
- Redis 缓存（TTL 30min）+ Celery 定时预热（每 6 小时）

**Non-Goals:**

- 不实现 DeepPick 的「看商品」弹窗、采集箱、搜索词榜
- 不将榜单数据写入选品池（后续迭代）
- 不自建 Ozon 爬虫替代 DeepPick
- 不实现多 DeepPick 账号切换

## Decisions

### 1. 后端代理模式（BFF）

**选择**: OzonHelper 后端作为 BFF 代理 DeepPick API，前端只调用 `/api/v1/ozon-rankings`。

**理由**: 隐藏 DeepPick token、统一用户鉴权、便于缓存与降级。

**API 设计**:

```
GET /api/v1/ozon-rankings?view=product|category|brand|seller|opportunity
  &sort_key=sum_gmv_desc
  &keyword=
  &category=
  &sales_schema=
  &page=1
  &limit=50
```

响应格式对齐现有 `ApiResponse` + `PaginationMeta`，`data.items` 为标准化字段，`data.summary` 为 KPI 摘要。

### 2. DeepPick 客户端

**选择**: 移植 `scrape_deeppick.py` 的 `DeepPickClient` 至 `backend/src/services/deeppick/client.py`。

**配置**（`config.py` 新增）:

```python
deeppick_base_url: str = 'http://www.deeppick.cn'
deeppick_access_token: str = ''
deeppick_refresh_token: str = ''
deeppick_device_id: str = ''
deeppick_cache_ttl: int = 1800  # 30 分钟
```

**Token 刷新**: 401 时自动 refresh 并重试，刷新后写回环境变量或加密存储。

### 3. 数据标准化

**选择**: 后端 `schemas/deeppick_rankings.py` 定义 `ProductRankingItem`、`AggregatedRankingItem` 两种响应模型。

商品榜/机会榜字段映射（参考 `normalize_product`）:
- rank_no, sku, name, brand, photo_url, product_url
- category_path_zh, seller_name, sales_schema
- gmv_sum, sold_count, sold_sum, avg_price
- session_count, session_count_search, views
- conv_to_cart_search, pdp_to_cart_conversion, stock
- updated_at, opportunity_score, opportunity_reasons（机会榜）

聚合榜（类目/品牌/卖家）字段:
- rank_no, label, secondary_label
- total_gmv, total_sold_count, total_search_sessions, total_views
- avg_price, avg_search_cart_conversion, avg_pdp_cart_conversion
- item_count / sku_count, top_product_name, top_product_url, top_photo_url

### 4. 缓存策略

**选择**: Redis key `deeppick:rankings:{view}:{sort_key}:{category}:{keyword}:{sales_schema}:{page}:{limit}`，TTL 30min。

**预热**: Celery beat 任务每 6 小时抓取各 view 第 1 页（默认排序），减少首屏冷启动。

**降级**: DeepPick 不可用时返回缓存数据并标注 `meta.stale=true`；无缓存则 503。

### 5. 前端页面结构

```
/ozon-rankings
├── RankingsShell（页面容器）
│   ├── KpiSummaryBar（总 GMV、总销量、TOP 类目/商品）
│   ├── RankingsFilterBar（排序口径、类目、发货方式、关键词、查询/重置）
│   ├── RankingsTabs（商品榜 | 类目榜 | 品牌榜 | 卖家榜 | 机会榜）
│   └── RankingsTable（antd Table，按 view 动态列配置）
│       └── Pagination
```

**路由**: `/ozon-rankings` 默认 `view=product`，Tab 切换更新 URL query `?view=category`。

### 6. UI/UX 优化（ui-ux-pro-max）

**风格**: Data-Dense Dashboard — 紧凑表格、KPI 卡片、最小 padding。

**具体优化**:
- KPI 摘要栏：4 卡片横排（总 GMV、总销量、热门类目、热门商品），数字右对齐、千分位格式化
- 筛选栏：桌面端单行 inline form，移动端折叠为 Drawer
- 表格：固定「排名」列，商品/类目列含缩略图 + 双行标题（中文 + 俄文），数值列右对齐
- 行悬停：`hover:bg-surface-elevated` 过渡 200ms
- 加载态：表格 skeleton + KPI 占位
- 深色模式：复用现有 `useTheme` token
- 图标：Lucide（BarChart3、TrendingUp 等），禁止 emoji 图标

### 7. 导航集成

在 `GlobalNav.tsx` `NAV_ITEMS` 添加:

```typescript
{ href: "/ozon-rankings", label: "选品排行榜" }
```

插入在「店铺跟踪」之后。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| DeepPick token 过期 | 自动 refresh + 管理后台配置入口 |
| DeepPick API 变更 | 代理层隔离，字段映射集中在一处 |
| 外部 API 限流 | Redis 缓存 + 分页限制 max 100 |
| 法律/合规（数据爬取） | 使用已授权账号 API，非页面爬取 |
| 表格列过多小屏体验差 | 水平滚动 + 列显示/隐藏设置 |
| 与旧 `/rankings` 混淆 | 独立路由与命名，旧模块保持隐藏 |

## Migration Plan

1. 部署后端：新增配置项、API 路由、DeepPick 客户端
2. 配置 `.env` 中 `DEEPPICK_ACCESS_TOKEN` 等凭据
3. 部署前端：新页面 + 导航项
4. 验证五大 Tab 数据加载与筛选
5. 启用 Celery beat 预热任务

回滚：移除导航项、下线 API 路由即可，无数据库迁移依赖。

## Open Questions

- DeepPick 凭据是否按团队共享一个账号？→ 暂定全局单账号，存环境变量
- 是否需要「加入选品池」操作？→ 本期不做，后续迭代
- 排序口径完整选项列表？→ 实现时从 DeepPick 页面 combobox 抓取，默认 `sum_gmv_desc`
