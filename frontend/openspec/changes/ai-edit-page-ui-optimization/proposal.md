## Why

当前 AI 改图页采用纵向堆叠布局（上传区在上、PromptEditor 在下），页面 header 重复展示「AI 改图」标题（GlobalNav 已有导航上下文）；上传区为自定义拖拽组件，与项目已引入的 Ant Design 组件体系不一致；推荐提示词与高级参数（seed/scale）平铺展示，占用垂直空间且信息层级不清晰。

## What Changes

- 移除页面 header 中的「AI 改图」`<h1>` 标题
- 主工作区改为横向布局：左侧 1/3 为方形容器内的 Ant Design Upload 照片墙（`picture-card`），最多 10 张，容器内可滚动查看；右侧 2/3 为 prompt 输入 textarea
- 工作区下方新增两个 Ant Design `Collapse` 折叠面板：
  - **推荐提示词**：展示预设 prompt 模板，点击填入右侧输入框
  - **高级**：包含随机种子（seed）和编辑强度（scale）滑块
- 用 Ant Design `Upload` 替换现有自定义 `ImageUploader` 实现（保留上传 API 与校验逻辑不变）
- 重构 `PromptEditor`：主区域仅保留 prompt textarea；预设与高级参数迁移至 Collapse
- 任务列表区域保持不变

## Capabilities

### New Capabilities

- `ai-edit-workspace-layout`: AI 改图页工作区布局（去标题、1/3+2/3 分栏、Collapse 折叠面板）

### Modified Capabilities

- `ai-image-upload`: 上传 UI 改为 Ant Design 照片墙，置于左侧方形容器内，支持滚动，max=10

## Impact

- **前端**: `frontend/src/app/ai-edit/page.tsx`、`ImageUploader.tsx`（重写或替换为 antd Upload 封装）、`PromptEditor.tsx`（拆分/重构）
- **依赖**: 复用已有 `antd` ^6.4.4，无需新增包
- **后端**: 无变更（复用 `POST /ai/upload-image`、`POST /ai/image-edit`）
- **规格**: 更新 `openspec/specs/ai-image-upload/spec.md` 中上传 UI 相关要求
