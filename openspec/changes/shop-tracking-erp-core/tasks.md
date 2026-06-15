## 1. 数据库与模型

- [x] 1.1 新增 Alembic 迁移：`synced_products`、`inventory_snapshots`、`synced_orders`、`analytics_daily`、`sync_jobs`、`inventory_alert_configs`、`alerts` 表及索引
- [x] 1.2 在 `backend/src/models/` 实现上述 SQLAlchemy 模型，关联 `Store.user_id`
- [x] 1.3 实现 Store 凭证 Fernet 加解密工具（`encryption_key` 来自 Settings）
- [x] 1.4 Bootstrap 脚本：将 `.env` 凭证为 admin 用户创建默认 Store（若无店铺）

## 2. Ozon API 客户端扩展

- [x] 2.1 `OzonSellerClient.from_store(store)` 工厂方法，支持 Store 凭证
- [x] 2.2 实现 `product_stocks_info`、`update_stocks`（v4/v2 stocks）
- [x] 2.3 实现 `posting_fbs_list`、`posting_fbo_list`（v3 posting）
- [x] 2.4 实现 `analytics_data`（v1 analytics）
- [x] 2.5 实现 `product_archive`、`product_unarchive`、`seller_info`
- [x] 2.6 内置 per-Client-Id 限流（50 req/s）与 429 退避辅助

## 3. 多店铺管理 API

- [x] 3.1 实现 `GET/POST /api/v1/stores`、`DELETE /api/v1/stores/{id}`、`POST /api/v1/stores/{id}/verify`
- [x] 3.2 实现 `store_id` 解析中间件/依赖：校验归属、默认活跃店铺
- [x] 3.3 在 `main.py` 注册 stores router

## 4. 同步引擎（Celery）

- [x] 4.1 实现 `sync_store_products`：游标分页 upsert `synced_products`，异常商品标记
- [x] 4.2 实现 `sync_store_inventory`：批量拉取 stocks 写入 `inventory_snapshots`
- [x] 4.3 实现 `sync_store_orders`：FBS/FBO 增量同步，超时标记 `is_overdue`
- [x] 4.4 实现 `sync_store_analytics`：日级 analytics 写入 `analytics_daily`
- [x] 4.5 实现 `sync_store_all` 编排与 `SyncJob` 状态更新
- [x] 4.6 注册 Celery Beat 每 15 分钟调度；`POST /api/v1/tracking/sync` 与 `GET /api/v1/tracking/sync-jobs/{id}`

## 5. 商品中心 API 扩展

- [x] 5.1 重构 `product_service`：默认读 `synced_products`，保留 `realtime=true` 路径
- [x] 5.2 扩展 `TrackingProductSummary/Detail` schema：销售指标、异常字段、synced_at
- [x] 5.3 实现 `POST /api/v1/tracking/products/batch-visibility`
- [x] 5.4 列表 API 新增 `is_exception`、`store_id`、`sort_by=ordered_units` 参数

## 6. 库存与订单 API

- [x] 6.1 实现 `GET /api/v1/tracking/inventory` 与 `POST /api/v1/tracking/inventory/batch-update`
- [x] 6.2 实现 `PUT /api/v1/tracking/inventory/alert-config` 与低库存 alert 写入逻辑
- [x] 6.3 实现 `GET /api/v1/tracking/orders`（status、fulfillment_type、is_overdue 筛选）
- [x] 6.4 实现 `GET /api/v1/tracking/alerts` 预警汇总端点

## 7. 看板 API

- [x] 7.1 实现 `GET /api/v1/tracking/dashboard`：KPI 聚合 + alert_counts
- [x] 7.2 实现 `GET /api/v1/tracking/dashboard/trends?range=7|30`

## 8. 前端：导航与 ERP 壳层

- [x] 8.1 `GlobalNav` 与首页 `MODULES`：「店铺跟踪」移至首位
- [x] 8.2 登录成功默认跳转 `/tracking`
- [x] 8.3 新建 `frontend/src/app/tracking/layout.tsx`：Sidebar 二级导航 + StoreSwitcher + 同步按钮
- [x] 8.4 实现 `StoreSwitcher` 组件与 `localStorage` 活跃店铺持久化
- [x] 8.5 新建 `/settings/stores` 店铺管理页（列表、新增、删除、凭证校验）

## 9. 前端：概览看板

- [x] 9.1 重构 `/tracking/page.tsx` 为 Dashboard：KPI 卡片、预警摘要
- [x] 9.2 集成 Recharts 销售趋势图（7/30 天切换）
- [x] 9.3 实现「立即同步」+ sync job 轮询刷新

## 10. 前端：商品中心迁移与扩展

- [x] 10.1 将原列表页迁至 `/tracking/products/page.tsx`
- [x] 10.2 将详情页迁至 `/tracking/products/[productId]/page.tsx`
- [x] 10.3 扩展列表：销售指标列、异常 Tab、批量选择与批量上下架
- [x] 10.4 扩展详情：销售指标、异常原因、synced_at、实时刷新按钮
- [x] 10.5 更新 `useTracking` hook：store_id、realtime、batch-visibility 参数

## 11. 前端：库存与订单

- [x] 11.1 新建 `/tracking/inventory/page.tsx`：库存列表、低库存高亮、批量改库存对话框
- [x] 11.2 新建 `/tracking/orders/page.tsx`：状态 Tab、FBS/FBO 切换、超时高亮
- [x] 11.3 新建 `/tracking/alerts/page.tsx`：预警汇总列表（低库存、超时订单、异常商品）
- [x] 11.4 新建 `useInventory`、`useOrders`、`useDashboard` hooks

## 12. 验证

- [x] 12.1 绑定店铺 → 首次同步 → 看板 KPI 有数据
- [x] 12.2 商品列表读本地索引，排序/异常筛选生效；批量下架成功
- [x] 12.3 库存批量修改回写 Ozon；低库存预警出现在 alerts
- [x] 12.4 订单同步与超时高亮；导航首位与登录跳转正确
- [x] 12.5 env 凭证自动迁移为默认 Store，现有 MVP 功能不回归
