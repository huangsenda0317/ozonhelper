## Why

当前「店铺跟踪」仅实现 MVP 级商品列表/详情（实时调 Ozon API），在导航中排在末位，与产品定位不符。参考《Ozon 跨境电商卖家 ERP 系统》方案，店铺运营（商品、库存、订单、数据看板）才是卖家上架后的核心闭环，应作为当前版本最重要模块优先落地，并将业务从「只读查询」扩展为「多店铺 + 定时同步 + 批量操作 + 异常预警」的 ERP 能力基座。

## What Changes

- **导航优先级**：将「店铺跟踪」移至 `GlobalNav` 与首页模块卡片最前位，登录后默认引导至 `/tracking` 仪表盘
- **ERP 模块壳层**：`/tracking` 重构为带侧边/顶栏子导航的 ERP 工作台，子模块：概览、商品、库存、订单、预警（二期占位）
- **多店铺管理**：基于已有 `Store` 模型，实现店铺绑定/切换/凭证校验 API 与 UI，替代 `.env` 单店铺硬编码
- **数据同步引擎**：Celery 定时增量同步（游标分页 `last_id`）+ 手动强制刷新；本地 PostgreSQL 缓存商品/库存/订单快照
- **商品中心扩展**：全量同步、异常商品标记（审核驳回/违规下架）、批量上下架、销售指标展示（FR-034）
- **库存中心**：实时库存同步、批量改库存、低库存预警（FR-035）
- **订单中心（一期）**：FBS/FBO 订单同步、状态归类（待打包/待发货/已签收/取消）、超时未发货高亮
- **经营看板**：店铺 KPI（总商品数、销量、订单数、转化率概览，FR-033）；7/30 天销售趋势（FR-037 基础版）
- **Ozon API 客户端扩展**：新增 stocks、orders、analytics、price import 等端点封装
- **本阶段不包含**：批量改价/成本定价模型、新品刊登 Excel 导入、财务对账、物流节点超时预警（二期）、AI 俄语翻译、子账号权限（三期）

## Capabilities

### New Capabilities

- `shop-tracking-nav-hub`：导航首位、ERP 工作台路由壳层、店铺切换器 UI、子模块 Tab/侧边导航
- `shop-store-management`：多店铺绑定/解绑/凭证校验/密钥过期预警、按店铺数据隔离（FR-038、FR-039）
- `shop-tracking-dashboard`：经营概览 KPI 与基础销售趋势图（FR-033、FR-037 基础版）
- `shop-tracking-catalog`：商品全量同步、本地索引、异常监控、批量上下架、列表/详情销售指标（扩展 FR-034）
- `shop-tracking-inventory`：库存同步、批量改库存、低库存预警规则与通知（FR-035）
- `shop-tracking-orders`：订单增量同步、FBS/FBO 状态归类、列表筛选、超时未发货预警
- `shop-tracking-sync-engine`：Celery 定时任务、游标分页全量/增量同步、手动刷新、同步状态与日志

### Modified Capabilities

- `ozon-seller-api-client`：扩展 stocks（v2/v4）、orders（v3 posting list）、analytics、price import 等方法；支持按 Store 凭证实例化客户端
- `shop-tracking-products`：从实时 API 代理改为本地同步索引 + 可选实时刷新；新增销售指标字段与异常状态筛选
- `shop-tracking-product-detail`：新增销售指标、库存变动摘要、同步时间戳；保留 Ozon 外链

## Impact

- **前端**：`GlobalNav.tsx`、`page.tsx` 首页卡片顺序；`/tracking` 重构为 layout + 子路由（`/tracking`、`/tracking/products`、`/tracking/inventory`、`/tracking/orders`）；新增 `StoreSwitcher`、Dashboard 图表组件
- **后端**：新增 `api/stores.py`、`api/dashboard.py`；扩展 `api/tracking.py`；新增 `services/sync/`、`services/inventory/`、`services/orders/`；新增 DB 模型（`SyncedProduct`、`SyncedOrder`、`InventorySnapshot`、`SyncJob` 等）；Celery 任务注册
- **数据库**：Alembic 迁移新增同步表与索引；`Store` 模型启用（凭证加密）
- **依赖**：无新重量级依赖；复用 Celery + Redis + httpx + Recharts（前端图表）
- **外部系统**：Ozon Seller API（product/list、product/info、stocks、posting/list、analytics/data）
- **规格对齐**：覆盖 `specs/001-ozon-follow-sell` FR-033~FR-039 一期子集；物流预警（FR 扩展）、财务对账、差评通知（FR-036）留二期
