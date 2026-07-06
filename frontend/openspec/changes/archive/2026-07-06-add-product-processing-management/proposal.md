## Why

商品采集箱已打通「选品 → 采集 → 批量加工」入口，但「商品加工」与「商品管理」Tab 仍为 ComingSoon 占位，跟卖链路在加工与上架环节断裂。DeepPick 竞品已验证「加工池 → 编辑加工 → 待上架 → 批量上架」工作流；OzonHelper 需在还原核心信息架构的同时，按 Apple Design + UUPM 规范优化交互，并新增 **AI 一键优化**（标题、标签、描述，中文编辑、上架前转俄文）作为差异化能力。

## What Changes

- 将 `/ozon-assistant/processing` 从占位页替换为完整「商品加工」列表页（加工池 / 加工中 / 加工成品 Tab 或筛选，参考 DeepPick 列表）
- 加工列表筛选：关键词、加工状态（加工池 / 加工中 / 加工成品 / 加工失败）、来源平台、创建时间；表格列：商品信息、商品标题、属性完整度、加工状态、操作（编辑加工、加入待上架、重新创建加工单、删除等）
- 加工详情/编辑页（路由或全屏 drawer）：商品标题、商品标签、商品描述、类目与属性、规格配置、商品图片素材（共用/分规格）、保存信息、加入待上架、重新加工
- **新增 AI 一键优化**：详情/编辑页顶部提供 primary CTA；点击后 mock AI 优化 title、tags、description（中文展示）；页面展示提示文案「当前以中文编辑，上架前将自动转为俄文」
- AI 优化过程展示 loading → 成功 toast；优化后字段可继续手动编辑；支持再次优化
- 将 `/ozon-assistant/management` 从占位页替换为「商品管理」待上架列表页（参考 DeepPick 待上架列表）
- 管理列表筛选：关键词、来源状态、关联店铺、上架时间；表格列：商品信息、当前价格、品牌/卖家、来源状态、上架时间、操作（详情、批量上架、移出待上架）
- 管理详情页：待上架商品详情（主图与详情图、类目、品牌、库存、来源状态、采集标签、详情页浏览量等）；支持返回待上架
- 加工池「加入待上架」与采集箱「批量加工」状态联动；待上架列表数据来源于加工成品
- 按 UUPM 优化：批量操作栏、表格横向滚动、cursor-pointer + 200ms hover、响应式筛选栏、中文编辑区 info banner、AI CTA 视觉层级
- 首期 mock 本地 store（与 collection 模式一致），预留后端 API 契约

## Capabilities

### New Capabilities

- `product-processing-workbench`: 商品加工列表、筛选、Tab/状态切换、加工详情编辑、图片素材区、规格配置、加入待上架、重新加工
- `product-processing-ai-optimize`: AI 一键优化 title/tags/description（中文编辑态、俄文转换提示、loading/成功反馈、mock 实现）
- `product-management-listing`: 商品管理待上架列表、筛选、批量上架/移出、待上架详情

### Modified Capabilities

- `ozon-assistant-shell`: 「商品加工」「商品管理」Tab 由占位页改为真实页面；移除 ComingSoon 占位 requirement
- `product-collection-inbox`: 批量加工创建加工单后，加工池可读取对应记录（状态联动）

## Impact

- **前端**: 新建 `ozon-processing/`、`ozon-management/` 组件与 lib/store/types；替换 `processing/page.tsx`、`management/page.tsx`；扩展 collection store 与 processing store 联动
- **后端（预留）**: 加工单 CRUD、AI 文案优化 API、待上架队列、批量上架任务；首期前端 mock
- **AI 服务（预留）**: 文案优化可对接 LLM；俄文转换复用现有 TMT 翻译能力（上架阶段，本期仅 UI 提示）
- **参考**: `reference/0.3-deeppick/商品加工-*.html`、`商品管理-待上架*.html`
- **设计**: Apple Design token + UUPM（Plus Jakarta 系、#0369A1 CTA、表格 bulk actions、drawer 深链）
