## 1. 后端 — DeepPick 客户端与配置

- [x] 1.1 在 `backend/src/config.py` 新增 `DEEPPICK_*` 配置项（base_url、access_token、refresh_token、device_id、cache_ttl）
- [x] 1.2 移植 `scrape_deeppick.py` 的 `DeepPickClient` 至 `backend/src/services/deeppick/client.py`（async httpx 版本）
- [x] 1.3 实现 token 自动刷新逻辑（401 → refresh → 重试）
- [x] 1.4 创建 `backend/src/schemas/deeppick_rankings.py`：`ProductRankingItem`、`AggregatedRankingItem`、`RankingSummary`、`RankingQueryParams`

## 2. 后端 — API 代理与缓存

- [x] 2.1 创建 `backend/src/services/deeppick/ranking_service.py`：代理查询 + Redis 缓存 + 降级逻辑
- [x] 2.2 创建 `backend/src/api/ozon_rankings.py`：`GET /api/v1/ozon-rankings` 路由，JWT 鉴权
- [x] 2.3 在 `backend/src/main.py` 注册路由
- [x] 2.4 实现字段映射：DeepPick 原始响应 → 标准化 schema（商品榜/机会榜/聚合榜）

## 3. 后端 — 定时预热

- [x] 3.1 在 `backend/src/worker/` 新增 `warmup_deeppick_rankings` Celery 任务
- [x] 3.2 配置 Celery beat 每 6 小时执行预热（五个 view 各第 1 页）

## 4. 前端 — 导航与页面骨架

- [x] 4.1 在 `GlobalNav.tsx` `NAV_ITEMS` 添加 `{ href: "/ozon-rankings", label: "选品排行榜" }`
- [x] 4.2 创建 `frontend/src/app/ozon-rankings/page.tsx` 页面骨架
- [x] 4.3 创建 `RankingsShell.tsx` 容器组件（整合 KPI、筛选、Tab、表格）

## 5. 前端 — 筛选与 Tab

- [x] 5.1 创建 `RankingsFilterBar.tsx`：排序口径、类目筛选、发货方式、关键词、查询/重置
- [x] 5.2 创建 `RankingsTabs.tsx`：五大 Tab 切换，同步 URL query `?view=`
- [x] 5.3 实现筛选状态管理：提交重置页码、query 参数序列化

## 6. 前端 — KPI 摘要与数据表格

- [x] 6.1 创建 `KpiSummaryBar.tsx`：总 GMV、总销量、热门类目、热门商品四卡片
- [x] 6.2 创建 `RankingsTable.tsx`：按 view 动态列配置（商品榜 15 列、聚合榜 10 列、机会榜额外列）
- [x] 6.3 实现数值千分位格式化、商品缩略图 + 双行标题渲染
- [x] 6.4 实现分页器（每页 50 条）与加载 skeleton、错误重试

## 7. 前端 — UI/UX 优化

- [x] 7.1 应用 ui-ux-pro-max Data-Dense Dashboard 风格：紧凑表格、行悬停高亮
- [x] 7.2 响应式：桌面筛选栏 inline，移动端折叠面板
- [x] 7.3 深色模式适配：复用 `useTheme` design token
- [x] 7.4 表格水平滚动 + 固定排名列

## 8. 联调与配置

- [x] 8.1 配置 `.env` 中 `DEEPPICK_ACCESS_TOKEN` / `DEEPPICK_REFRESH_TOKEN` / `DEEPPICK_DEVICE_ID`
- [x] 8.2 验证五大 Tab 数据加载、筛选、分页
- [x] 8.3 验证 token 过期自动刷新与缓存降级
- [x] 8.4 验证导航高亮、移动端抽屉、深色模式
