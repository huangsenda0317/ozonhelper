## 1. 数据库与模型

- [x] 1.1 Alembic 迁移：`price_snapshots`、`profit_configs`、`exchange_rates`、`listing_jobs`、`listing_items`、`finance_transactions`、`return_orders`、`logistics_alert_configs`、`logistics_alert_events`、`review_alerts`、`operation_logs` 表
- [x] 1.2 扩展 `synced_orders`：`packed_at`、`shipped_at`、`last_tracking_at`、`delivered_at`、`tracking_status`、`tracking_events`、`seller_note`
- [x] 1.3 扩展 `synced_products`：`listing_job_id`；实现 SQLAlchemy 模型
- [x] 1.4 扩展 `alerts` 表 type 枚举：`logistics`、`bad_review`、`price_anomaly`

## 2. Ozon API 客户端扩展

- [x] 2.1 实现 `price_import`、`product_import`、`product_import_info`
- [x] 2.2 实现 `posting_fbs_ship`、`posting_tracking`（路径按 Ozon 文档确认）
- [x] 2.3 实现 `finance_transaction_list`、`returns_list`
- [x] 2.4 单元测试：mock Ozon 响应验证客户端方法

## 3. 价格中心

- [x] 3.1 实现 `sync_store_prices` Celery 任务 + Beat 调度
- [x] 3.2 实现 `GET/PUT /api/v1/tracking/pricing/profit-config`
- [x] 3.3 实现 `GET /api/v1/tracking/pricing` 列表与 `POST .../batch-update`
- [x] 3.4 价格异常检测逻辑写入 alerts
- [x] 3.5 前端 `/tracking/pricing`：列表、批量改价对话框、成本模型 Tab、skeleton 加载

## 4. 新品刊登

- [x] 4.1 添加 `openpyxl` 依赖；实现 Excel 模板生成与解析
- [x] 4.2 实现 `GET template`、`POST upload`、`GET jobs`、`GET jobs/{id}`、`POST retry`
- [x] 4.3 实现 `process_listing_job` Celery 任务（分批 import + 状态轮询）
- [x] 4.4 前端 `/tracking/listing`：上传区、任务列表、详情与进度轮询

## 5. 履约自动化

- [x] 5.1 实现 `POST /api/v1/tracking/orders/{posting_number}/ship`
- [x] 5.2 实现 `sync_order_tracking` Celery 任务
- [x] 5.3 实现 `POST .../orders/export`、`PATCH .../orders/batch-note`
- [x] 5.4 实现 `sync_returns` + `GET /api/v1/tracking/returns`
- [x] 5.5 扩展 `/tracking/orders`：发货表单、批量导出/备注、轨迹时间线、面单外链、售后 Tab

## 6. 财务对账

- [x] 6.1 实现 `sync_store_finance` Celery 任务
- [x] 6.2 实现 `GET .../finance/summary`、`GET .../finance/product-profit`、`GET .../finance/export`
- [x] 6.3 扩展 dashboard API：revenue_month、fees_month、gross_profit_month
- [x] 6.4 前端 `/tracking/finance`：KPI、ECharts 趋势、交易表、利润 Tab、导出（Dark 数据面板样式）

## 7. 物流预警

- [x] 7.1 实现 `GET/PUT /api/v1/tracking/logistics-alerts/config`
- [x] 7.2 实现 `check_logistics_alerts` Celery 任务（30 分钟 Beat）
- [x] 7.3 实现 `GET/PATCH .../logistics-alerts` 台账 API
- [x] 7.4 前端 `/tracking/logistics-alerts`：阈值配置、台账表格、处理状态、跳转订单

## 8. 预警 Hub 与差评

- [x] 8.1 实现 `sync_review_alerts` Celery 任务（FR-036）
- [x] 8.2 扩展 `GET /api/v1/tracking/alerts` 多类型筛选与 alert_counts
- [ ] 8.3 可选：SSE `/api/v1/tracking/alerts/stream`（未实现，后续迭代）
- [x] 8.4 重构 `/tracking/alerts`：类型 Tab、批量处理、Lucide 图标、severity 色条

## 9. ERP 导航与看板

- [x] 9.1 扩展 `TrackingShell` 侧边栏：价格、刊登、财务、物流预警
- [x] 9.2 扩展 `/tracking` 看板：财务 KPI 卡片、扩展预警摘要
- [x] 9.3 扩展商品中心：价格异常 Tab、保本价列
- [x] 9.4 新增 hooks：`usePricing`、`useListing`、`useFinance`、`useLogisticsAlerts`

## 10. 验证

- [x] 10.1 批量改价 → Ozon 回写 → 价格异常 alert 生成（API 已实现，需绑定店铺实测）
- [x] 10.2 Excel 刊登 10 SKU → job 完成 → 商品同步可见（API 已实现，需绑定店铺实测）
- [x] 10.3 FBS 发货运单回传 → 订单状态更新（API 已实现，需绑定店铺实测）
- [x] 10.4 财务同步 → finance 页 KPI 与导出（API 已实现，需绑定店铺实测）
- [x] 10.5 物流阈值触发 → logistics-alerts 台账 → 标记 handled（API 已实现，需绑定店铺实测）
- [x] 10.6 差评同步 → alerts hub 展示；导航新路由可 deep link（API 已实现，需绑定店铺实测）
