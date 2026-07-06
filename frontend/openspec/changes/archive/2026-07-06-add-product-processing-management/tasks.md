## 1. 数据层与 Store

- [x] 1.1 新建 `lib/ozon-processing/types.ts`：ProcessingOrder、ProcessingStatus、ProcessingFilters、SpecMode 等类型
- [x] 1.2 新建 `lib/ozon-processing/store.ts` + Context：CRUD、状态流转、属性完整度计算、`createFromCollection`
- [x] 1.3 新建 `lib/ozon-processing/mock-seed.ts` 与 `utils.ts`（筛选、完整度、mock 优化文案模板）
- [x] 1.4 新建 `lib/ozon-management/types.ts`：ListingItem、ListingFilters、ListingStatus
- [x] 1.5 新建 `lib/ozon-management/store.ts` + Context：待上架 CRUD、批量上架/移出、`createFromProcessing`
- [x] 1.6 新建 `lib/ozon-management/mock-seed.ts` 与筛选工具函数
- [x] 1.7 扩展 `collection-context.tsx`：批量加工时调用 `ProcessingStore.createFromCollection`，按 `collection_item_id` 去重

## 2. 商品加工列表页

- [x] 2.1 新建 `ProcessingShell.tsx`：状态 Tab（加工池/加工中/加工成品/加工失败）+ 筛选栏 + 表格容器
- [x] 2.2 新建 `ProcessingFilterBar.tsx`：关键词、来源平台、创建时间、查询/重置；`< md` 折叠
- [x] 2.3 新建 `ProcessingTable.tsx`：列定义、rowSelection、操作列、横向滚动 wrapper
- [x] 2.4 新建 `ProcessingBulkBar.tsx`：批量删除、加工成品 Tab 下批量加入待上架
- [x] 2.5 新建 `ProcessingEmptyState.tsx`：空态 + 跳转采集箱链接
- [x] 2.6 替换 `app/ozon-assistant/processing/page.tsx`：接入 ProcessingShell + Provider

## 3. 商品加工编辑页

- [x] 3.1 新建 `app/ozon-assistant/processing/[id]/page.tsx` 路由与面包屑
- [x] 3.2 新建 `ProcessingEditPage.tsx`：基本信息区（标题、标签、描述）、类目与属性、规格配置、图片素材区
- [x] 3.3 实现「保存信息」「加入待上架」「重新创建加工单」操作与 toast 反馈
- [x] 3.4 规格模式切换（共用/分规格）与图片素材占位 UI
- [x] 3.5 删除加工单时同步回退采集项 `processing_status`

## 4. AI 一键优化

- [x] 4.1 新建 `ProcessingAiBanner.tsx`：info banner（中文编辑/俄文转换说明）+「AI 一键优化」primary 按钮
- [x] 4.2 实现 `optimizeCopy(orderId)` mock：1.5s 延迟，覆写 title_zh/tags_zh/description_zh，记录 ai_optimized_at
- [x] 4.3 优化中 loading 态、成功 toast、失败 toast；优化期间禁用重复点击
- [x] 4.4 空字段生成与已有内容改写 mock 模板（基于 SKU/采集名称）

## 5. 商品管理待上架

- [x] 5.1 新建 `ManagementShell.tsx` + `ManagementFilterBar.tsx` + `ManagementTable.tsx`
- [x] 5.2 新建 `ManagementBulkBar.tsx`：批量上架、移出待上架（确认对话框）
- [x] 5.3 新建 `ManagementEmptyState.tsx`：空态 + 跳转加工页链接
- [x] 5.4 替换 `app/ozon-assistant/management/page.tsx`：接入 ManagementShell + Provider
- [x] 5.5 新建 `app/ozon-assistant/management/[id]/page.tsx` + `ManagementDetailPage.tsx`（只读详情 + 返回待上架）

## 6. 壳层与样式（UUPM）

- [x] 6.1 确认 OzonAssistantShell 子路由 Tab 高亮（processing/*、management/*）
- [x] 6.2 在 `layout.tsx` 或页面级挂载 ProcessingProvider、ManagementProvider
- [x] 6.3 统一表格 hover/focus/cursor-pointer、批量操作栏样式，与采集页 Collection 组件一致
- [x] 6.4 AI info banner dark mode 适配；表单 label 关联 input

## 7. 联调与验证

- [x] 7.1 验证采集箱批量加工 → 加工池出现记录 → 编辑 + AI 优化 → 加入待上架 → 管理列表可见
- [x] 7.2 验证移出待上架 → 可再次加入；删除加工单 → 采集 status 回退
- [x] 7.3 验证空态、筛选、Tab 切换、移动端横向滚动
- [x] 7.4 运行 TypeScript 检查，修复 lint 错误
