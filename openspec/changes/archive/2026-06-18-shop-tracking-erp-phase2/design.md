## Context

- **现状**：`shop-tracking-erp-core` 已交付 ERP 壳层（`/tracking` layout + StoreSwitcher）、Celery 同步引擎、商品/库存/订单/看板/低库存预警；`OzonSellerClient` 已封装 product、stocks、orders、analytics、archive 端点
- **缺口**：参考文档二期模块（价格、刊登、履约、财务、物流预警）及 FR-036 差评提醒均未实现；`/tracking/alerts` 为简单汇总页
- **技术栈**：FastAPI + SQLAlchemy async + Celery + Redis + Next.js 14 + Apple Design System；图表已用 ECharts（趋势图 change 已归档）
- **UI 约束**：主调性保持 Apple Design；数据密集型子模块吸收 ui-ux-pro-max 建议——表格 `overflow-x-auto`、批量 checkbox 操作栏、skeleton 加载、Dark OLED 变体用于财务/预警页、Fira Sans 数字列、SVG 图标（Lucide）、hover `transition-colors duration-200`

## Goals / Non-Goals

**Goals:**

- 交付参考文档**二期**全部模块：价格中心、新品刊登、FBS/FBO 履约、财务对账、物流节点超时预警
- 扩展预警 hub，整合 FR-036 差评提醒与价格/物流异常
- 扩展 `OzonSellerClient` 与 Celery 同步任务覆盖 price/import、product/import、posting ship、finance、tracking
- 新增 ERP 子路由与 API，保持店铺级数据隔离（FR-039）

**Non-Goals:**

- 三期：AI 俄语翻译、智能定价算法、子账号权限、多店汇总大盘、售后工单创建/回复
- Webhook 接收 Ozon 推送；短信/企微/邮件通知（仅站内 + 可选浏览器通知占位）
- 完整会计系统；税务申报

## Decisions

### 1. 路由扩展

```
/tracking/pricing              → 价格中心（列表 + 批量改价 + 成本模型）
/tracking/pricing/cost-model   → 成本定价配置（可选同页 Tab）
/tracking/listing              → 新品刊登（Excel 上传 + 任务列表）
/tracking/finance              → 财务对账与利润
/tracking/logistics-alerts     → 物流预警台账 + 阈值配置
/tracking/alerts               → 统一预警 hub（重构）
```

侧边栏分组：运营（概览/商品/库存/价格/刊登）→ 履约（订单/物流预警）→ 分析（财务/预警）

### 2. 价格中心：本地快照 + 批量 import

- 同步任务 `sync_store_prices`：从 `synced_products` 拉 offer_id，批量 `product/info/prices` 写入 `price_snapshots`
- 批量改价：`POST /v2/product/price/import`，每批 ≤1000 prices；前端多选 + 统一调价（固定价/百分比/活动价）
- 成本模型：`profit_configs` 表存 SKU 级或类目级 `purchase_cost`、`logistics_cost`、`platform_fee_rate`；计算 `min_price = (cost_sum) / (1 - fee_rate) * exchange_buffer`
- 汇率：`exchange_rates` 单表存 RUB/CNY 手动汇率 + 可选定时拉取（初期手动配置）
- 价格异常：同步后检测 `price < min_price` 或 `price > max_price_threshold`（可配置）→ 写入 `alerts` type=`price_anomaly`

### 3. 新品刊登：异步任务 + Excel 模板

- 用户上传 `.xlsx`（固定列：offer_id、name、category_id、price、images、attributes JSON）
- 后端解析 → `listing_jobs` + `listing_items`；Celery `process_listing_job` 分批调用 `v2/product/import`
- 轮询 `import/info` 获取 task_id 状态；审核结果回写 `listing_items.status`
- 模板下载：`GET /api/v1/tracking/listing/template`

### 4. 履约自动化

- FBS 发货：`POST /v2/posting/fbs/ship` 封装；UI 在订单详情/批量操作栏录入 tracking_number、delivery_method
- FBO：同步任务扩展 `sync_order_tracking`，拉取 posting 物流节点写入 `synced_orders.tracking_events` JSONB
- 面单：跳转 Ozon 后台 URL 或调用 `posting/fbs/package-label`（若 API 可用）；首期提供「打开 Ozon 面单页」外链 + 批量导出 CSV
- 售后：`POST /v1/returns/list` 同步至 `return_orders` 只读列表

### 5. 财务对账

- Celery `sync_store_finance`：`POST /v3/finance/transaction/list` 增量同步 → `finance_transactions`
- 单品利润：`synced_products` JOIN `price_snapshots` JOIN `profit_configs` + 订单销量聚合
- 报表：`GET /api/v1/tracking/finance/export?range=7|30|month`，openpyxl 生成 xlsx
- 看板 KPI 扩展：`revenue_month`、`fees_month`、`gross_profit_month`

### 6. 物流节点超时预警

- `logistics_alert_configs`：每店铺每节点类型（pending_pack/pending_pickup/transport_stall/pending_delivery/abnormal）存 `enabled`、`threshold_days`（1-30，默认 2/3/5/7/3）
- Celery `check_logistics_alerts` 每 30 分钟：对比 `synced_orders` 节点时间戳与阈值 → upsert `logistics_alert_events`
- 处理状态：`status` enum unhandled/handled/ignored + `note` + `handled_at`
- 订单表扩展字段：`packed_at`、`shipped_at`、`last_tracking_at`、`delivered_at`、`tracking_status`

### 7. 差评提醒（FR-036）

- 同步任务 `sync_product_reviews` 或从 product info 拉 rating/reviews（若 API 支持）
- 新差评（≤2 星）→ `review_alerts` + `alerts` type=`bad_review`
- 前端 alerts hub 展示；可选 SSE `/api/v1/tracking/alerts/stream`（复用现有模式）

### 8. UI 设计（ui-ux-pro-max 融合）

| 页面 | 设计要点 |
|------|----------|
| 价格/库存/订单表格 | `overflow-x-auto`，sticky 首列，checkbox 批量栏 fixed bottom |
| 财务/物流预警 | Dark tile 背景 `#0F172A`，Primary `#1E40AF`，CTA/警告 `#F59E0B` |
| 图表 | ECharts 折线+面积 20% opacity；多系列 distinct colors |
| 加载 | skeleton + `animate-pulse`；批量操作 progress bar |
| 交互 | 所有可点击 `cursor-pointer`；`transition-colors duration-200` |

不替换全局 Apple Design nav/CTA，仅在 ERP 数据子页使用 Dark 数据面板变体。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| Ozon finance/review API 权限因店铺类型不同 | 绑店 verify 时检测 API scope；无权限功能灰显 + 文档说明 |
| product/import 结构复杂，Excel 模板难覆盖全属性 | 首期支持核心字段 + JSON attributes 列；复杂类目引导 Ozon 后台 |
| 物流节点字段因 FBS/FBO 差异大 | 统一 JSONB `tracking_events`；检测逻辑按 fulfillment_type 分支 |
| 批量改价误操作 | 二次确认对话框 + 操作日志表 `operation_logs` |
| Excel 大文件内存 | 流式解析 + 单 job 上限 500 行 |

## Migration Plan

1. Alembic 迁移新表与 `synced_orders` 扩展列（nullable，不影响现有数据）
2. 部署后端 API + Celery 新任务；Beat 注册 logistics/finance/price 同步
3. 部署前端新路由；侧边栏扩展
4. 现有 `/tracking/alerts` 数据迁移：alert type 枚举扩展，旧记录兼容

回滚：新路由/feature flag 关闭；新 Celery 任务 unregister；DB 迁移 down（仅无生产数据时）

## Open Questions

- Ozon `finance/transaction/list` 与 `returns/list` 具体 API 版本需 MCP/文档确认后微调路径
- FBS package-label API 是否对所有卖家开放——若否，面单仅外链方案
- 汇率数据源：首期手动 vs 接入央行/第三方 API（建议首期手动）
