## Why

当前 AI 改图页仅支持从商品库批量改图（`image_ids: ['all']`），无法直接上传本地图片进行改图测试或独立处理；发起改图时 prompt 与图片缺乏关联展示，用户难以确认「对哪张图、用什么指令」；任务列表中 `pending` 状态任务无法取消，队列积压时无法及时终止无效任务。

## What Changes

- 在 AI 改图页新增图片上传区域，支持拖拽/点击上传多张本地图片（JPG/PNG/WebP），上传后展示缩略图预览，支持删除单张
- 发起 AI 改图时，必须基于已上传的图片（或保留从商品库选图模式），将 prompt、seed、scale 与所选图片一并提交
- 后端新增图片上传 API，将文件存入 MinIO 并返回可访问 URL；改图 API 支持接收 `image_urls` 参数（上传后的 URL 列表）
- 任务列表中 `pending` 状态的任务新增「终止」按钮，调用取消 API 将任务标记为 `cancelled`，并尝试撤销 Celery 队列中的未执行任务
- 任务卡片展示输入图片缩略图，便于对照 prompt 与改图结果

## Capabilities

### New Capabilities

- `ai-image-upload`: 本地图片上传至 MinIO，返回 URL 供改图任务使用
- `ai-task-cancel`: 终止 pending 状态的 AI 改图任务

### Modified Capabilities

（无 — `openspec/specs/` 目录尚无既有规格，本次均为新能力）

## Impact

- **前端**: `frontend/src/app/ai-edit/page.tsx`、新增 `ImageUploader` 组件、`PromptEditor` 可能微调
- **后端 API**: `backend/src/api/ai_endpoints.py` — 新增 `POST /ai/upload-image`、`POST /ai/tasks/{task_id}/cancel`
- **后端 Schema**: `backend/src/schemas/ai.py` — `ImageEditRequest` 增加 `image_urls` 字段
- **存储**: 复用现有 `StorageClient`（MinIO），上传路径 `uploads/ai-edit/{uuid}.{ext}`
- **任务队列**: Celery 任务需在启动时检查 `cancelled` 状态；API 层使用 `revoke(terminate=False)` 撤销 pending 任务
- **数据模型**: `ProcessingTask.status` 新增 `cancelled` 状态值（无需迁移，字符串字段）
