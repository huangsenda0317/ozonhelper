# OzonHelper 浏览器采集插件

在 **真实 Chrome 浏览器** 中打开 Ozon 商品页，一键提取商品详情，绕过服务端 403 反爬。

## 功能

- 提取标题、价格、折扣、图片、类目、属性、规格、库存、配送等
- 复制 JSON / 下载 JSON（无需后端即可使用）
- 可选同步到 OzonHelper 平台 API

## 安装

```bash
cd browser-extension
npm install
npm run build
```

Chrome → `chrome://extensions/` → 开发者模式 → **加载已解压的扩展程序** → 选择 `browser-extension/dist/`

## 使用

1. 用 Chrome 正常访问 Ozon 并打开商品页，例如：  
   `https://www.ozon.ru/product/shipovki-legkoatleticheskie-4584339838/`
2. 点击插件图标 → **提取商品信息**
3. 预览无误后 → **复制 JSON** 或 **下载 JSON**

## 开发

```bash
npm run dev    # watch 构建
npm test       # 单元测试
```

## 输出字段

与 `ozon-scraper-mcp` 的 `OzonProductDetail` schema 对齐，便于本地开发与 MCP 共用数据结构。

## 可选：同步到平台

在插件设置中填写：

- 平台 API 地址（默认 `http://localhost:8000/api/v1`）
- API 密钥

保存后可用「同步到平台」按钮上传。
