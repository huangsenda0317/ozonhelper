## Context

- **现状**：选品排行榜（`/ozon-assistant/rankings`）已实现五大 Tab 与 antd 表格，操作列仅聚合榜有「Ozon 外链」。`RankingsTabs` 无右侧批量操作区。商品采集路由 `/ozon-assistant/collection` 为 `ComingSoonPanel` 占位。
- **参考**：DeepPick `reference/0.3-deeppick/` 提供采集箱列表、详情、编辑、1688 比价页面信息架构。
- **约束**：沿用 OzonAssistantShell 二级 Tab、项目 design token（Apple Design）、antd Table；首期数据可 mock（与排行榜 mock 模式一致），接口契约预留后端扩展。
- **UUPM 设计建议**：数据密集型表格 + 批量操作栏（checkbox + action bar）；表格 `overflow-x-auto`；所有可点击元素 `cursor-pointer` + 150–300ms hover 过渡；筛选栏桌面单行、移动端折叠；amber 色强调批量 CTA，蓝色系数据列。

## Goals / Non-Goals

**Goals:**

- 排行榜任意 Tab 支持多选与采集（单行 + 批量），采集后可在采集箱查看与管理
- 商品采集页完整还原参考页核心能力：筛选、表格、批量加工/删除、详情/编辑/比价
- 采集项与排行榜商品字段映射一致（SKU、名称、价格、评分、评论、跟卖、销量、品牌/卖家等）
- 加工状态与「商品加工」模块语义对齐（已创建 / 未创建）

**Non-Goals:**

- 浏览器插件采集、1688 找货独立入口、OZON 批量采集插件逻辑（后续迭代）
- 真实 DeepPick 采集 API 对接（首期 mock/localStorage）
- 商品加工池完整实现（批量加工仅更新状态并提示跳转加工 Tab）
- 1688 比价真实爬虫（比价页展示 mock 候选与「未比价」态）

## Decisions

### 1. 采集数据存储（首期 mock）

**选择**：前端 `CollectionStore`（React Context + localStorage 持久化），结构与未来 API 一致。

**理由**：排行榜当前已用 mock-service；采集功能可先验证 UX 闭环，后端 API 后续替换 store 实现。

**备选**：直接建 PostgreSQL 表 — 增加后端工作量，阻塞前端 UI 验证。

### 2. 排行榜多选范围

**选择**：
- **商品榜**：每行对应一个 `ProductRankingItem`，直接采集
- **聚合榜**（类目/品牌/卖家/机会）：采集「代表商品」（`top_product_url` / `top_product_name` / 关联 SKU）；无代表商品时该行不可选、不展示「添加采集」

**理由**：与 DeepPick 行为一致，聚合榜用户关心的是代表 SKU。

### 3. Tab 栏批量采集按钮布局

**选择**：扩展 `RankingsTabs` 为 `flex justify-between`：左侧 Tab 列表，右侧「批量采集」primary 按钮；`disabled={selectedKeys.length === 0}`。

**理由**：用户明确要求 Tab 最右侧；与 UUPM「Bulk Actions → Checkbox + Action bar」一致。

### 4. 采集页路由与子视图

**选择**：
- 列表：`/ozon-assistant/collection`
- 详情抽屉：`?id=<itemId>&panel=detail`
- 编辑抽屉：`?id=<itemId>&panel=edit`
- 比价抽屉：`?id=<itemId>&panel=compare`

**理由**：避免过多独立路由；抽屉可深链分享；参考页信息可在 drawer 内分 section 展示。

**备选**：独立子路由 `/collection/[id]/detail` — 更 RESTful，但首期 drawer 更快落地。

### 5. 表格组件复用

**选择**：采集页新建 `CollectionTable.tsx`，排行榜扩展 `RankingsTable` 的 `rowSelection` 与操作列；共享 `ProductInfoCell` 类展示组件。

**理由**：两表列定义不同，不宜强行合并；共享 cell 减少重复。

### 6. 来源平台 tag

**选择**：排行榜采集写入时 `source_platform: 'OZON'`；后续插件/1688 入口写入 `'1688'`。筛选「来源平台」据此过滤。

### 7. 批量加工行为

**选择**：选中项 `processing_status` 更新为 `created`，toast 提示「已创建加工单，请前往商品加工查看」；不自动跳转。

**理由**：加工模块尚未实现，仅建立状态链路。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| localStorage 跨设备不同步 | 文档标注 mock 阶段限制；API 就绪后切换 |
| 聚合榜代表商品缺失导致无法采集 | 禁用该行 checkbox 与按钮，tooltip 说明 |
| 重复采集同一 SKU | 写入前 dedupe by `sku`+`source_platform`，toast「已在采集箱」 |
| 表格列过多移动端溢出 | `overflow-x-auto` wrapper + 固定左列（商品信息） |
| 详情/编辑/比价 mock 数据不足 | 从排行榜字段 + 固定 mock 扩展字段填充 |

## Migration Plan

1. 新增 collection 类型与 store，不影响现有排行榜只读流程
2. 扩展 RankingsTable/RankingsTabs props（可选 `selectedRowKeys`），默认行为向后兼容
3. 替换 collection 页面 ComingSoon → CollectionShell
4. 更新 `ozon-assistant-shell` spec：采集 Tab 不再为占位
5. 回滚：恢复 ComingSoonPanel 并移除 rowSelection props

## Open Questions

- 后端采集 API 是否与 DeepPick 采集箱同步，还是 OzonHelper 独立实体？（首期按独立实体设计）
- 机会榜无 SKU 时是否允许按 label 伪采集？（首期：仅代表商品可采集）
