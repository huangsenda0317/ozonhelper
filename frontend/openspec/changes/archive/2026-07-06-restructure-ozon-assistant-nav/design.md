## Context

当前 GlobalNav 将「选品排行榜」作为一级菜单项（`/ozon-rankings`），与店铺跟踪模块的二级 Tab 模式不一致。店铺跟踪采用「GlobalNav 一级 + TrackingShell 二级 Tab」结构：一级入口 `/tracking`，壳层内提供概览、商品、库存等子页。

Ozon 跟卖业务链路为：选品 → 采集 → 加工 → 管理。用户希望将这四个阶段收敛到「OZON助手」模块，二级 Tab 分别为选品排行榜、商品采集、商品加工、商品管理。

现有可复用页面：
- 选品排行榜：`/ozon-rankings`（已实现，RankingsShell）
- 已采集商品：`/products`（商品管理候选）
- 选品池：`/selection-pool`、榜单发现：`/rankings`（历史模块，导航已隐藏）
- AI 改图/翻译：独立 GlobalNav 入口，不在本次范围

## Goals / Non-Goals

**Goals:**

- GlobalNav 一级菜单「OZON助手」替代「选品排行榜」
- 新增 `OzonAssistantShell`，二级 Tab 对齐 `TrackingShell` 交互与样式
- 选品排行榜迁入 `/ozon-assistant/rankings`，功能零回归
- `/ozon-rankings` 永久重定向至新路径
- 商品采集 / 商品加工 / 商品管理提供可导航占位页，后续迭代填充

**Non-Goals:**

- 不实现商品采集、加工、管理的完整业务功能（本次仅导航壳 + 占位）
- 不迁移 `/products`、`/listing` 等历史路由内容（后续独立变更）
- 不调整 AI 改图、AI 问答等 GlobalNav 独立入口
- 不修改后端 API

## Decisions

### 1. 路由前缀 `/ozon-assistant/*`

**选择**: 统一前缀 `/ozon-assistant/{rankings|collection|processing|management}`

**理由**: 与 `/tracking/*` 模式一致；GlobalNav active 态可通过 `pathname.startsWith("/ozon-assistant")` 判断。

**备选**: Route Group 保留 flat URL（`/ozon-rankings` 不变）—  rejected，一级/二级层级在 URL 中不可见，且与 proposal 中 BREAKING 迁移一致。

### 2. OzonAssistantShell 对标 TrackingShell

**选择**: 新建 `components/features/OzonAssistantShell.tsx`，layout 包裹子路由。

```tsx
const NAV = [
  { href: "/ozon-assistant/rankings", label: "选品排行榜", icon: BarChart3, exact: true },
  { href: "/ozon-assistant/collection", label: "商品采集", icon: Download },
  { href: "/ozon-assistant/processing", label: "商品加工", icon: Wrench },
  { href: "/ozon-assistant/management", label: "商品管理", icon: Package },
];
```

**理由**: 复用已验证的二级 Tab 模式（icon + label + active 样式 `nav-tab-active`）。

### 3. 默认 landing：`/ozon-assistant` → redirect rankings

**选择**: `app/ozon-assistant/page.tsx` 使用 `redirect("/ozon-assistant/rankings")`

**理由**: GlobalNav 链接 `/ozon-assistant` 时直接进入选品排行榜（当前最成熟子模块）。

### 4. 旧路径兼容

**选择**: `app/ozon-rankings/page.tsx` 改为 `redirect("/ozon-assistant/rankings")`；`RankingsShell.updateUrl` 中路径同步更新。

**理由**: 避免书签/外部链接失效；Next.js 服务端 redirect 无闪烁。

### 5. 占位页策略

**选择**: collection / processing / management 三个路由渲染统一 `ComingSoonPanel` 组件，文案说明模块规划中。

**理由**: 导航结构一次性到位，避免 GlobalNav 出现 dead link；后续变更只需替换 page 内容。

**后续映射参考**（不在本次实现）:
| Tab | 未来目标 |
|-----|---------|
| 商品采集 | 浏览器插件引导 + 采集任务列表 |
| 商品加工 | AI 改图/翻译流水线工作台 |
| 商品管理 | 迁移 `/products` + 批量上架 |

### 6. RankingsShell 页面标题

**选择**: 保留 RankingsShell 内 h1「选品排行榜」，不在 OzonAssistantShell 重复模块级标题。

**理由**: 与 TrackingShell 一致（壳层无 h1，子页自有标题）。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| `/ozon-rankings` 硬编码路径散落 | 搜索替换 + RankingsShell `updateUrl` 集中修改；tasks 含 grep 检查项 |
| 占位页用户困惑 | ComingSoonPanel 明确「功能开发中」并链至 changelog |
| 与 `add-ozon-rankings-board` spec 冲突 | 本变更 delta spec 覆盖导航相关要求 |
| 移动端二级 Tab 换行过多（4 项） | flex-wrap 对齐 TrackingShell；4 项可接受 |

## Migration Plan

1. 新建 `app/ozon-assistant/layout.tsx` + `OzonAssistantShell`
2. 移动 `app/ozon-rankings/page.tsx` → `app/ozon-assistant/rankings/page.tsx`
3. 旧 `app/ozon-rankings/page.tsx` 保留为 redirect
4. 更新 GlobalNav、RankingsShell URL
5. 本地验证：导航高亮、Tab 切换、旧 URL 重定向、移动端抽屉

**Rollback**: 恢复 GlobalNav 条目与路由文件即可；无 DB/后端变更。

## Open Questions

- 商品管理是否应在下一迭代直接迁入 `/products` 页面内容？（建议独立 change）
- 「OZON助手」文案是否需与品牌名「OzonHelper」统一为「Ozon 助手」？（当前按用户指定「OZON助手」）
