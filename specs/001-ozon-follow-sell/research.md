# 技术研究报告: Ozon 跟卖全链路平台

**日期**: 2026-06-12 | **功能**: [spec.md](./spec.md)

## 1. Scrapling 在 Ozon 数据抓取中的应用

**决策**: 使用 Scrapling `StealthyFetcher` 作为核心抓取引擎，覆盖所有 Ozon/1688 抓取场景。

**理由**:
- Scrapling 内置 Cloudflare Turnstile 绕过能力 (Ozon 使用 Cloudflare 防护)
- 自适应元素定位 (`adaptive=True`) 确保 DOM 结构变更后仍能正确提取数据
- TLS 指纹伪装 + HTTP/3 支持模拟真实浏览器请求
- 支持 Playwright Chromium 回退 (JS 渲染页面)
- BSD-3 开源协议，无商业限制

**替代方案**:
- `curl_cffi` + 自定义 parser: 缺少自适应定位和 Cloudflare 绕过，维护成本高
- `playwright` + `playwright-stealth`: 浏览器开销大，无自适应定位
- Scrapy + scrapy-playwright: 生态笨重，Scrapling 更轻量且反检测更强

**使用模式**:

```python
from scrapling.fetchers import StealthyFetcher

# Ozon 排行榜 (带 Cloudflare 绕过)
page = StealthyFetcher.fetch(
    'https://www.ozon.ru/category/dom-17777/',
    solve_cloudflare=True,
    dns_over_https=True,
    block_ads=True
)
# 自适应提取 (网站改版后自动重定位)
products = page.css('.product-card', adaptive=True)
```

**风险与缓解**: Ozon 可能更新 Cloudflare 策略 → Scrapling 社区活跃 (46k+ stars)，跟进速度快。降级方案: 缓存数据 + 手动采集。

## 2. Next.js + Python FastAPI 集成架构

**决策**: 前后端分离，Next.js 通过 REST API 与 Python FastAPI 后端通信，Python 爬虫模块作为独立服务运行。

**理由**:
- Next.js 前端可使用 Apple Design Tokens 的 Tailwind 实现，获得最佳 UI 表现
- Python 后端自然集成 Scrapling 生态 (pip install scrapling)
- FastAPI 的异步支持和自动 OpenAPI 文档生成加速开发
- 前后端分离允许独立部署和扩展 (前端 Vercel/Edge, 后端 Docker)

**通信模式**:
```
Browser → Next.js (SSR/CSR) → FastAPI (REST) → Scrapling (抓取)
                                          → Celery Worker (异步任务)
                                          → PostgreSQL / Redis
```

**API 网关**: Next.js API Routes 作为 BFF (Backend For Frontend) 层，转发请求到 FastAPI。或直接用 FastAPI 作为统一 API Service。考虑到复杂度，V1 直接使用 FastAPI 作为统一 API 层，Next.js 纯前端渲染。

**替代方案**:
- Next.js 全栈 (API Routes 承载所有逻辑): Python/Scrapling 集成困难，需要在 Node.js 中调用 Python 子进程
- Django REST Framework: 比 FastAPI 重，异步支持较弱
- tRPC + Next.js: 前后端类型安全，但 Python 爬虫仍需单独处理

## 3. Apple Design Token 与 Tailwind CSS 集成

**决策**: 基于 `apple/DESIGN.md` 提取设计令牌，通过 Tailwind CSS 自定义主题实现。

**理由**:
- Tailwind 支持完整的设计令牌自定义 (colors, fontSize, borderRadius, spacing)
- Apple 设计系统严格限制颜色/排版/圆角，与 Tailwind 约束哲学一致
- 不需要额外 UI 库 (如 Radix, MUI)，减少依赖
- SF Pro 字体通过 `system-ui, -apple-system` 自动解析; 非 Apple 平台用 Inter 替代

**实现方案**:

```javascript
// tailwind.config.ts
{
  theme: {
    colors: {
      primary: '#0066cc',
      'primary-focus': '#0071e3',
      'primary-on-dark': '#2997ff',
      ink: '#1d1d1f',
      'ink-muted-80': '#333333',
      'ink-muted-48': '#7a7a7a',
      canvas: '#ffffff',
      'canvas-parchment': '#f5f5f7',
      'surface-tile-1': '#272729',
      'surface-tile-2': '#2a2a2c',
      'surface-black': '#000000',
      // ...
    },
    fontSize: {
      'hero-display': ['56px', { lineHeight: '1.07', letterSpacing: '-0.28px', fontWeight: '600' }],
      'display-lg': ['40px', { lineHeight: '1.1', fontWeight: '600' }],
      'body': ['17px', { lineHeight: '1.47', letterSpacing: '-0.374px', fontWeight: '400' }],
      // ...
    },
    borderRadius: {
      'none': '0',
      'xs': '5px', 'sm': '8px', 'md': '11px', 'lg': '18px',
      'pill': '9999px',
    },
    spacing: { 'xxs': '4px', 'xs': '8px', 'sm': '12px', 'md': '17px', 'lg': '24px', 'xl': '32px', 'xxl': '48px', 'section': '80px' },
    fontFamily: {
      display: ['SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
      text: ['SF Pro Text', 'system-ui', '-apple-system', 'sans-serif'],
    },
  }
}
```

**组件映射** (Apple 组件 → React 实现):
- `product-tile-light/dark` → `<ProductTile variant="light|dark">`
- `store-utility-card` → `<Card variant="utility">`
- `button-primary` → `<Button variant="primary">`
- `global-nav` → `<GlobalNav>`
- `sub-nav-frosted` → `<SubNav>`
- `search-input` → `<SearchInput>`

## 4. Ozon API 集成方案

**决策**: 结合 Ozon Seller API (官方) + Scrapling 公开页面抓取 (补充)。

**理由**:
- Ozon Seller API 提供商品上架 (`/v1/product/import`)、订单查询、销售报告
- 排行榜和商品详情等公开数据无官方 API，需通过抓取补充
- API 限流: 每秒最多 5 请求 (官方限制)

**API 模块划分**:
| 场景 | 数据源 | 方式 |
|------|--------|------|
| 排行榜数据 | Ozon 公开页面 | Scrapling 抓取 |
| 商品详情全字段 | Ozon 公开页面 | 浏览器插件采集 |
| 商品上架 | Ozon Seller API | REST API |
| 销售数据/订单 | Ozon Seller API | REST API |
| 库存同步 | Ozon Seller API | REST API |

**Seller API 认证**: 用户提供 API Key + Client ID，加密存储在后端。

## 5. 1688 货源搜索方案

**决策**: 使用 Scrapling 对 1688.com 搜索页面进行抓取，结合以图搜图和关键词搜索。

**理由**:
- 1688 无官方开放 API (仅有淘宝联盟推广 API，非货源搜索)
- Scrapling 的 stealth 模式可绕过 1688 的反爬 (含登录态页面)
- 以图搜图功能: 上传 Ozon 商品图片至 1688 搜索接口

**搜索策略**:
1. 关键词搜索: 提取 Ozon 商品标题关键卖点词 → 1688 搜索
2. 以图搜图: 使用 Ozon 商品主图 → 1688 图片搜索接口
3. 结果融合: 合并两次搜索结果，按相似度排序去重

**降级方案**: 1688 搜索失败时，提供手动输入进价模式。

## 6. 浏览器插件架构

**决策**: Manifest V3 Chrome Extension，通过 API 密钥签名与后端通信。

**理由**:
- Manifest V3 是 Chrome Web Store 当前强制标准
- Content Script 注入 Ozon 商品页面提取 DOM 数据
- Background Service Worker 处理 API 通信和认证

**架构**:
```
Ozon 商品页 → Content Script (DOM 提取) → Background (API 签名) → FastAPI 后端
```

**提取字段**: 标题、价格 (当前+原价)、评分、描述、属性表格、SKU 变体 (颜色/尺寸/选项)、主图 URL 列表、详情图 URL 列表、视频 URL、类目路径。

**安全**: 用户在平台生成 API 密钥 → 粘贴到插件设置 → 插件每次请求附带 HMAC 签名。

## 7. AI 图片处理方案 (SeedEdit 3.0)

**决策**: 使用火山引擎 SeedEdit 3.0 图生图 API 作为核心编辑引擎（语义编辑），Pillow 作为尺寸标准化后处理。

**理由**:
- SeedEdit 3.0 是字节跳动自研图像编辑扩散模型，在指令遵循度和图像内容保留方面表现优于 GPT-4o 和 Gemini 2.0
- 通过自然语言 prompt 驱动编辑（如「去除图片中的中文水印」「把背景换成白色纯色背景」），无需目标检测或 OCR 识别区域
- 单次调用仅 0.2 元/次，免费额度 500 次试用，成本远低于 GPT-4o（约 $0.02/张 ≈ 0.15 元/张，但 GPT-4o 仅能检测不能编辑）
- 异步提交+轮询获取结果的模式适合批量处理（通过 Celery 任务队列调度）
- Pillow 精确控制输出尺寸（1200×1200 白底 Ozon 规范），弥补 SeedEdit 输出尺寸不可精确指定的限制

**处理流程**:
```
原图 → 生成 SeedEdit prompt（如"去除图片中的所有中文水印和文字"）
     → SeedEdit API: CVSync2AsyncSubmitTask (异步提交, 返回 task_id)
     → 轮询 CVSync2AsyncGetResult (≤2s 间隔, status: in_queue→generating→done)
     → 获取编辑后图片 (image_urls, 24h 临时链接 → 立即下载转存 MinIO/S3)
     → Pillow (尺寸调整至 Ozon 规范: 1200×1200, 白底填充/裁剪)
     → 输出处理后的图片
```

**SeedEdit 3.0 API 关键信息**:

| 属性 | 值 |
|------|-----|
| 接口地址 | `https://visual.volcengineapi.com` |
| 鉴权方式 | 火山引擎 Signature V4 (AccessKey + SecretAccessKey) |
| Region | cn-north-1, Service=cv |
| req_key | `seededit_v3.0` |
| 输入图格式 | JPEG/PNG, ≤ 5MB, ≤ 4096×4096, 长边:短边 ≤ 3:1 |
| 输出分辨率 | 单边 [512, 1536], 与输入宽高比相关 |
| Default 并发 | 2（免费额度 500 次） |
| 计费 | 0.2 元/次（付费后） |
| 认证管理 | 平台级 AccessKey 加密环境变量，不暴露给终端用户 |

**关键错误码与处理**:

| 错误码 | 含义 | 处理策略 |
|--------|------|---------|
| 50429 | QPS 超限 | 指数退避重试，最多 3 次 |
| 50430 | 并发超限 | 指数退避重试，最多 3 次 |
| 50411 | 输入图片审核不通过 | 提示用户更换图片 |
| 50412 | 输入文本审核不通过 | 提示用户调整 prompt |
| 50413 | 输出文本审核不通过 | 提示用户调整 prompt |

**替代方案**:
- GPT-4o + Pillow: 仅能检测水印区域但不具备编辑能力，需额外步骤（Pillow inpainting 效果差）
- Midjourney API: 改图效果好但不可控（无法精确指定编辑区域），不适合批量标准化
- `rembg` + OpenCV: 可处理简单水印但无法理解语义文案
- SeedEdit 1.6: 上一代版本，指令遵循度不如 3.0

**后期成本模型**: 平台按 0.2 元/次成本 + 平台溢价（如 0.3-0.5 元/次）向用户收费，或包含在订阅套餐中。

## 8. AI 翻译方案 (腾讯云 TMT)

**决策**: 使用腾讯云机器翻译（TMT）TextTranslate 接口作为核心翻译引擎，替代此前的大语言模型（GPT-4o/Claude）方案。

**理由**:
- 腾讯云 TMT 是 WMT 世界机器翻译大赛冠军，翻译准确度业界领先
- 提供 Python SDK (`tencentcloud-sdk-python`)，接入简单
- 直接支持简体中文（zh）→ 俄语（ru）语言对，覆盖目标场景
- 单次请求文本长度 6000 字符，足够覆盖商品标题+描述翻译
- API 质量稳定，请求频率限制 5 次/秒，适合批量翻译场景
- 成本远低于通用大语言模型（GPT-4o/Claude），按字符计费而非 token

**TMT API 关键信息**:

| 属性 | 值 |
|------|-----|
| 接口域名 | `tmt.tencentcloudapi.com` |
| Action | TextTranslate |
| 版本 | 2018-03-21 |
| 鉴权方式 | 腾讯云 API 3.0 签名 (SecretId + SecretKey) |
| 源语言 | zh（简体中文） |
| 目标语言 | ru（俄语） |
| 单次最大字符 | 6000 (UTF-8) |
| 请求频率限制 | 5 次/秒 |
| 凭证管理 | 平台级 SecretId/SecretKey 加密环境变量，用户不可见 |

**关键错误码与处理**:

| 错误码 | 含义 | 处理策略 |
|--------|------|---------|
| FailedOperation.NoFreeAmount | 本月免费额度已用完 | 提示管理员充值，任务保留队列 |
| FailedOperation.ServiceIsolate | 账号欠费停止服务 | 提示管理员充值，任务保留队列 |
| LimitExceeded.LimitedAccessFrequency | 超出请求频率 | 自动限速重试（退避至 ≤5次/秒） |
| UnsupportedOperation.TextTooLong | 文本超过长度限制 | 自动分段翻译，合并结果 |
| InternalError.BackendTimeout | 后台服务超时 | 自动重试（最多 2 次） |

**翻译流程**:
```
商品标题/描述 (中文) → 检查文本长度 (≤6000 字符, 超长自动分段)
                    → TMT TextTranslate API (zh→ru, ProjectId=0)
                    → 获取 TargetText + UsedAmount (消耗字符数)
                    → 存储翻译结果到 ProcessingTask.output_data
                    → 展示预览（用户可手动编辑覆盖）
```

**替代方案**:
- GPT-4o / Claude API: 翻译质量高但成本远高于 TMT（按 token 计费），且通用大模型翻译专业领域术语不如专用翻译引擎
- 百度翻译 API: 支持中→俄语言对，但翻译质量在电商领域不如 TMT
- Google Cloud Translation: 支持语言多但国内访问不稳定
- 自建翻译模型: 维护成本高，不值得投入

## 9. 数据库选型

**决策**: PostgreSQL 作为主数据库，Redis 作为任务队列和缓存。

**理由**:
- PostgreSQL: 成熟的关系型数据库，支持 JSON 字段 (存储商品属性变体)、全文搜索 (1688 货源匹配)
- Redis: Celery broker + 爬虫结果缓存 + 榜单数据缓存 + 会话管理
- SQLAlchemy 2.0: Python 生态标准 ORM，异步支持 (asyncpg)

**替代方案**:
- MongoDB: 商品数据结构灵活但关系查询 (用户-店铺-商品) 复杂
- SQLite: 仅适用于单机开发，不支持并发写入
- MySQL: 功能等价于 PostgreSQL，但 JSON 和全文搜索能力较弱

## 10. 汇率数据获取

**决策**: 使用 exchangerate-api.com 免费额度 (每日更新)，利润计算时缓存当日汇率。

**理由**: 免费套餐支持 1500 次/月，每日一次足够; 支持 RUB/CNY 汇率对。

**替代方案**: Central Bank of Russia API (免费但不稳定), xe.com API (付费)。

## 11. 异步任务架构

**决策**: Celery + Redis 作为异步任务系统。

**任务类型**:
| 任务 | 触发方式 | 超时 | 重试 |
|------|---------|------|------|
| 榜单数据同步 | 定时 (每日 1 次) | 10min | 3 次 |
| 1688 货源搜索 | 用户触发 | 30s | 2 次 |
| AI 改图 | 用户触发 (批量) | 3min/张 | 1 次 |
| AI 翻译 | 用户触发 (批量) | 30s/商品 | 2 次 (TMT 频率限制/超时) |
| 批量上架 | 用户触发 | 5min | 0 (手动重试) |
| 销售数据同步 | 定时 (每 30 分钟) | 2min | 3 次 |
| 库存预警检查 | 定时 (每 15 分钟) | 1min | 0 |
