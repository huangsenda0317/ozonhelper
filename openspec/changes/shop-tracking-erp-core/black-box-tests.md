# 黑盒测试用例 — shop-tracking-erp-core

> **关联变更**：`openspec/changes/shop-tracking-erp-core`  
> **测试类型**：黑盒（仅通过 HTTP API / 浏览器 UI 验证，不依赖内部实现细节）  
> **覆盖范围**：FR-033 ~ FR-039 一期子集；10 个 capability spec  
> **版本**：v1.0 · 2026-06-15

---

## 1. 测试策略

| 维度 | 说明 |
|------|------|
| **API 黑盒** | 通过 `Authorization: Bearer <JWT>` 调用 `/api/v1/*`，断言状态码、响应结构与业务字段 |
| **UI 黑盒** | 通过浏览器访问 `/tracking` 及子路由，断言可见元素、跳转、交互反馈 |
| **E2E 旅程** | 跨模块串联：绑定店铺 → 同步 → 看板/列表/预警数据一致 |
| **Mock 边界** | Ozon 外部 API 不可控时，用无效凭证、空店铺、未同步店铺验证错误与空态；真实凭证用于冒烟 |
| **不在范围** | Celery Beat 调度精度、Fernet 加解密实现、SQL 执行计划 |

---

## 2. 测试环境前提

### 2.1 服务

- 后端：`uvicorn src.main:app --port 8000`（`SYNC_INLINE=true` 便于本地同步）
- 前端：`npm run dev`（默认 3000）
- 数据库：PostgreSQL 已执行 `alembic upgrade head`
- Redis：Celery / 缓存可用（`SYNC_INLINE=false` 时需 Worker）

### 2.2 账号与数据

| 角色 | 用途 |
|------|------|
| **User-A** | 主测试账号，至少绑定 1 个有效 Ozon 店铺 |
| **User-B** | 隔离测试，无店铺或绑定不同店铺 |
| **无效凭证** | 故意错误的 Client-Id / Api-Key |
| **有效凭证** | `.env` 或 Ozon 卖家后台 API Key |

### 2.3 通用断言约定

- 成功列表/详情：`response.data` 非 null，`meta` 分页字段合法
- 鉴权失败：`401`，无业务数据泄露
- 跨用户资源：`404`（非 403，避免 store_id 枚举）
- 响应时间：Dashboard / 列表读本地索引 **< 2s**（常规数据量）

---

## 3. API 黑盒测试用例

### 3.1 导航与入口（shop-tracking-nav-hub）

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-NAV-UI-01 | P0 | User-A 已登录 | 打开任意页，查看 `GlobalNav` | 第一项为「店铺跟踪」，链接 `/tracking` | 导航首位展示 |
| TC-NAV-UI-02 | P0 | User-A 已登录 | 访问首页 `/` | 「店铺跟踪」模块卡片位于最前 | 首页卡片顺序 |
| TC-NAV-UI-03 | P0 | 未登录 | 访问 `/login`，输入正确账号密码提交（无 redirect） | 跳转至 `/tracking` | 登录后默认入口 |
| TC-NAV-UI-04 | P1 | User-A 已登录 | 访问 `/login?redirect=/rankings` 并登录 | 跳转至 `/rankings`，非 `/tracking` | 登录后默认入口（redirect 优先） |
| TC-NAV-UI-05 | P0 | User-A 有店铺 | 访问 `/tracking/products` | 展示 ERP Layout：店铺切换器、二级导航「商品」高亮、「立即同步」按钮 | ERP 工作台壳层 |
| TC-NAV-UI-06 | P0 | User-B 无店铺 | 访问 `/tracking` | 空状态 + 引导前往 `/settings/stores` | 未绑定店铺引导 |

---

### 3.2 多店铺管理（shop-store-management）

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-STORE-API-01 | P0 | User-A 已登录，有 ≥1 店铺 | `GET /api/v1/stores` | `200`；数组含 `id,name,is_active,last_sync_at,created_at`；**不含** api_key | 店铺列表 API |
| TC-STORE-API-02 | P0 | 无 JWT | `GET /api/v1/stores` | `401` | 店铺列表 API |
| TC-STORE-API-03 | P0 | User-A 已登录 | `POST /api/v1/stores` Body: 有效 name/client_id/api_key | `201`；返回新 store id；列表可见新店铺 | 绑定成功 |
| TC-STORE-API-04 | P0 | User-A 已登录 | `POST /api/v1/stores` Body: 无效 api_key | `400`；`code=OZON_AUTH_FAILED`；DB 无新记录 | 凭证无效 |
| TC-STORE-API-05 | P0 | User-A 拥有 store S | `DELETE /api/v1/stores/{S}` | `204`；再次 GET 列表不含 S | 解绑成功 |
| TC-STORE-API-06 | P0 | User-A 已登录 | `POST /api/v1/stores/{S}/verify`，凭证仍有效 | `200`；`{ "valid": true }` | 密钥仍有效 |
| TC-STORE-API-07 | P1 | 店铺凭证已在 Ozon 侧失效 | `POST /api/v1/stores/{S}/verify` | `200`；`valid: false` 且含 reason | 密钥已失效 |
| TC-STORE-API-08 | P0 | User-A、User-B 各有多店铺 | User-A 请求 `GET /tracking/dashboard?store_id=<User-B的store>` | `404` | 跨用户访问拒绝 |
| TC-STORE-UI-01 | P0 | User-A 在 `/settings/stores` | 填写有效凭证提交新增表单 | 列表刷新；新店铺出现；StoreSwitcher 可选中新店铺 | 新增店铺表单提交 |
| TC-STORE-BOOT-01 | P2 | 全新环境；admin 无店铺；`.env` 已配 Ozon 凭证 | 重启后端 | admin 用户自动出现「默认店铺」 | env 凭证自动迁移 |

---

### 3.3 同步引擎（shop-tracking-sync-engine）

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-SYNC-API-01 | P0 | User-A 有有效店铺 S | `POST /api/v1/tracking/sync?store_id=S&scope=all` | `200/202`；返回 `sync_job_id` | 手动全量同步 |
| TC-SYNC-API-02 | P0 | 上一步得到 job_id | 每 2s `GET /api/v1/tracking/sync-jobs/{job_id}` | 最终 `status` 为 `succeeded` 或 `failed`；含 started_at/finished_at | 轮询同步进度 |
| TC-SYNC-API-03 | P1 | 同步成功 job | 查 sync_jobs 记录 | `records_processed ≥ 0`；`error_message` 为空 | SyncJob 持久化 |
| TC-SYNC-API-04 | P2 | Ozon 持续 429（测试环境模拟或记录生产 incident） | 触发同步并等待失败 | `status=failed`；error_message 含限流相关描述 | 失败记录 |
| TC-SYNC-UI-01 | P0 | User-A 在 `/tracking/products`，有店铺 | 点击「立即同步」，等待完成 | 按钮 loading → 恢复；**当前页列表/KPI 自动刷新**（无需 F5） | 同步完成后刷新 |
| TC-SYNC-UI-02 | P0 | 同步进行中 | 切换至 `/tracking/inventory` 等待同步完成 | 库存列表在完成后自动更新 | 同步完成后刷新 |
| TC-SYNC-UI-03 | P1 | 同步失败 | 完成后 | 页面展示错误文案（非空白 error_message） | 失败可感知 |

---

### 3.4 经营看板（shop-tracking-dashboard）

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-DASH-API-01 | P0 | 店铺 S 已完成至少一次同步 | `GET /api/v1/tracking/dashboard?store_id=S` | `200`；含 total_products、orders_*、units_sold_*、conversion_rate、last_synced_at、alert_counts | 看板数据加载 |
| TC-DASH-API-02 | P0 | 店铺从未同步 | `GET .../dashboard?store_id=S` | KPI 为 0 或默认值；含 `sync_required: true`（若 spec 实现） | 无同步数据 |
| TC-DASH-API-03 | P0 | 有 analytics 缓存 | `GET /api/v1/tracking/dashboard/trends?store_id=S&range=7` | 返回 ≤7 个日期点；每点含 date、units_sold 等 | 7 天趋势 |
| TC-DASH-API-04 | P1 | 同上 | `range=30` | 返回 30 天范围数据点 | 30 天趋势 |
| TC-DASH-UI-01 | P0 | 有同步数据 | 访问 `/tracking` | 3s 内 KPI 卡片、趋势图、预警摘要可见 | 看板渲染 |
| TC-DASH-UI-02 | P0 | 有预警 | 点击预警摘要卡片 | 跳转 `/tracking/alerts` | 预警摘要跳转 |
| TC-DASH-UI-03 | P0 | 有同步数据 | 点击「立即同步」至成功 | KPI 与 last_synced_at 更新 | 同步进行中 |

---

### 3.5 商品中心（shop-tracking-products / catalog）

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-PROD-API-01 | P0 | 已同步店铺 S | `GET /api/v1/tracking/products?store_id=S&page=1&limit=20` | `200`；≤20 条；meta.total ≥ 0；每条含 product_id、ordered_units、synced_at | 默认加载第一页 |
| TC-PROD-API-02 | P0 | 列表中有名称含 phone 的商品 | `?search=phone` | 仅返回 name/offer_id 匹配项（不区分大小写） | 关键词搜索 |
| TC-PROD-API-03 | P0 | 混合库存商品 | `?has_stock=true` | 全部 `stock_present > 0` | 筛选仅有库存 |
| TC-PROD-API-04 | P1 | 有销量数据 | `?sort_by=ordered_units&sort_order=desc` | 按销量降序 | 按销量排序 |
| TC-PROD-API-05 | P1 | 存在异常商品 | `?is_exception=true` | 仅 is_exception=true 的记录 | 筛选异常商品 |
| TC-PROD-API-06 | P0 | 无 JWT | `GET /api/v1/tracking/products` | `401` | 未登录拒绝 |
| TC-PROD-API-07 | P1 | 有效 product_id P | `GET /api/v1/tracking/products/{P}?store_id=S` | `200`；含销售指标、synced_at、ozon_url（sku 存在时） | 成功获取详情 |
| TC-PROD-API-08 | P1 | 不存在的 product_id | `GET .../products/999999999` | `404`；`PRODUCT_NOT_FOUND` | 商品不存在 |
| TC-PROD-API-09 | P1 | 有效 P | `GET .../products/{P}?realtime=true` | `200`；数据与本地可能不同；synced_at 更新或响应含最新字段 | 实时刷新 |
| TC-PROD-API-10 | P0 | 选 5 个 product_id | `POST /api/v1/tracking/products/batch-visibility` action=archive | 返回逐条成功/失败；成功项 visibility 变更 | 批量下架 |
| TC-PROD-UI-01 | P0 | User-A 有店铺 | 访问 `/tracking/products` | 非 404；列表、搜索框、筛选、分页可见 | 页面正常加载 |
| TC-PROD-UI-02 | P0 | 无店铺 | 访问 `/tracking/products` | 空状态 + 绑定引导 | 未绑定店铺 |
| TC-PROD-UI-03 | P1 | 有商品 | 搜索框输入 test，停 300ms | 请求带 search=test，列表更新 | 搜索触发刷新 |
| TC-PROD-UI-04 | P1 | 筛选无结果 | 应用极端筛选 | 展示「暂无匹配商品」 | 空结果 |
| TC-PROD-UI-05 | P0 | 列表有商品 | 勾选 3 个 →「批量下架」→ 确认 | API 调用成功；列表状态更新 | 批量下架 UI |
| TC-PROD-UI-06 | P0 | 列表有商品 | 点击某商品行 | 导航 `/tracking/products/{id}`，详情正确 | 从列表进入详情 |
| TC-PROD-UI-07 | P1 | 详情页 | 点击「实时刷新」 | 页面数据更新，loading 态正常 | 详情实时刷新 |
| TC-PROD-UI-08 | P1 | 无效 product_id | 直接访问详情 URL | 错误提示 +「返回列表」 | 加载失败 |

---

### 3.6 库存中心（shop-tracking-inventory）

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-INV-API-01 | P0 | 已完成库存同步 | `GET /api/v1/tracking/inventory?store_id=S` | `200`；含 present、reserved、warehouse_id | 库存列表 |
| TC-INV-API-02 | P1 | 阈值=5，有低库存 SKU | `?low_stock=true` | 全部 present < threshold | 低库存筛选 |
| TC-INV-API-03 | P0 | 10 条合法变更 | `POST /api/v1/tracking/inventory/batch-update` | 全部 success；GET 列表反映新库存 | 批量改库存成功 |
| TC-INV-API-04 | P2 | 含 1 条 Ozon 会拒绝的 SKU | 同上 | 响应含逐条 failure 明细 | 部分失败 |
| TC-INV-API-05 | P1 | User-A | `PUT /api/v1/tracking/inventory/alert-config` threshold=10 | 后续同步后 present<10 产生 alerts | 配置阈值 |
| TC-INV-UI-01 | P0 | 有低库存 | 访问 `/tracking/inventory` | 低库存行警告色高亮 | 库存页低库存高亮 |
| TC-INV-UI-02 | P1 | 有商品 | 批量改库存对话框提交 | Ozon 接受后列表更新 | 批量改库存 UI |

---

### 3.7 订单中心（shop-tracking-orders）

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-ORD-API-01 | P0 | 已完成订单同步 | `GET /api/v1/tracking/orders?store_id=S` | `200`；含 posting_number、fulfillment_type、status | 订单列表 |
| TC-ORD-API-02 | P1 | 有 FBS/FBO 混合 | `?fulfillment_type=FBS` | 仅 FBS 订单 | FBS 筛选 |
| TC-ORD-API-03 | P0 | 存在超时订单 | `?is_overdue=true` | 全部 is_overdue=true | 筛选超时未发货 |
| TC-ORD-UI-01 | P0 | 有超时订单 | 访问 `/tracking/orders` | 超时行警告样式 + 标识 | 超时订单高亮 |
| TC-ORD-UI-02 | P1 | 从未同步 | 访问订单页 | 空列表 +「请先同步」类引导 | 空店铺引导 |
| TC-ORD-UI-03 | P1 | 有订单 | 切换 FBS/FBO/全部 Tab | 列表随筛选变化 | FBS/FBO 切换 |

---

### 3.8 预警汇总

| ID | 优先级 | 前置条件 | 操作步骤 | 预期结果 | 关联 Spec |
|----|--------|----------|----------|----------|-----------|
| TC-ALERT-API-01 | P0 | 存在低库存/超时/异常商品 | `GET /api/v1/tracking/alerts?store_id=S` | `200`；items 含 alert_type、severity、title | 预警汇总 API |
| TC-ALERT-UI-01 | P0 | 有预警 | 访问 `/tracking/alerts` | 列表展示各类型预警 | 预警页 |
| TC-ALERT-UI-02 | P1 | 无预警 | 访问 `/tracking/alerts` | 「暂无预警」空态 | 无预警空态 |

---

## 4. 端到端用户旅程（E2E）

| ID | 优先级 | 步骤 | 预期结果 | 对齐 tasks.md |
|----|--------|------|----------|---------------|
| TC-E2E-01 | P0 | 1. User-A 登录 → `/settings/stores` 绑定店铺<br>2. 等待首次同步或点「立即同步」<br>3. 打开 `/tracking` | KPI total_products > 0；last_synced_at 有值 | 12.1 |
| TC-E2E-02 | P0 | 1. `/tracking/products` 按销量排序<br>2. 筛选异常商品<br>3. 批量下架 1 个商品 | 排序/筛选生效；下架后列表 visibility 更新 | 12.2 |
| TC-E2E-03 | P1 | 1. `/tracking/inventory` 批量改库存<br>2. 设置阈值触发低库存<br>3. 同步后看 `/tracking/alerts` | 库存变更生效；alerts 出现低库存项 | 12.3 |
| TC-E2E-04 | P0 | 1. 同步订单<br>2. `/tracking/orders` 查看超时高亮<br>3. 检查 GlobalNav 首位与登录跳转 | 订单可见；超时样式正确；导航/跳转符合 spec | 12.4 |
| TC-E2E-05 | P1 | 1. 仅配置 `.env` 凭证的新 admin<br>2. 启动服务并登录 | 自动有默认店铺；原 MVP 商品列表在 `/tracking/products` 可用 | 12.5 |
| TC-E2E-06 | P0 | 1. 在 `/tracking` 点同步<br>2. 不刷新浏览器，停留当前 Tab<br>3. 同步成功 | 看板 KPI/趋势自动更新 | 同步完成后刷新 |

---

## 5. 边界与非功能用例

| ID | 优先级 | 场景 | 操作 | 预期结果 |
|----|--------|------|------|----------|
| TC-EDGE-01 | P1 | 切换店铺 | StoreSwitcher 选店铺 B | 各子页数据切换为 B 的数据；localStorage 记住选择 |
| TC-EDGE-02 | P1 | 并发同步 | 快速连点两次「立即同步」 | 第二次 disabled 或排队；无重复脏数据 |
| TC-EDGE-03 | P2 | 大 limit | `GET /products?limit=101` | `422` 或 clamp 至 100 |
| TC-EDGE-04 | P2 | 分页越界 | `page=9999` | 空 items；meta 合法 |
| TC-EDGE-05 | P1 | JWT 过期 | 用过期 token 调 API | `401`；前端跳转登录 |
| TC-NFR-01 | P1 | Dashboard 性能 | 已同步 1000+ SKU 店铺 | GET dashboard < 2s |
| TC-NFR-02 | P2 | 凭证安全 | 任意 stores/tracking 响应 | 响应体不含 api_key 明文 |

---

## 6. 追溯矩阵（Spec Scenario → 用例 ID）

| Capability / Spec | Scenario | 用例 ID |
|-------------------|----------|---------|
| shop-tracking-nav-hub | 导航顺序 | TC-NAV-UI-01 |
| shop-tracking-nav-hub | 首页卡片顺序 | TC-NAV-UI-02 |
| shop-tracking-nav-hub | 登录跳转 | TC-NAV-UI-03, TC-NAV-UI-04 |
| shop-tracking-nav-hub | 子路由共享 Layout | TC-NAV-UI-05 |
| shop-tracking-nav-hub | 未绑定店铺引导 | TC-NAV-UI-06 |
| shop-store-management | 获取店铺列表 | TC-STORE-API-01, TC-STORE-API-02 |
| shop-store-management | 绑定成功 / 凭证无效 | TC-STORE-API-03, TC-STORE-API-04 |
| shop-store-management | 解绑成功 | TC-STORE-API-05 |
| shop-store-management | 密钥仍有效 / 已失效 | TC-STORE-API-06, TC-STORE-API-07 |
| shop-store-management | 跨用户访问拒绝 | TC-STORE-API-08 |
| shop-store-management | 首次启动迁移 | TC-STORE-BOOT-01 |
| shop-tracking-sync-engine | 手动全量同步 / 轮询 | TC-SYNC-API-01~02, TC-SYNC-UI-01~03 |
| shop-tracking-dashboard | 看板数据 / 趋势 / UI | TC-DASH-API-01~04, TC-DASH-UI-01~03 |
| shop-tracking-products | 列表/搜索/排序/详情 | TC-PROD-API-01~09, TC-PROD-UI-01~08 |
| shop-tracking-catalog | 异常筛选 / 批量上下架 | TC-PROD-API-05, TC-PROD-API-10, TC-PROD-UI-05 |
| shop-tracking-inventory | 列表/批量/阈值/高亮 | TC-INV-API-01~05, TC-INV-UI-01~02 |
| shop-tracking-orders | 列表/超时/ UI | TC-ORD-API-01~03, TC-ORD-UI-01~03 |
| tasks.md §12 验证项 | 端到端 | TC-E2E-01 ~ TC-E2E-06 |

---

## 7. 执行记录模板

```
执行日期：
执行人：
环境：local / staging
SYNC_INLINE：true / false

| 用例 ID | 结果 PASS/FAIL/SKIP | 备注 |
|---------|---------------------|------|
| TC-...  |                     |      |
```

---

## 8. 后续自动化建议

若将本文档落地为可执行黑盒测试，建议：

1. **API 层**：`backend/tests/integration/test_tracking_erp_blackbox.py` — httpx `AsyncClient` + 测试库 + Ozon HTTP mock（respx）
2. **UI 层**：Playwright — 覆盖 TC-NAV / TC-SYNC-UI / TC-E2E 系列
3. **CI**：PR 跑 API 黑盒（mock Ozon）； nightly 跑真实凭证冒烟（secrets）
