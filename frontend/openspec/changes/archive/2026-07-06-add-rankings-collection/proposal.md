## Why

选品排行榜当前只能浏览 DeepPick 榜单数据，用户发现潜力商品后无法一键加入采集箱，选品到跟卖链路在此断裂。DeepPick 竞品「采集箱」已验证「榜单 → 采集 → 加工」工作流；OzonHelper 的「商品采集」Tab 仍为占位页。现在需要打通排行榜与采集箱，让用户从任意榜单 Tab 批量/单条采集商品，并在采集页统一管理、筛选与后续加工。

## What Changes

- 选品排行榜表格支持行多选（checkbox 列）与单行「添加采集」操作按钮
- 在商品榜、类目榜、品牌榜、卖家榜、机会榜 Tab 栏最右侧新增「批量采集」按钮：默认 disabled，选中 ≥1 行后可点击；点击后将选中商品写入采集箱并导航至商品采集页
- 商品榜 Tab 的商品行展示「添加采集」；聚合榜（类目/品牌/卖家/机会）通过代表商品或关联 SKU 采集
- 将 `/ozon-assistant/collection` 从 ComingSoon 占位替换为完整「商品采集」页面（竞品采集箱）
- 采集页筛选：关键词、采集时间（今日/昨日/近七天）、来源平台（全部/1688/OZON）、加工状态（全部/已创建/未创建）
- 采集页表格列：商品信息（名称 + 采集来源 tag + 是否创建加工 tag）、当前价格、评分、评论数、跟卖数、销量、采集名称、品牌/卖家、采集时间、操作（详情、编辑、比价、删除）
- 采集页支持多选及批量加工、批量删除
- 采集数据来源于排行榜采集动作（首期 mock 本地存储，预留后端 API 契约）
- 详情/编辑/比价操作以抽屉或子路由形式还原 DeepPick 参考页核心信息（`reference/0.3-deeppick/`）
- 按 ui-ux-pro-max 建议优化：批量操作栏、表格横向滚动、可点击态与 hover 过渡、响应式筛选栏

## Capabilities

### New Capabilities

- `rankings-collection-actions`: 排行榜表格多选、单行添加采集、Tab 栏批量采集按钮及采集写入逻辑
- `product-collection-inbox`: 商品采集箱页面（筛选、表格、批量加工/删除、详情/编辑/比价子视图）

### Modified Capabilities

- `ozon-rankings-board`: 表格新增多选列与采集操作列；Tab 栏扩展批量采集入口
- `ozon-assistant-shell`: 「商品采集」Tab 由占位页改为真实采集箱页面

## Impact

- **前端**: `RankingsTable.tsx`、`RankingsTabs.tsx`、`RankingsShell.tsx`；新建 `ozon-collection/` 组件目录；替换 `app/ozon-assistant/collection/page.tsx`；新增详情/编辑/比价子页面或抽屉；mock 服务与类型定义
- **后端（预留）**: 采集 CRUD API（`/api/v1/collection-items`）、与加工模块联动；首期可前端 mock + localStorage
- **数据**: 采集项实体需关联来源榜单 view、SKU、采集时间、加工状态、来源平台
- **依赖**: 复用 antd Table rowSelection、现有 design token 与 OzonAssistantShell 布局；参考 `reference/0.3-deeppick/` 信息架构
