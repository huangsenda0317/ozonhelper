## Context

- **现状**：`/ozon-assistant/processing` 与 `/ozon-assistant/management` 为 `ComingSoonPanel` 占位。商品采集箱已实现筛选、表格、批量加工（仅更新 `processing_status = created` 并 toast 提示）。DeepPick 参考页（`reference/0.3-deeppick/`）提供加工列表/详情、待上架列表/详情完整信息架构。
- **约束**：沿用 OzonAssistantShell 二级 Tab、Apple Design token（Action Blue #0066cc）、antd Table、Lucide 图标；首期 mock store + localStorage，与 collection 模式一致；AI 文案优化首期 mock，俄文转换仅 UI 提示（上架阶段对接 TMT）。
- **UUPM 设计系统**（Ozon Assistant）：
  - Pattern: 数据密集型 SaaS 工作台 + 功能分区
  - Colors: Primary #0F172A, CTA #0369A1, Background #F8FAFC
  - UX: Bulk Actions（checkbox + action bar）、表格 `overflow-x-auto`、表单 submit feedback（loading → toast）、确认对话框（删除/移出）
  - Interaction: `cursor-pointer`、150–300ms hover 过渡、focus 可见、无 emoji 图标
  - AI 区：info banner（中文编辑 / 俄文转换说明）+ primary CTA 视觉层级高于「保存信息」

## Goals / Non-Goals

**Goals:**

- 完整落地商品加工列表 + 编辑加工详情页，还原 DeepPick 核心字段与操作流
- 新增 AI 一键优化（title、tags、description），中文展示 + 明确提示文案
- 完整落地商品管理待上架列表 + 详情，支持批量上架/移出待上架
- 采集箱「批量加工」→ 加工池记录；加工成品「加入待上架」→ 待上架列表，状态闭环
- UUPM 优化：响应式筛选、批量操作栏、drawer/全屏编辑、loading/skeleton、空态引导

**Non-Goals:**

- 真实 AI LLM / TMT 俄文转换 API 对接（首期 mock 延迟 + 固定优化文案模板）
- 1688 找货、浏览器插件采集、OZON 真实批量上架 API
- 图片 AI 改图（SeedEdit）在加工详情内的完整集成（素材区仅展示占位与上传 UI）
- 已上架商品 Tab、库存同步、多店铺真实绑定

## Decisions

### 1. 数据模型与 Store 分层

**选择**：新建 `ProcessingStore` 与 `ManagementStore`（React Context + localStorage），通过 `collection_item_id` 关联采集项。

```typescript
// ProcessingOrder
{
  id, collection_item_id, sku, title_zh, tags_zh[], description_zh,
  category_path_zh, attributes[], spec_mode: 'shared' | 'per_spec',
  specs[], images[], status: 'pool' | 'processing' | 'finished' | 'failed',
  attribute_completeness: number, ai_optimized_at?: string,
  created_at, updated_at
}

// ListingItem (待上架)
{
  id, processing_order_id, collection_item_id, sku, title_zh,
  current_price, brand, seller_name, source_status, shop_id?,
  listing_status: 'pending' | 'listed', listed_at?, tags[], ...
}
```

**理由**：与 collection store 解耦，便于后续 API 替换；状态枚举对齐 DeepPick 文案。

**备选**：扩展 CollectionItem 内嵌加工字段 — 字段膨胀，不利于管理模块独立演进。

### 2. 加工列表状态 Tab

**选择**：顶部 Segmented / Tab：`加工池` | `加工中` | `加工成品` | `加工失败`（对应 status 筛选），另保留关键词、来源平台、创建时间筛选。

**理由**：DeepPick 列表以加工状态为核心分区；与参考页「加工池/加工成品」语义一致。

### 3. 加工编辑页路由

**选择**：
- 列表：`/ozon-assistant/processing`
- 编辑：`/ozon-assistant/processing/[id]`（全页编辑，参考 DeepPick 详情页信息量）

**理由**：加工编辑字段多（标题、标签、描述、类目属性、规格、图片素材），全页比 drawer 更合适；列表仍可用 `?status=pool` 深链筛选。

**备选**：drawer 编辑 — 与采集箱一致，但加工详情信息密度高，全页体验更好。

### 4. AI 一键优化交互

**选择**：
- 编辑页顶部 info banner：「当前以中文编辑，上架前将自动转为俄文」
- Primary 按钮「AI 一键优化」（Sparkles 图标），位于 banner 右侧或 sticky 操作栏
- 点击 → 按钮 loading → mock 1.5s 延迟 → 覆写 `title_zh`、`tags_zh`、`description_zh` → toast「AI 优化完成，请核对后保存」
- 记录 `ai_optimized_at`；可重复点击再次优化
- 优化文案 mock 规则：基于原标题/描述模板增强（非空则改写，空则生成示例中文）

**理由**：满足用户「中文显示 + 提示转俄文」需求；mock 可验证 UX，后续替换为 LLM API。

**备选**：分字段单独优化 — 增加操作步数，首期一键优化覆盖三字段更高效。

### 5. 加入待上架流转

**选择**：加工成品状态且属性完整度 ≥ 阈值（mock：标题非空即可）时，「加入待上架」可用；点击后在 `ManagementStore` 创建 `ListingItem`，加工单标记 `listed_to_management: true`，toast 提示前往商品管理。

**理由**：对齐 DeepPick「加工成品 → 待上架」链路。

### 6. 商品管理列表

**选择**：
- 列表：`/ozon-assistant/management`，默认 Tab「待上架商品」
- 筛选：关键词、来源状态、关联店铺（mock 下拉）、上架时间
- 表格：商品信息、当前价格、品牌/卖家、来源状态、加入待上架时间、操作（详情、移出待上架）
- 批量：多选 + 「批量上架」「移出待上架」（mock 批量上架为 toast + 状态更新）
- 详情：`/ozon-assistant/management/[id]` 只读 + 「返回待上架」

**理由**：还原参考页核心；「已上架商品」作为 Non-Goal 后续迭代。

### 7. 采集箱联动

**选择**：采集箱「批量加工」除更新 `processing_status = created` 外，调用 `ProcessingStore.createFromCollection(items)` 批量创建 `status=pool` 加工单；dedupe by `collection_item_id`。

**理由**：完成采集 → 加工池真实数据流，而非仅改 tag。

### 8. 组件结构

```
frontend/src/
  lib/ozon-processing/     types, store, mock-seed, utils, mappers
  lib/ozon-management/     types, store, mock-seed, utils
  components/features/ozon-processing/
    ProcessingShell, ProcessingFilterBar, ProcessingTable, ProcessingEditPage,
    ProcessingAiBanner, ProcessingImageSection, ProcessingSpecSection
  components/features/ozon-management/
    ManagementShell, ManagementFilterBar, ManagementTable, ManagementDetailPage
```

复用 `CollectionProductCell` 类商品信息展示；共享 filter bar 布局模式（参考 `CollectionFilterBar`）。

### 9. UUPM 视觉优化要点

| 区域 | 优化 |
|------|------|
| 筛选栏 | 桌面单行 flex-wrap；`< md` 折叠为「筛选」按钮展开 |
| 表格 | `overflow-x-auto`；左列商品信息 sticky |
| 批量栏 | 选中 ≥1 时底部或顶部浮动 action bar（amber/blue CTA） |
| AI Banner | `bg-blue-50 border-blue-200` info 样式 + Info 图标；dark mode 适配 |
| 编辑表单 | label 关联 input；placeholder 辅助但非唯一标签 |
| 空态 | 加工池空 → 链接采集箱；待上架空 → 链接加工成品 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 三 store 数据不一致 | `collection_item_id` 外键；加工单删除时同步回滚采集 status |
| AI mock 与真实 API 行为差异 | store 抽象 `optimizeCopy(orderId)` 方法，便于替换 |
| 编辑页字段多、首屏复杂 | 分 section 折叠（基本信息 / 类目属性 / 规格 / 图片素材） |
| 全页路由与 Shell Tab 导航 | 编辑/详情页保留 Shell Tab，面包屑「加工列表 / 编辑加工」 |
| localStorage 容量 | mock seed 控制条目数；文档标注限制 |

## Migration Plan

1. 新增 processing/management types + store + mock seed
2. 扩展 collection batchProcess → createFromCollection
3. 替换 processing/management ComingSoon → Shell + Table
4. 实现 processing/[id] 编辑页 + AI optimize
5. 实现 management/[id] 详情页
6. 更新 ozon-assistant-shell、product-collection-inbox delta specs
7. 回滚：恢复 ComingSoonPanel，移除新 store

## Open Questions

- AI 优化是否需保留优化前版本（undo）？（首期：无 undo，可再次 AI 优化或手动改）
- 属性完整度计算规则是否对接 Ozon 类目 API？（首期：mock 百分比，标题+描述+≥1 tag = 100%）
- 批量上架是否需选择目标店铺？（首期：mock 单店铺，UI 预留店铺下拉）
