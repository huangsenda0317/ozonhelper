## Why

OzonHelper 当前「榜单发现」模块基于自研爬虫，数据维度有限且导航已隐藏。DeepPick（跨境深选）提供了成熟的 Ozon 选品排行榜，涵盖商品榜、类目榜、品牌榜、卖家榜、机会榜五大视图及 GMV/销量/搜索会话等丰富指标。将 DeepPick 数据接入系统并恢复一级导航，可让卖家快速锁定潜力商品，缩短选品决策路径。

## What Changes

- 在 GlobalNav 新增一级菜单「选品排行榜」，路由 `/ozon-rankings`
- 新建选品排行榜页面，还原 DeepPick 五大榜单 Tab（商品榜、类目榜、品牌榜、卖家榜、机会榜）
- 后端新增 DeepPick API 代理服务，参考 `scrape_deeppick.py` 对接 `GET /api/v1/ozon/rankings/products`（`view` 参数区分榜单类型）
- 支持筛选：排序口径、类目筛选、发货方式（FBO/FBS）、关键词
- 支持分页、数据刷新、Redis 缓存与定时同步（Celery）
- 系统设置中配置 DeepPick 认证凭据（access_token / refresh_token / device_id），支持 token 自动刷新
- 按 ui-ux-pro-max 建议优化 UI/UX：数据密集型表格布局、KPI 摘要卡片、响应式筛选栏、行悬停高亮

## Capabilities

### New Capabilities

- `ozon-rankings-board`: 选品排行榜前端页面与导航入口，含五大 Tab、筛选表单、数据表格、分页与 KPI 摘要
- `deeppick-rankings-proxy`: 后端 DeepPick API 代理、认证管理、数据缓存与定时同步

### Modified Capabilities

（无）

## Impact

- **前端**: `GlobalNav.tsx`、新建 `frontend/src/app/ozon-rankings/` 页面及组件、API client 扩展
- **后端**: 新建 `services/deeppick/` 模块、API 路由 `/api/v1/ozon-rankings`、配置项（`DEEPPICK_*` 环境变量）、Celery 定时任务
- **数据库**: 可选缓存表 `deeppick_ranking_snapshots`（Redis 为主，DB 为辅持久化）
- **依赖**: 复用现有 `requests`/`httpx`、Redis、Celery；无需新增前端包（复用 antd Table/Tabs/Form）
- **外部**: 依赖 DeepPick API（`http://www.deeppick.cn`），需有效认证凭据
