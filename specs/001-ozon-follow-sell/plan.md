# 实现计划: Ozon 跟卖全链路平台

**分支**: `001-ozon-follow-sell` | **日期**: 2026-06-12 | **规格**: [spec.md](./spec.md)
**输入**: 来自 `/specs/001-ozon-follow-sell/spec.md` 的功能规格说明书
**最后更新**: 2026-06-12 (SeedEdit 3.0 集成)

## 概述

构建一个 Web 应用平台，覆盖 Ozon 跨境跟卖全链路环节：榜单发现 → 一键采集 → 1688 比价 → AI 翻译/改图 → 批量上架 → 店铺跟踪。平台采用前后端分离架构——前端 Next.js + React 提供 Apple 风格 UI，后端 Python + FastAPI 驱动爬虫与业务逻辑。爬虫基于 Scrapling 实现反检测抓取。AI 改图基于火山引擎 SeedEdit 3.0 图生图模型，AI 翻译基于腾讯云机器翻译（TMT）。

## 技术上下文

**语言/版本**: TypeScript 5.x (前端), Python 3.11+ (后端/爬虫)
**主要依赖**: Next.js 14+, React 18+, FastAPI, Scrapling v0.4.9+, SQLAlchemy, Celery, Redis, Pillow
**存储方案**: PostgreSQL (业务数据), Redis (任务队列 + 缓存), MinIO/S3 (图片存储)
**测试框架**: Jest + React Testing Library (前端), pytest + pytest-asyncio (后端)
**目标平台**: Web 应用 (Chromium/Firefox/Safari 现代浏览器); 浏览器插件仅支持 Chromium 内核
**项目类型**: Web 应用 (前后端分离)
**性能目标**: 页面首屏 ≤ 3s (P95), API 响应 ≤ 500ms (P95), 爬虫单商品采集 ≤ 10s, SeedEdit 单张改图 ≤ 60s
**约束条件**: 爬虫请求间隔 ≥ 2s (Ozon), ≥ 1s (1688); 单页榜单渲染 ≤ 50 条; SeedEdit 默认并发 2
**规模/范围**: V1 目标 1000 注册用户, 100 并发在线, 10 万条榜单商品缓存

## 宪章检查

*门禁: 必须在第 0 阶段研究之前通过。第 1 阶段设计之后重新检查。*

### 原则 I: 数据抓取可靠性 ✅

- 所有 Ozon/1688 抓取基于 Scrapling `StealthyFetcher` 实现反检测
- 指数退避重试 (3 次, base=1s, max=30s)
- 抓取结果通过 Pydantic 模型进行结构校验
- 数据源不可用时使用缓存降级

### 原则 II: 模块化独立架构 ✅

| 模块 | 位置 | 职责 |
|------|------|------|
| `rank-scraper` | `backend/services/rank_scraper` | Ozon 排行榜数据抓取 |
| `collector` | `backend/services/collector` + `browser-extension/` | 商品全字段采集 (插件 + API) |
| `sourcer` | `backend/services/sourcer` | 1688 货源搜索与匹配 |
| `calculator` | `backend/services/calculator` | 利润计算引擎 |
| `ai-processor` | `backend/services/ai_processor` | AI 翻译 + SeedEdit 3.0 改图 |
| `lister` | `backend/services/lister` | 刊登信息预填与批量提交 |
| `tracker` | `backend/services/tracker` | 销售数据同步与预警 |

模块间通过 REST API 或内部函数调用通信，无循环依赖。

### 原则 III: 安全与合规第一 ✅

- API 密钥通过加密存储，用户可生成/吊销
- Ozon API 密钥和店铺凭证存储加密
- 火山引擎 SeedEdit AccessKey 和腾讯云 TMT SecretId/SecretKey 作为服务端加密环境变量，不暴露给终端用户
- 抓取遵守 robots.txt 和建议的请求间隔
- 所有用户输入经过 Pydantic 模型验证

### 原则 IV: AI 增强可选 ✅

- AI 翻译（腾讯云 TMT）和 SeedEdit 改图均提供手动编辑/覆盖入口
- AI 服务不可用时核心流程 (采集→比价→上架) 仍可完整运行
- SeedEdit 和 TMT 调用次数和成本由平台统一记录，后期可向用户按次收费

### 原则 V: 任务可观测性 ✅

- 所有异步任务使用结构化日志 (JSON 格式)
- Celery 任务状态追踪 (pending/running/success/failed)
- SeedEdit 异步任务轮询状态可追踪 (in_queue→generating→done)
- 爬虫失败和上架失败触发用户通知

### 技术约束检查

| 约束 | 状态 | 说明 |
|------|------|------|
| Python 3.11+ | ✅ | 后端/爬虫使用 Python 3.11+ |
| 异步 I/O | ✅ | FastAPI + asyncio + Celery |
| 类型注解 | ✅ | Python 类型注解 + TypeScript |
| pyproject.toml | ✅ | 后端使用 pyproject.toml |
| 配置管理 | ✅ | 环境变量 + .env (含 VOLCENGINE_* 和 TENCENT_* 变量) |
| Web UI | ⚠️ 进化 | 宪章原定 CLI 优先; 用户明确要求 Web 应用，升级为 Next.js 前端 |
| 中文优先 | ✅ | 所有文档、注释以简体中文编写 |

### 门禁结论: 全部通过 ✅

唯一技术约束进化 (CLI → Web UI) 由用户明确指定，符合项目发展方向。

## 项目结构

### 文档（本功能）

```text
specs/001-ozon-follow-sell/
├── plan.md              # 本文件
├── research.md          # 第 0 阶段输出
├── data-model.md        # 第 1 阶段输出
├── quickstart.md        # 第 1 阶段输出
├── contracts/           # 第 1 阶段输出
└── tasks.md             # 第 2 阶段输出 (/speckit-tasks)
```

### 源代码（仓库根目录）

```text
backend/                     # Python 后端 (FastAPI)
├── pyproject.toml
├── alembic/                 # 数据库迁移
├── src/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置管理 (含 VOLCENGINE_*)
│   ├── models/              # SQLAlchemy 数据模型
│   ├── schemas/             # Pydantic 请求/响应模型
│   ├── api/                 # API 路由
│   ├── services/            # 业务逻辑层
│   │   ├── rank_scraper/    # Ozon 排行榜爬虫 (Scrapling)
│   │   ├── collector/       # 商品采集服务
│   │   ├── sourcer/         # 1688 货源搜索 (Scrapling)
│   │   ├── calculator/      # 利润计算引擎
│   │   ├── ai_processor/    # AI 改图 (SeedEdit 3.0 + Pillow) + 翻译 (腾讯云 TMT)
│   │   │   ├── seededit.py  # SeedEdit API 客户端 (Signature V4)
│   │   │   ├── tmt_translator.py # 腾讯云 TMT 翻译客户端
│   │   │   └── image_resizer.py
│   │   ├── lister/          # 商品上架服务
│   │   └── tracker/         # 销售跟踪服务
│   └── worker/              # Celery 异步任务
│       ├── scraper_tasks.py
│       ├── ai_tasks.py      # SeedEdit 提交+轮询 + AI 翻译
│       └── sync_tasks.py
└── tests/

frontend/                    # Next.js 前端
├── package.json
├── tailwind.config.ts       # Apple Design Tokens
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── rankings/        # 榜单发现
│   │   ├── products/        # 已采集商品
│   │   ├── sourcing/        # 1688 比价
│   │   ├── ai-edit/         # AI 改图 (含提示词编辑) + 翻译
│   │   ├── listing/         # 批量上架
│   │   ├── tracking/        # 店铺跟踪
│   │   └── settings/        # 用户设置
│   ├── components/
│   │   ├── ui/              # Apple Design 基础组件
│   │   ├── layout/          # GlobalNav, SubNav, Footer
│   │   └── features/        # 业务组件 (含 ImageCompare, PromptEditor)
│   └── lib/
└── tests/

browser-extension/           # 浏览器采集插件
├── manifest.json
├── src/
│   ├── popup/
│   ├── content/             # Ozon 页面 DOM 提取
│   └── background/          # API 通信 (HMAC 签名)
└── tests/
```

**结构决策**: 选择前后端分离架构。Next.js 前端提供 SPA 级用户体验和 Apple 风格 UI；Python 后端复用 Scrapling 生态完成爬虫逻辑。浏览器插件独立构建。AI 改图新增 `seededit.py` 客户端和 `PromptEditor` 前端组件。

## 复杂度追踪

> 无宪章违规需要论证。

| 违规项 | 为什么需要 | 被拒绝的更简单替代方案及原因 |
|--------|-----------|---------------------------|
| (无) | — | — |
