## Why

`shop-tracking-erp-core`（一期 MVP）已归档并交付：多店铺、商品/库存/订单同步、低库存预警、超时未发货高亮、经营看板。参考《Ozon 跨境电商卖家 ERP 系统》方案，**二期**能力（价格中心、新品刊登、履约自动化、财务对账、物流节点超时预警、差评提醒）仍是卖家日常运营的核心缺口，无法替代后台改价、发货回传、对账与物流风控操作。现需在已有同步引擎与 ERP 壳层上扩展，完成「入驻→商品→库存→**价格**→订单→**财务**→预警」闭环的第二阶段。

## What Changes

- **价格中心**：批量改日常价/活动价/折扣价（`v2/product/price/import`）；成本定价模型（采购+物流+平台费率→保本价）；卢布汇率联动微调；低价/高价异常预警
- **新品刊登**：Excel 导入 SKU 素材 → 校验 → 批量 `v2/product/import`（每批 ≤100）；审核状态轮询与异常标记
- **履约自动化（FBS/FBO）**：FBS 一键发货与运单号回传；FBO 物流轨迹同步；订单批量导出、面单打印入口、批量备注；售后退货/退款工单列表（只读同步 + 状态归类）
- **财务与对账**：同步 Ozon 结算单/手续费/退款扣款；单品利润核算（售价−成本−平台费−物流）；看板扩展财务 KPI；日/周/月报表 Excel 导出
- **物流节点超时预警**：可配置 5 类节点阈值（待打包/待揽收/运输停滞/待签收/异常滞留）；定时检测 + 预警台账 + 处理闭环（未处理/已处理/忽略）
- **预警中心扩展**：整合低库存、订单超时、异常商品、**物流预警**、**差评提醒（FR-036）**、**价格异常**于 `/tracking/alerts`
- **ERP 导航扩展**：侧边栏新增「价格」「刊登」「财务」「物流预警」子模块；`/tracking/alerts` 从占位升级为完整预警 hub
- **UI 设计**：沿用 Apple Design System 主调性；数据密集型页面吸收 ui-ux-pro-max 建议——Dark Mode OLED 变体、Fira Sans/Code 数据字体、表格 `overflow-x-auto`、批量操作 checkbox 栏、skeleton 加载、Recharts 财务趋势线

**本阶段不包含（三期）**：AI 俄语翻译、智能定价算法、子账号分权、多店汇总大盘、售后工单闭环处理（可创建/回复）。

## Capabilities

### New Capabilities

- `shop-tracking-pricing`：批量改价 API/UI、成本定价模型、汇率配置、价格异常检测与预警
- `shop-tracking-listing`：Excel 导入解析、刊登任务队列、审核状态同步、`/tracking/listing` 工作台
- `shop-tracking-fulfillment`：FBS 发货/运单回传、FBO 轨迹同步、面单/导出/备注、售后订单只读列表
- `shop-tracking-finance`：结算同步、单品利润、财务 KPI、报表导出、`/tracking/finance` 页面
- `shop-tracking-logistics-alerts`：物流节点阈值配置、定时检测 Celery 任务、预警台账与处理状态、`/tracking/logistics-alerts` 页面
- `shop-tracking-alerts-hub`：统一预警聚合 API、差评 SSE/轮询（FR-036）、多类型筛选与置顶规则

### Modified Capabilities

- `shop-tracking-nav-hub`：ERP 侧边栏新增价格/刊登/财务/物流预警路由；预警 Tab 从占位升级为 alerts-hub
- `shop-tracking-orders`：新增 FBS 发货操作、运单录入、批量导出/备注；扩展订单详情履约动作区
- `shop-tracking-dashboard`：新增财务 KPI 卡片（回款、手续费、毛利概览）；预警摘要扩展物流/价格/差评计数
- `shop-tracking-catalog`：商品详情新增「刊登来源」标记；异常 Tab 扩展价格异常筛选
- `ozon-seller-api-client`：新增 `price_import`、`product_import`、`posting_ship`、`finance_transactions`、物流轨迹相关端点

## Impact

- **前端**：`/tracking` layout 侧边栏扩展；新增 `/tracking/pricing`、`/tracking/listing`、`/tracking/finance`、`/tracking/logistics-alerts`；重构 `/tracking/alerts`；批量操作栏、Excel 上传、成本定价表单、物流阈值配置面板
- **后端**：新增 `api/pricing.py`、`api/listing.py`、`api/fulfillment.py`、`api/finance.py`、`api/logistics_alerts.py`；扩展 `services/sync/` Celery 任务；新增 DB 表（`price_snapshots`、`listing_jobs`、`finance_transactions`、`profit_configs`、`logistics_alert_configs`、`logistics_alert_events`、`review_alerts`）
- **数据库**：Alembic 迁移；`synced_orders` 扩展物流节点时间戳字段
- **依赖**：`openpyxl` 或 `pandas`（Excel 解析）；可选 `xlsxwriter`（报表导出）；复用 Recharts
- **外部系统**：Ozon Seller API（price/import、product/import、posting ship、finance、posting tracking）
- **规格对齐**：覆盖参考文档二期全部模块；FR-036 差评提醒；财务/物流为方案扩展需求
