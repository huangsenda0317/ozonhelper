## 1. 上传组件 — Ant Design 照片墙

- [x] 1.1 重写 `ImageUploader.tsx`：使用 antd `Upload`（`listType="picture-card"`、`maxCount={10}`）
- [x] 1.2 实现 `customRequest` 调用 `POST /ai/upload-image`，`beforeUpload` 校验格式与 10MB 限制
- [x] 1.3 方形容器包裹照片墙：`aspect-square overflow-y-auto`，超出时可滚动
- [x] 1.4 保持 `UploadedImage[]` 对外接口（`images` / `onChange`），内部做 fileList 映射

## 2. Prompt 与折叠面板

- [x] 2.1 重构 `PromptEditor.tsx`：主区域仅保留 prompt textarea 与字符计数
- [x] 2.2 新增 Collapse 面板「推荐提示词」：复用 `PRESET_PROMPTS`，点击填入 prompt
- [x] 2.3 新增 Collapse 面板「高级」：迁移 seed / scale 滑块，默认折叠
- [x] 2.4 导出 props 接口供 page 持有 state（prompt、seed、scale 及 onChange）

## 3. 改图页布局重构

- [x] 3.1 移除 `page.tsx` 中 `<h1>AI 改图</h1>` 标题
- [x] 3.2 主工作区改为 `grid-cols-1 md:grid-cols-3`：左 1 列上传方形容器，右 2 列 prompt
- [x] 3.3 Collapse 面板与「发起 AI 改图」按钮置于分栏下方
- [x] 3.4 任务列表表格区域保持不变

## 4. 联调验证

- [x] 4.1 验证上传：照片墙、10 张上限、方形容器滚动、删除、格式/大小校验
- [x] 4.2 验证布局：桌面 1/3+2/3、移动端垂直堆叠、无页面 h1 标题
- [x] 4.3 验证 Collapse：推荐提示词填入、高级 seed/scale 生效、提交改图流程正常
