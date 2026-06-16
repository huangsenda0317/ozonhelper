## Why

导航中「店铺跟踪」入口指向 `/tracking`，但前端路由尚未实现，用户访问即 404。卖家已在 `backend/.env` 配置 `OZON_CLIENT_ID` 与 `OZON_API_KEY`，需要尽快打通 Ozon Seller API，在平台内查看已上架商品并支持检索与详情，形成跟卖链路中「上架之后」的第一步闭环。

## What Changes

- 新增后端 Ozon Seller API 客户端，使用 `.env` 中的凭证调用官方接口（`POST /v3/product/list`、`POST /v3/product/info/list`）
- 新增 `GET /api/v1/tracking/products` 端点：分页返回在线商品列表，支持关键词搜索、可见性/状态筛选、排序
- 新增 `GET /api/v1/tracking/products/{product_id}` 端点：返回单个商品完整详情（标题、价格、库存、状态、图片、SKU 等）
- 新增前端 `frontend/src/app/tracking/page.tsx`：商品列表页（搜索框、筛选面板、分页、跳转详情）
- 新增前端 `frontend/src/app/tracking/[productId]/page.tsx`：商品详情页
- 新增 `useTracking` hook 封装 API 调用
- **本阶段不包含**：多店铺绑定 UI、销售仪表盘、趋势图、库存预警通知、Celery 定时同步（留作后续迭代）

## Capabilities

### New Capabilities

- `ozon-seller-api-client`: 后端 Ozon Seller API HTTP 客户端，统一鉴权头与错误处理
- `shop-tracking-products`: 在线商品列表 API 与前端页面，支持搜索、筛选、排序、分页
- `shop-tracking-product-detail`: 单个在线商品详情 API 与前端详情页

### Modified Capabilities

（无 — 根目录 `openspec/specs/` 尚无既有规格需变更）

## Impact

- **后端**: 新增 `services/ozon/`、`api/tracking.py`、`schemas/tracking.py`；`main.py` 注册路由；复用 `config.py` 已有 `ozon_client_id` / `ozon_api_key` / `ozon_api_base_url`
- **前端**: 新增 `/tracking` 与 `/tracking/[productId]` 路由；复用 `SearchInput`、`FilterPanel`、`Card`、`ProductCard` 等现有 UI 组件
- **依赖**: 无新第三方包（使用 `httpx` 或项目已有 HTTP 客户端）
- **外部系统**: Ozon Seller API（https://api-seller.ozon.ru）
- **规格对齐**: 对应 `specs/001-ozon-follow-sell` 中 FR-034 的子集（商品列表与指标展示）；FR-033/035/036/037/038 延后
