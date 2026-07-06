## Why

当前「选品排行榜」作为 GlobalNav 一级菜单独立存在，与「商品采集 → 商品加工 → 商品管理」的跟卖业务链路割裂。用户需要在同一工作区内完成选品、采集、加工、上架全流程，导航应按业务阶段分组。参照「店铺跟踪 → 概览/商品/库存…」的二级 Tab 模式，将相关功能收敛到「OZON助手」一级入口下，降低认知负担并预留后续模块扩展位。

## What Changes

- GlobalNav 将原「选品排行榜」一级菜单替换为「OZON助手」，链接至 OZON 助手模块默认页（选品排行榜）
- 新增 `OzonAssistantShell` 页面壳，提供二级 Tab 导航，模式对齐 `TrackingShell`
- 二级 Tab 包含四项：**选品排行榜**、**商品采集**、**商品加工**、**商品管理**
- 选品排行榜页面迁入 OZON 助手 layout 下，保留现有五大榜单 Tab 与功能不变
- 商品采集 / 商品加工 / 商品管理：优先复用已有页面路由（`/products`、`/listing` 等），暂不可用的模块展示占位页（Coming Soon），确保导航结构完整
- GlobalNav active 态：访问 OZON 助手任一子路由时，「OZON助手」一级项高亮
- **BREAKING**：`/ozon-rankings` 路由迁移至 `/ozon-assistant/rankings`（旧路径 301/redirect 保留兼容）

## Capabilities

### New Capabilities

- `ozon-assistant-shell`: OZON 助手模块壳层——GlobalNav 一级入口、二级 Tab 导航、layout 路由组织、占位页与 active 态规则

### Modified Capabilities

- `ozon-rankings-board`: 导航入口从 GlobalNav 一级「选品排行榜」改为 OZON 助手二级「选品排行榜」；路由前缀变更

## Impact

- **前端**: `GlobalNav.tsx`、新建 `OzonAssistantShell` 与 `app/ozon-assistant/` layout 及子路由；迁移 `app/ozon-rankings/` → `app/ozon-assistant/rankings/`；更新 `RankingsShell` 页面标题层级；可选更新首页 toolbox 链接
- **后端**: 无变更
- **依赖**: 无新增包；复用现有 Link/路由与 Apple Design nav-tab 样式
- **关联变更**: 与 `add-ozon-rankings-board` 中一级导航 spec 存在冲突，本变更以其为准覆盖导航相关要求
