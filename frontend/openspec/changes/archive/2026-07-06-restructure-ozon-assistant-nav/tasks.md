## 1. OzonAssistantShell 壳层

- [x] 1.1 新建 `components/features/OzonAssistantShell.tsx`，参照 `TrackingShell` 实现二级 Tab（选品排行榜、商品采集、商品加工、商品管理），含 Lucide 图标与 active 态
- [x] 1.2 新建 `components/features/ComingSoonPanel.tsx` 占位组件（标题 + 说明文案 + 可选 changelog 链接）
- [x] 1.3 新建 `app/ozon-assistant/layout.tsx`，包裹 `OzonAssistantShell`

## 2. 路由迁移

- [x] 2.1 新建 `app/ozon-assistant/page.tsx`，`redirect("/ozon-assistant/rankings")`
- [x] 2.2 将 `app/ozon-rankings/page.tsx` 迁移至 `app/ozon-assistant/rankings/page.tsx`
- [x] 2.3 原 `app/ozon-rankings/page.tsx` 改为 redirect，保留 query string 转发至 `/ozon-assistant/rankings`
- [x] 2.4 新建占位页：`app/ozon-assistant/collection/page.tsx`、`processing/page.tsx`、`management/page.tsx`（使用 ComingSoonPanel）

## 3. GlobalNav 更新

- [x] 3.1 `GlobalNav.tsx` 将 `{ href: "/ozon-rankings", label: "选品排行榜" }` 替换为 `{ href: "/ozon-assistant", label: "OZON助手" }`
- [x] 3.2 确认 `isNavActive` 对 `/ozon-assistant/*` 子路径正确高亮一级「OZON助手」

## 4. RankingsShell 路径同步

- [x] 4.1 `RankingsShell.tsx` 中 `updateUrl` 的 `router.replace` 路径从 `/ozon-rankings` 改为 `/ozon-assistant/rankings`
- [x] 4.2 全局 grep `/ozon-rankings` 硬编码，更新前端引用（排除 redirect 页与 openspec 文档）

## 5. 验证

- [x] 5.1 桌面端：GlobalNav「OZON助手」高亮，二级 Tab 切换正常
- [x] 5.2 移动端：抽屉导航含「OZON助手」，二级 Tab 可访问
- [x] 5.3 访问 `/ozon-rankings?view=category` 正确重定向至新路径
- [x] 5.4 选品排行榜五大 Tab、筛选、分页功能无回归
