# ai-image-upload Specification

## Purpose
TBD - created by archiving change ai-edit-page-optimization. Update Purpose after archive.
## Requirements
### Requirement: 用户可上传本地图片

系统 SHALL 在 AI 改图页左侧工作区提供 Ant Design Upload 照片墙（`listType="picture-card"`），支持点击选择上传，接受 JPG、PNG、WebP 格式，单文件不超过 10MB，最多 10 张。照片墙 SHALL 置于固定比例的方形容器内，超出内容可滚动查看。

#### Scenario: 点击上传单张图片

- **WHEN** 用户点击照片墙上传按钮并选择一张 JPG 图片（≤10MB）
- **THEN** 图片上传至后端并在照片墙中显示缩略图预览

#### Scenario: 上传多张图片

- **WHEN** 用户连续上传 3 张 PNG 图片
- **THEN** 3 张图片均显示在照片墙中，总数不超过 10 张

#### Scenario: 方形容器内滚动

- **WHEN** 用户已上传超过容器可视区域的图片数量
- **THEN** 用户可在方形容器内滚动查看全部缩略图

#### Scenario: 拒绝超大文件

- **WHEN** 用户选择一张 15MB 的图片
- **THEN** 系统显示错误提示「单文件不超过 10MB」，该文件不被上传

#### Scenario: 拒绝不支持格式

- **WHEN** 用户选择一张 GIF 图片
- **THEN** 系统显示错误提示「仅支持 JPG、PNG、WebP 格式」

#### Scenario: 删除已上传图片

- **WHEN** 用户点击照片墙中某张图片的删除按钮
- **THEN** 该图片从列表中移除，不再参与改图提交

#### Scenario: 达到上限禁止继续上传

- **WHEN** 用户已上传 10 张图片
- **THEN** 照片墙不再显示上传按钮，无法继续添加

### Requirement: 上传 API 存储图片并返回 URL

后端 SHALL 提供 `POST /api/v1/ai/upload-image` 端点，接收 multipart 文件，存入 MinIO（路径 `uploads/ai-edit/{uuid}.{ext}`），返回 `{ object_name, url }` 其中 url 为预签名访问地址。

#### Scenario: 成功上传

- **WHEN** 客户端 POST 一张有效的 PNG 图片
- **THEN** 返回 200，`data.url` 为可访问的预签名 URL，`data.object_name` 为存储路径

#### Scenario: 未认证拒绝

- **WHEN** 未携带 JWT 的请求调用上传 API
- **THEN** 返回 401 Unauthorized

### Requirement: 改图提交必须关联已上传图片

用户 MUST 在上传至少一张图片后才能发起 AI 改图。提交时系统 SHALL 将 `image_urls` 与 prompt、seed、scale 一并发送至 `POST /api/v1/ai/image-edit`。

#### Scenario: 有图片时成功提交

- **WHEN** 用户已上传 2 张图片并填写 prompt，点击「发起 AI 改图」
- **THEN** 创建改图任务，`input_data.image_urls` 包含 2 张图片的 URL，`input_data.prompt` 为用户填写的 prompt

#### Scenario: 无图片时禁止提交

- **WHEN** 用户未上传任何图片
- **THEN** 「发起 AI 改图」按钮为 disabled 状态，无法提交

#### Scenario: 任务卡片展示输入图片

- **WHEN** 改图任务列表渲染一条包含 `input_data.image_urls` 的任务
- **THEN** 任务卡片显示输入图片缩略图（最多 3 张，超出显示 +N）

