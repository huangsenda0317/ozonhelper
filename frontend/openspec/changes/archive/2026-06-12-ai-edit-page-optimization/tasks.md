## 1. 后端 — 图片上传 API

- [x] 1.1 在 `backend/src/schemas/ai.py` 新增 `UploadImageResponse` schema（`object_name`, `url`）
- [x] 1.2 在 `backend/src/api/ai_endpoints.py` 新增 `POST /upload-image` 端点：接收 `UploadFile`，校验格式（JPG/PNG/WebP）和大小（≤10MB），调用 `storage.upload_bytes()` 存 MinIO，返回 presigned URL
- [x] 1.3 扩展 `ImageEditRequest`：新增 `image_urls: list[str] | None` 字段，添加校验逻辑（`image_urls` 与 `collected_product_id` 至少提供一个）

## 2. 后端 — 改图提交逻辑完善

- [x] 2.1 修改 `submit_image_edit`：当 `request.image_urls` 存在时直接使用，`input_data` 存储 `image_urls` 和 `source: "upload"`
- [x] 2.2 修改 `retry_image_edit`：从 `input_data.image_urls` 或 `object_names` 重新生成 presigned URL 后重试
- [x] 2.3 修改 `process_image_edit_task` Celery 任务入口：执行前查询 DB，若 `status == 'cancelled'` 则直接返回

## 3. 后端 — 任务终止 API

- [x] 3.1 在 `backend/src/api/ai_endpoints.py` 新增 `POST /tasks/{task_id}/cancel` 端点：校验 `status == 'pending'`，设为 `cancelled`，设置 `completed_at`
- [x] 3.2 调用 `celery_app.control.revoke(celery_task_id, terminate=False)` 撤销队列中未执行任务（需在 submit 时记录 celery task id 到 `input_data` 或通过 task_id 关联）
- [x] 3.3 非 pending 状态返回 409 Conflict，不存在返回 404

## 4. 前端 — ImageUploader 组件

- [x] 4.1 创建 `frontend/src/components/features/ImageUploader.tsx`：拖拽/点击上传区域、缩略图网格、删除按钮
- [x] 4.2 实现客户端校验：格式 JPG/PNG/WebP、单文件 ≤10MB、最多 10 张
- [x] 4.3 调用 `POST /ai/upload-image` 上传，维护 `{ object_name, url, preview }[]` 状态，暴露 `images` 和 `onChange` props

## 5. 前端 — AI 改图页改造

- [x] 5.1 在 `ai-edit/page.tsx` 集成 `ImageUploader`，上传区域放在 `PromptEditor` 上方
- [x] 5.2 修改 `handleSubmit`：收集已上传图片 URL 列表，提交 `{ prompt, seed, scale, image_urls }` 替代硬编码 `image_ids: ['all']`
- [x] 5.3 未上传图片时 disable「发起 AI 改图」按钮
- [x] 5.4 任务卡片展示 `input_data.image_urls` 缩略图（最多 3 张 +N）
- [x] 5.5 pending 任务显示「终止」按钮，调用 `POST /ai/tasks/{task_id}/cancel`，成功后刷新列表

## 6. 前端 — StatusBadge 扩展

- [x] 6.1 在 `StatusBadge.tsx` 新增 `cancelled` 状态映射：灰色标签「已取消」

## 7. 联调验证

- [x] 7.1 验证完整流程：上传 2 张图片 → 填写 prompt → 发起改图 → 任务列表显示输入缩略图 → pending 任务终止成功
- [x] 7.2 验证边界：超大文件拒绝、无图片禁止提交、running 任务无终止按钮
