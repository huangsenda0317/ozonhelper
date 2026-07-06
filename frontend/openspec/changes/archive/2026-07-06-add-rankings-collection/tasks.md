## 1. 类型与数据层

- [x] 1.1 新建 `lib/ozon-collection/types.ts`：CollectionItem、ProcessingStatus、SourcePlatform、CollectionFilters 等类型
- [x] 1.2 新建 `lib/ozon-collection/store.ts`：addItems、removeItems、updateItem、listItems、dedupeBySku；localStorage 持久化
- [x] 1.3 新建 `lib/ozon-collection/mappers.ts`：ProductRankingItem / AggregatedRankingItem → CollectionItem 字段映射
- [x] 1.4 新建 `lib/ozon-collection/mock-seed.ts`（可选）：预置 2–3 条 demo 数据便于开发验证

## 2. 排行榜采集操作

- [x] 2.1 扩展 `RankingsTable`：rowSelection props、checkbox 列、代表商品缺失行 getCheckboxProps disabled
- [x] 2.2 商品榜与可采集聚合行操作列新增「添加采集」按钮，调用 store.addItems + toast
- [x] 2.3 扩展 `RankingsTabs`：右侧「批量采集」按钮，disabled 绑定 selectedCount
- [x] 2.4 在 `RankingsShell` 管理 selectedRowKeys 状态；切换 Tab 清空选中；批量采集后 router.push `/ozon-assistant/collection`
- [x] 2.5 重复采集 dedupe 提示；批量采集跳过不可采集行并汇总 toast

## 3. 商品采集页框架

- [x] 3.1 新建 `CollectionShell.tsx`：页面标题、描述、筛选栏 + 批量操作栏 + 表格 + 抽屉容器
- [x] 3.2 新建 `CollectionFilterBar.tsx`：关键词、采集时间、来源平台、加工状态 + 查询/重置
- [x] 3.3 新建 `CollectionBulkBar.tsx`：批量加工、批量删除（disabled 无选中）
- [x] 3.4 替换 `app/ozon-assistant/collection/page.tsx`：渲染 CollectionShell 替代 ComingSoonPanel

## 4. 采集表格与 CRUD

- [x] 4.1 新建 `CollectionTable.tsx`：完整列定义、rowSelection、分页（客户端）
- [x] 4.2 新建 `CollectionProductCell.tsx`：名称 + 来源 tag + 加工状态 tag
- [x] 4.3 实现单行删除（Popconfirm）与批量删除
- [x] 4.4 实现批量加工：更新 processing_status + toast 引导商品加工 Tab
- [x] 4.5 空态组件：无数据时链向 `/ozon-assistant/rankings`

## 5. 详情 / 编辑 / 比价抽屉

- [x] 5.1 新建 `CollectionDetailDrawer.tsx`：基本信息、指标、图集占位；URL `?id=&panel=detail`
- [x] 5.2 新建 `CollectionEditDrawer.tsx`：编辑采集名称/标签，保存/取消；URL `?id=&panel=edit`
- [x] 5.3 新建 `CollectionCompareDrawer.tsx`：源商品链接 + mock 1688 比价结果区；URL `?id=&panel=compare`
- [x] 5.4 CollectionShell 根据 searchParams 打开/关闭对应 drawer

## 6. UI/UX 优化（UUPM）

- [x] 6.1 表格外层 `overflow-x-auto`；商品信息列 fixed left
- [x] 6.2 所有按钮/链接：`cursor-pointer`、hover 过渡 150–300ms、focus ring
- [x] 6.3 筛选栏响应式：md 以下折叠为可展开面板（对齐 RankingsFilterBar 模式）
- [x] 6.4 批量采集 CTA 使用 accent/amber 强调色，与数据列蓝色系区分

## 7. 验证

- [x] 7.1 手动验证：商品榜单条采集 → 采集页可见
- [x] 7.2 手动验证：多选批量采集 → 跳转采集页且条数正确
- [x] 7.3 手动验证：筛选（时间/平台/加工状态）与批量加工/删除
- [x] 7.4 手动验证：详情/编辑/比价抽屉 URL 深链与关闭行为
- [x] 7.5 手动验证：切换榜单 Tab 清空选中；深色模式无对比度问题
