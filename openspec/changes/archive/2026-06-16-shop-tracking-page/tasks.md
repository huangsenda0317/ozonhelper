## 1. 后端 Ozon API 客户端

- [x] 1.1 在 `backend/src/services/ozon/client.py` 实现 `OzonSellerClient`（httpx 异步、Client-Id/Api-Key 头、30s 超时）
- [x] 1.2 实现 `product_list(filter, last_id, limit)` 调用 `POST /v3/product/list`
- [x] 1.3 实现 `product_info_list(product_ids)` 调用 `POST /v3/product/info/list`
- [x] 1.4 实现 Ozon HTTP 错误映射（401/403→OZON_AUTH_FAILED，429→OZON_RATE_LIMIT，其他→OZON_API_ERROR）
- [x] 1.5 凭证缺失时抛出 `OZON_NOT_CONFIGURED`（503）

## 2. 后端 Schemas 与业务服务

- [x] 2.1 在 `backend/src/schemas/tracking.py` 定义 `TrackingProductSummary`、`TrackingProductDetail`、列表 Query 参数 schema
- [x] 2.2 在 `backend/src/services/tracker/product_service.py` 实现列表聚合逻辑（list→info→搜索/筛选/排序/分页，max_scan_pages=10）
- [x] 2.3 在 `product_service.py` 实现详情单条查询（info/list by product_id）
- [x] 2.4 实现 Ozon 响应字段到 schema 的映射（price、stock、status、images、ozon_url）

## 3. 后端 API 路由

- [x] 3.1 在 `backend/src/api/tracking.py` 实现 `GET /api/v1/tracking/products`（JWT 认证、Query 参数校验）
- [x] 3.2 实现 `GET /api/v1/tracking/products/{product_id}`（404 PRODUCT_NOT_FOUND）
- [x] 3.3 在 `backend/src/main.py` 注册 tracking router

## 4. 前端 API Hook

- [x] 4.1 在 `frontend/src/lib/hooks/useTracking.ts` 实现 `fetchTrackingProducts(params)` 与 `fetchTrackingProductDetail(productId)`
- [x] 4.2 定义 TypeScript 类型 `TrackingProductSummary`、`TrackingProductDetail`

## 5. 前端列表页

- [x] 5.1 新建 `frontend/src/components/features/TrackingFilterPanel.tsx`（visibility、status、has_stock 筛选）
- [x] 5.2 新建 `frontend/src/app/tracking/page.tsx`（SearchInput + 筛选 + 商品卡片 + 分页 + 空/错误状态）
- [x] 5.3 处理 `OZON_NOT_CONFIGURED` 与加载中状态

## 6. 前端详情页

- [x] 6.1 新建 `frontend/src/app/tracking/[productId]/page.tsx`（主图、基本信息、价格库存、状态、Ozon 外链）
- [x] 6.2 实现返回列表导航与 404/错误降级 UI

## 7. 验证

- [x] 7.1 确认 `backend/.env` 已配置 `OZON_CLIENT_ID`、`OZON_API_KEY`，重启后端
- [x] 7.2 手动验证：登录 → 访问 `/tracking` 非 404 → 列表有数据 → 搜索/筛选生效 → 详情页正常
- [x] 7.3 验证凭证错误时前端展示友好提示
