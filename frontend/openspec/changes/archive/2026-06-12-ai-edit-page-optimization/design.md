## Context

AI 改图页（`/ai-edit`）当前流程：用户在 `PromptEditor` 填写 prompt/seed/scale → 点击「发起 AI 改图」→ 后端创建 `ProcessingTask` 并提交 Celery 任务。前端硬编码 `image_ids: ['all']`，后端 `image_urls` 为空 placeholder，实际上无法处理任何图片。

现有基础设施：
- **MinIO 存储**: `StorageClient.upload_bytes()` + `get_presigned_url()` 已就绪
- **SeedEdit 服务**: `ImageEditService.process_images()` 接受 `image_urls` 列表
- **任务模型**: `ProcessingTask.status` 为字符串，当前值 `pending/running/success/failed`

## Goals / Non-Goals

**Goals:**
- 用户可在 AI 改图页上传 1~10 张本地图片，预览后发起改图
- 提交时将 prompt 参数与所选图片 URL 绑定，任务卡片可回看输入图
- `pending` 状态任务可终止，不再进入 SeedEdit 处理
- 保持 Apple Design System 风格，与现有 `Card`/`Button`/`PromptEditor` 一致

**Non-Goals:**
- 不支持从商品库选图与上传混用（本次仅实现上传模式，商品库模式保留 API 但不改 UI）
- 不支持终止 `running` 状态任务（SeedEdit 已提交后无法撤回）
- 不做批量 prompt 差异化（所有图片共用同一 prompt）
- 不做图片编辑/裁剪预处理

## Decisions

### 1. 上传流程：前端直传后端，后端存 MinIO

**选择**: `POST /api/v1/ai/upload-image` multipart 上传 → 后端存 MinIO → 返回 `{ url, object_name }`

**替代方案**: 前端直传 MinIO presigned PUT — 需暴露 MinIO 凭证或额外签名逻辑，复杂度高

**约束**: 单文件 ≤ 10MB，格式 JPG/PNG/WebP，单次最多 10 张

### 2. 改图请求：新增 `image_urls` 字段

**选择**: `ImageEditRequest` 增加 `image_urls: list[str]`，与 `image_ids`/`collected_product_id` 互斥

```python
# 校验逻辑
if request.image_urls:
    # 直接使用上传后的 URL
elif request.collected_product_id:
    # 从商品库提取（现有逻辑，后续完善）
else:
    raise ValidationError('必须提供 image_urls 或 collected_product_id')
```

前端上传完成后收集 URL 列表，提交改图时传入。

### 3. 任务终止：软取消 + Celery revoke

**选择**:
1. API `POST /api/v1/ai/tasks/{task_id}/cancel` 仅允许 `status == 'pending'`
2. 将 DB 状态设为 `cancelled`，记录 `completed_at`
3. 调用 `celery_app.control.revoke(task_id, terminate=False)` 撤销队列中未执行的任务
4. Celery worker 在 `process_image_edit_task` 开头检查 DB 状态，若已 `cancelled` 则直接返回

**替代方案**: `terminate=True` 强制杀进程 — 对 running 任务有风险，且 SeedEdit 已提交无法撤回 API 调用

### 4. 前端组件拆分

**选择**: 新增 `ImageUploader` 组件（拖拽区 + 缩略图网格 + 删除），`ai-edit/page.tsx` 编排上传→预览→提交流程

**交互**:
- 未上传图片时「发起 AI 改图」按钮 disabled，tooltip 提示「请先上传图片」
- 上传中显示进度/loading 状态
- 任务卡片 `pending` 状态显示「终止」按钮（ghost/danger 样式）

### 5. input_data 存储结构

任务 `input_data` 扩展为：
```json
{
  "prompt": "...",
  "seed": -1,
  "scale": 0.5,
  "image_urls": ["https://minio/.../a.jpg", "..."],
  "source": "upload"
}
```

便于任务列表展示输入缩略图、重试时复用原图。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| MinIO presigned URL 24h 过期，重试时 URL 失效 | 存储 `object_name` 而非 URL，重试时重新生成 presigned URL |
| Celery revoke 无法保证 100% 阻止已 pickup 的任务 | Worker 入口二次检查 DB `cancelled` 状态 |
| 上传大文件阻塞请求 | 限制 10MB/文件，前端压缩提示 |
| 并发上传多张图片 | 前端串行或 Promise.all 批量上传，后端无状态 |

## Migration Plan

1. 后端：新增 upload + cancel 端点，扩展 schema，worker 加 cancelled 检查
2. 前端：新增 ImageUploader，改造 ai-edit 页提交逻辑
3. 无需 DB migration（status 为字符串，input_data 为 JSONB）
4. 部署顺序：先后端后前端，向后兼容（旧任务无 image_urls 仍正常展示）

## Open Questions

- 上传图片是否需要用户级隔离路径？→ 暂用 `uploads/ai-edit/{uuid}.{ext}`，后续可按 user_id 分目录
- 终止后是否清理 MinIO 临时上传？→ 暂不清理，后续加定时任务
