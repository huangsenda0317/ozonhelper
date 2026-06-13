## MODIFIED Requirements

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
