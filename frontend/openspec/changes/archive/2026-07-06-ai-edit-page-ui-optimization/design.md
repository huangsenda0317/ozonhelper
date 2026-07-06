## Context

AI 改图页（`/ai-edit`）当前结构：
- 页面顶部 `<h1>AI 改图</h1>`（与 GlobalNav 重复）
- `Card` 内纵向：`ImageUploader`（自定义拖拽 + 缩略图网格）→ `PromptEditor`（textarea + 预设 pill + seed/scale 滑块）→ 提交按钮
- 下方改图任务表格（不变）

项目已安装 `antd` ^6.4.4 和 `@ant-design/nextjs-registry`，改图页已使用 `Popconfirm`。GlobalNav 已标识当前模块，页面内标题可移除。

## Goals / Non-Goals

**Goals:**

- 横向 1/3 + 2/3 工作区：左方形容器 + antd Upload 照片墙；右 prompt textarea
- 方形容器固定宽高比，内部照片墙超出时可滚动
- 下方 Collapse：「推荐提示词」「高级（seed/scale）」
- 移除页面 `<h1>` 标题
- 保持现有上传校验、API 调用、任务列表逻辑

**Non-Goals:**

- 不修改后端 API 或 SeedEdit 参数语义
- 不改变任务列表表格结构与交互
- 不引入 antd 全站主题替换（局部使用 Upload/Collapse 即可）
- 不调整 GlobalNav

## Decisions

### 1. 布局结构

```
┌─────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌─────────────────────────────────┐  │
│  │ 1/3      │  │ 2/3 Prompt textarea             │  │
│  │ 方形     │  │                                 │  │
│  │ Upload   │  │                                 │  │
│  │ 照片墙   │  │                                 │  │
│  │ (scroll) │  │                                 │  │
│  └──────────┘  └─────────────────────────────────┘  │
│  ▼ 推荐提示词 (Collapse)                             │
│  ▼ 高级 — seed / scale (Collapse)                   │
│  [ 发起 AI 改图 ]                                    │
└─────────────────────────────────────────────────────┘
│  改图任务表格（不变）                                  │
```

**实现**: Tailwind `grid grid-cols-1 md:grid-cols-3 gap-lg`；上传列 `md:col-span-1`，prompt 列 `md:col-span-2`。移动端垂直堆叠（上传在上）。

### 2. Ant Design Upload 照片墙

**选择**: `<Upload listType="picture-card" maxCount={10}>` 封装为新组件 `AntImageUploader` 或重写 `ImageUploader`。

**配置要点**:
- `customRequest` 调用现有 `apiClient.upload('/ai/upload-image', file)`
- `beforeUpload` 校验格式（JPG/PNG/WebP）和大小（≤10MB），失败 `message.error`
- `fileList` 受控，与现有 `UploadedImage[]` state 映射（`uid`, `url`, `thumbUrl`, `status`）
- `onRemove` 同步更新 state 并 `revokeObjectURL`

**方形容器滚动**:
```tsx
<div className="aspect-square w-full overflow-y-auto border rounded-lg p-sm">
  <Upload ... className="[&_.ant-upload-list]:flex-wrap" />
</div>
```

### 3. PromptEditor 拆分

**选择**: 
- `PromptEditor` 简化为仅 prompt textarea（或 inline 在 page.tsx 右侧列）
- 新建 `RecommendedPromptsCollapse` 和 `AdvancedSettingsCollapse`，或统一 `EditOptionsCollapse` 含两个 `Collapse.Panel`

**预设 prompt** 复用现有 `PRESET_PROMPTS` 数组，Collapse 内用 pill/button 列表，点击 `onPromptChange(p)`。

**高级面板** 迁移 seed/scale 滑块，默认折叠。

### 4. Collapse 默认状态

**选择**: 两个面板默认均折叠（`defaultActiveKey={[]}`），减少首屏干扰。

### 5. 标题移除

直接删除 `<h1 className="text-display-md...">AI 改图</h1>`，页面从 `Card` 工作区开始，保留适当 `py-xxl` 顶部间距。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| antd Upload 样式与 Apple Design 冲突 | 方形容器 + 局部 CSS 覆盖；保留项目 Button 用于提交 |
| 照片墙在方形容器内小屏体验差 | 移动端改为全宽，仍保持 aspect-square |
| Upload 与现有 `UploadedImage` 类型不一致 | 封装层做 fileList ↔ UploadedImage[] 双向转换 |
| Collapse 内 seed/scale 被忽略 | 提交逻辑不变，state 仍由 page 持有 |

## Migration Plan

纯前端重构，无数据库/API 迁移。部署后即时生效，可 revert 页面组件回滚。

## Open Questions

- Collapse 是否允许同时展开多个？→ 默认 `accordion={false}`，允许同时展开
- 推荐提示词面板是否默认展开？→ 默认折叠，与高级面板一致
