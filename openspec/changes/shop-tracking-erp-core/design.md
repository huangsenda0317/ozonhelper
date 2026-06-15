## Context

- **现状**：`shop-tracking-page` MVP 已完成——`/tracking` 商品列表/详情通过 `OzonSellerClient` 实时代理 Ozon API，凭证来自 `.env` 单店铺；`Store` 模型已定义但未启用 API/UI
- **导航**：`GlobalNav` 中「店铺跟踪」位于末位（第 8 项），首页卡片亦同
- **产品方向**：参考文档定义六大 ERP 模块（店铺→商品→库存→订单→财务→数据），一期 MVP 目标为替代 80% 后台人工操作
- **技术栈**：FastAPI + SQLAlchemy async + Celery + Redis + Next.js 14；已有 `OzonSellerClient`（product list/info）、`ozon-mcp` 可复用 API 模式
- **约束**：100% Ozon Seller API，游标分页 `last_id`，50 req/s 限流，凭证仅存服务端

## Goals / Non-Goals

**Goals:**

- 将店铺跟踪提升为导航首位与登录后默认入口，重构为 ERP 工作台壳层
- 实现多店铺绑定/切换，按店铺隔离同步数据（FR-038、FR-039）
- 建立 Celery 定时同步引擎，本地 PostgreSQL 缓存商品/库存/订单快照
- 交付一期子模块：概览看板、商品中心（含异常监控）、库存中心（含预警）、订单中心（含超时高亮）
- 扩展 `OzonSellerClient` 支持 stocks、orders、analytics 端点
- 保留 MVP 实时查询能力作为「强制刷新」fallback

**Non-Goals:**

- 批量改价、成本定价模型、汇率联动（价格中心，二期）
- 新品 Excel 批量刊登、FBS 一键发货回传运单（二期履约自动化）
- 财务对账、单品利润核算、全维度报表（三期）
- 物流节点超时预警配置页、差评 SSE 推送（二期）
- AI 俄语翻译、子账号权限（三期）
- Webhook 接收 Ozon 推送事件

## Decisions

### 1. 路由结构：Layout + 子路由

**选择**：

```
/tracking                    → 概览看板（Dashboard）
/tracking/products           → 商品中心（原 /tracking 列表迁移）
/tracking/products/[id]      → 商品详情
/tracking/inventory          → 库存中心
/tracking/orders             → 订单中心
/tracking/alerts             → 预警汇总（占位，二期完善）
/settings/stores             → 店铺管理（复用 settings 区域）
```

**理由**：单页 Tab 切换无法 deep link；Next.js App Router layout 可共享 `StoreSwitcher` 与侧边导航。

**备选**：保持 `/tracking` 单页多 Tab — 不利于分享链接与浏览器历史。

### 2. 数据策略：本地同步索引 + 按需实时刷新

**选择**：
- Celery 每 15 分钟增量同步当前选中店铺的商品/库存/订单
- 列表/看板默认读 PostgreSQL 本地快照（`synced_products`、`inventory_snapshots`、`synced_orders`）
- 用户点击「立即同步」触发 Celery 任务 + 前端轮询 `sync_jobs` 状态
- 商品详情页展示 `synced_at` 时间戳；「刷新」按钮可触发单商品实时 info/stocks 拉取

**理由**：看板聚合、预警检测、排序筛选需本地数据；纯实时 API 无法满足 FR-033~037 且易触发限流。

**备选**：继续纯 API 代理 — 无法做趋势图、预警、批量操作审计。

### 3. 多店铺凭证：Store 表 + Fernet 加密

**选择**：
- 启用已有 `Store` 模型，`ozon_client_id` / `ozon_api_key_encrypted` 使用 `cryptography.fernet` 加密（密钥来自 `SETTINGS.encryption_key`）
- 所有 tracking API 接受 `store_id` Query（默认用户最近使用的店铺）
- `OzonSellerClient.from_store(store)` 工厂方法替代 `.from_settings()`

**理由**：模型已存在；符合 FR-039 店铺级隔离。

### 4. 同步引擎：Celery + 游标分页

**选择**：
- `sync_store_products(store_id)`：`POST /v3/product/list` 游标遍历 → bulk upsert `synced_products`
- `sync_store_inventory(store_id)`：批量 `POST /v4/product/info/stocks`（每批 1000 SKU）
- `sync_store_orders(store_id)`：`POST /v3/posting/fbs/list` + `fbo/list`，按 `since` 增量
- `SyncJob` 表记录 job_type、status、started_at、finished_at、error_message、records_processed
- 限流：任务内 `asyncio.Semaphore` 或现有 rate limiter，429 指数退避

**理由**：对齐参考文档「游标分页全量同步」与项目已有 Celery 基础设施。

### 5. 预警规则（一期简化）

**选择**：
- 低库存：用户 per-store 配置阈值（默认 5），`inventory_snapshots.present < threshold` 标记
- 订单超时：FBS 待发货超过 48h（可配置）高亮
- 异常商品：`statuses.is_created=false` 或 visibility=INVISIBLE 且非 ARCHIVED
- 预警汇总页 `/tracking/alerts` 只读列表；站内 Badge 计数，无 SSE/邮件（二期）

### 6. 看板 KPI 数据来源

**选择**：
- 总商品数：`COUNT(synced_products WHERE store_id=?)`
- 订单数/销量：`synced_orders` 聚合 + Ozon `POST /v1/analytics/data` 每日定时拉取缓存至 `analytics_daily`
- 转化率：analytics API 返回的 `hits_view` / `ordered_units` 计算
- 趋势图：最近 7/30 天 `analytics_daily` 折线图（Recharts）

**理由**：analytics API 有独立限流，适合日级缓存而非实时。

### 7. 导航与首页调整

**选择**：
- `NAV_ITEMS` 首项改为 `{ href: "/tracking", label: "店铺跟踪" }`
- 首页 `MODULES` 数组同理；登录后 `redirect` 默认 `/tracking`（替换 `/rankings` 或 `/`）
- ERP 工作台内二级导航独立于 GlobalNav，使用左侧 Sidebar 组件

### 8. API 路由规划

| 域 | 端点 | 说明 |
|----|------|------|
| Stores | `GET/POST /api/v1/stores` | 列表/新增 |
| Stores | `POST /api/v1/stores/{id}/verify` | 凭证校验 |
| Stores | `DELETE /api/v1/stores/{id}` | 解绑 |
| Dashboard | `GET /api/v1/tracking/dashboard?store_id=` | KPI + 趋势 |
| Products | `GET /api/v1/tracking/products` | 改读本地索引 + 筛选 |
| Products | `POST /api/v1/tracking/products/sync` | 触发同步 |
| Products | `POST /api/v1/tracking/products/batch-visibility` | 批量上下架 |
| Inventory | `GET /api/v1/tracking/inventory` | 库存列表 |
| Inventory | `POST /api/v1/tracking/inventory/batch-update` | 批量改库存 |
| Inventory | `PUT /api/v1/tracking/inventory/alert-config` | 预警阈值 |
| Orders | `GET /api/v1/tracking/orders` | 订单列表 |
| Sync | `GET /api/v1/tracking/sync-jobs/{id}` | 同步任务状态 |
| Alerts | `GET /api/v1/tracking/alerts` | 预警汇总 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 大店铺全量同步耗时长 | 游标分页 + 增量 since；首次同步后台执行，前端展示进度 |
| Ozon API 429 限流 | 任务级 rate limiter；失败重试 3 次指数退避 |
| 本地数据与平台延迟 | UI 展示 `synced_at`；提供「立即同步」按钮 |
| Store 凭证泄露 | Fernet 加密 + 日志脱敏；API 响应永不返回 api_key |
| 迁移破坏现有 /tracking 书签 | `/tracking` 重定向至 dashboard；商品列表迁至 `/tracking/products` |
| analytics API 字段变更 | Pydantic optional 字段 + 默认值；client 层映射 |
| 多店铺切换状态丢失 | `localStorage` 持久化 `activeStoreId` |

## Migration Plan

1. **DB 迁移**：Alembic 新增 `synced_products`、`inventory_snapshots`、`synced_orders`、`analytics_daily`、`sync_jobs`、`inventory_alert_configs` 表
2. **后端**：先部署 Store API + 扩展 OzonSellerClient，再部署 sync 任务与 tracking 新端点
3. **数据初始化**：已有 `.env` 凭证自动创建默认 Store（bootstrap 脚本，一次性）
4. **前端**：新增 layout + 子路由；`/tracking` 旧列表逻辑迁至 `/tracking/products`；更新 GlobalNav 顺序
5. **Celery**：注册 sync beat schedule（每 15 分钟 per active store）
6. **回滚**：停用 Celery beat；前端 revert 路由；DB 表可保留（无破坏性）

## Open Questions

- 登录后默认 landing 是否改为 `/tracking`？→ **建议是**，与「最重要模块」定位一致
- 一期是否实现批量上下架（调用 Ozon archive/unarchive API）？→ **建议实现**，属商品中心核心操作
- `.env` 单店铺 bootstrap 是否自动迁移为第一个 Store？→ **建议是**，降低现有用户迁移成本
- 差评通知（FR-036）是否纳入一期 alerts 占位？→ **否**，需 review API，留二期
