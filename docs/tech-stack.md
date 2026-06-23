# OzonHelper 技术栈

> Ozon 跟卖全链路平台 — 技术栈与架构概览  
> 基于 CodeGraph 代码索引分析（240 文件 / 2,709 符号节点 / 5,359 依赖边）

---

## 项目定位

OzonHelper 是一个 **Ozon 跟卖全链路 SaaS 平台**，覆盖：

**选品 → 采集 → AI 处理 → 上架 → 店铺 ERP 跟踪**

---

## 仓库结构

```
ozonhelper/
├── backend/              # Python FastAPI 后端
├── frontend/             # Next.js 前端 (Apple Design)
├── browser-extension/    # Chrome 采集插件 (Manifest V3)
├── ozon-mcp/             # Ozon Seller API MCP Server
├── specs/                # 规格与设计文档
└── docker-compose.yml    # 本地基础设施
```

### 代码语言分布

| 语言       | 文件数 | 说明                     |
| ---------- | ------ | ------------------------ |
| Python     | 131    | 后端 API、Worker、爬虫   |
| TSX        | 60     | React 页面与组件         |
| TypeScript | 28     | Hooks、工具库、类型定义  |
| YAML       | 19     | CI、OpenSpec、Docker 等  |
| JavaScript | 2      | Next.js / PostCSS 配置   |

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│  前端 Next.js (App Router)                                   │
│  23 页面 · Hooks 数据层 · Apple Design + Tailwind          │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST /api/v1/*
┌──────────────────────────▼──────────────────────────────────┐
│  FastAPI 后端                                                │
│  9 个 APIRouter · Services · SQLAlchemy Models               │
└──────────┬───────────────────────────────┬──────────────────┘
           │                               │
┌──────────▼──────────┐         ┌──────────▼──────────┐
│  Celery Worker      │         │  外部服务            │
│  sync / ai / scrape │         │  Ozon / AI / 云 SDK  │
└──────────┬──────────┘         └─────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│  PostgreSQL 15  ·  Redis 7  ·  MinIO / S3         │
└─────────────────────────────────────────────────────┘
```

### 同步引擎调用链

```
sync_store_job (Celery)
  └─ run_sync_scope
       ├─ sync_products
       ├─ sync_inventory
       ├─ sync_orders
       ├─ sync_analytics
       └─ phase2: sync_prices / sync_finance / sync_returns / ...
           └─ OzonSellerClient (Ozon Seller API 统一封装)
```

---

## 前端

| 类别         | 技术                          | 版本        |
| ------------ | ----------------------------- | ----------- |
| 框架         | Next.js (App Router)          | ^14.2.0     |
| UI 库        | React                         | ^18.3.0     |
| 语言         | TypeScript                    | ^5.4.0      |
| 样式         | Tailwind CSS                  | ^3.4.0      |
| 设计规范     | Apple Design System           | 见 `apple/DESIGN.md` |
| 组件库       | Ant Design                    | ^6.4.4      |
| AI 聊天 UI   | @ant-design/x                 | ^2.8.0      |
| 图表         | ECharts                       | ^6.1.0      |
| 图标         | Lucide React                  | ^1.18.0     |
| 轮播         | Swiper                        | ^12.2.0     |
| 包管理       | pnpm                          | —           |

### 主要页面路由

| 模块       | 路径示例                              |
| ---------- | ------------------------------------- |
| 跟卖 ERP   | `/tracking/orders`, `/finance`, `/pricing`, `/inventory`, `/listing` |
| 选品链路   | `/rankings`, `/selection-pool`, `/products` |
| AI 工具    | `/ai-edit`, `/ai-qa`                  |
| 设置       | `/settings/stores`                    |

### 前端数据层

核心 Hooks 位于 `frontend/src/lib/hooks/`：

- `useOrders` — 订单、店铺、告警（被 6+ 组件引用）
- `useDashboard` — 仪表盘与销售趋势
- `useFinance` / `usePricing` / `useInventory` — ERP 各模块
- `useSyncingStoreId` / `useStoreSync` — 同步状态跟踪

---

## 后端

| 类别         | 技术                          | 版本        |
| ------------ | ----------------------------- | ----------- |
| 运行时       | Python                        | >= 3.11     |
| Web 框架     | FastAPI                       | >= 0.110.0  |
| ASGI 服务器  | Uvicorn                       | >= 0.27.0   |
| ORM          | SQLAlchemy (async)            | >= 2.0.25   |
| 数据库驱动   | asyncpg                       | >= 0.29.0   |
| 迁移         | Alembic                       | >= 1.13.0   |
| 数据校验     | Pydantic                      | >= 2.6.0    |
| 配置         | pydantic-settings             | >= 2.1.0    |
| HTTP 客户端  | httpx                         | >= 0.26.0   |
| 日志         | structlog                     | >= 24.1.0   |
| Excel 导出   | openpyxl                      | >= 3.1.0    |

### API 路由（`/api/v1/*`）

| 前缀              | 模块                  | 职责               |
| ----------------- | --------------------- | ------------------ |
| `/auth`           | `auth.py`             | JWT / 短信登录     |
| `/stores`         | `stores.py`           | 店铺绑定与管理     |
| `/tracking`       | `tracking.py`         | 订单/商品/库存同步 |
| `/tracking`       | `tracking_phase2.py`  | 财务/定价/上架 ERP |
| `/ai`             | `ai_endpoints.py`     | AI 改图、翻译、问答 |
| `/products`       | `products.py`         | 商品采集           |
| `/rankings`       | `rankings.py`         | 榜单发现           |
| `/selection-pool` | `selection_pool.py`   | 选品池             |
| 汇率              | `exchange_rate.py`    | 汇率查询           |

### 后端服务层

| 目录                        | 职责                                   |
| --------------------------- | -------------------------------------- |
| `services/ozon/`            | Ozon Seller API 客户端与限流           |
| `services/sync/`            | 店铺同步引擎（商品/订单/库存/分析）    |
| `services/phase2/`          | ERP Phase2（财务/定价/上架/退货）      |
| `services/ai_processor/`    | AI 改图、翻译、LLM 问答                |
| `services/rank_scraper/`    | Ozon 榜单爬虫                          |
| `services/stores/`          | 店铺生命周期与凭证管理                 |
| `services/tracker/`         | 仪表盘与订单指标                       |

---

## 任务队列

| 类别         | 技术                          | 版本        |
| ------------ | ----------------------------- | ----------- |
| 队列         | Celery                        | >= 5.3.0    |
| Broker       | Redis                         | >= 5.0.0    |

### Worker 任务模块

| 文件               | 职责                     |
| ------------------ | ------------------------ |
| `sync_tasks.py`    | 店铺数据同步             |
| `ai_tasks.py`      | AI 改图 / 翻译异步任务   |
| `scraper_tasks.py` | 榜单爬虫任务             |
| `phase2_tasks.py`  | ERP Phase2 后台任务      |

支持内联同步（`SYNC_INLINE=true`）与 Celery Worker 两种模式。

---

## 数据存储

### Docker Compose 基础设施

| 服务       | 镜像                  | 端口          | 用途           |
| ---------- | --------------------- | ------------- | -------------- |
| PostgreSQL | `postgres:15-alpine`  | 5432          | 业务数据       |
| Redis      | `redis:7-alpine`      | 6379          | Celery + 缓存  |
| MinIO      | `minio/minio:latest`  | 9000 / 9001   | 对象存储       |

### 主要数据模型

位于 `backend/src/models/`：

- `store` — 店铺与 Ozon 凭证
- `user` — 用户与认证
- `tracking_sync` — 同步任务、订单、商品快照
- `collected_product` / `selected_product` / `ranked_product` — 选品链路
- `processing_task` — AI 处理任务
- `sourcing` — 货源信息

---

## AI 与外部服务

| 能力       | 技术 / SDK                              | 说明                              |
| ---------- | --------------------------------------- | --------------------------------- |
| AI 改图    | 火山引擎 SeedEdit 3.0 (`volcengine`)    | 图生图，并发锁控制                |
| AI 翻译    | 腾讯云 TMT (`tencentcloud-sdk-python-tmt`) | 中文 → 俄文，5 次/秒           |
| AI 问答    | DeepSeek + GLM 客户端                   | 多 LLM 支持，SSE 流式输出         |
| 图片处理   | Pillow                                  | 标准化至 Ozon 规范 1200×1200      |
| 短信登录   | 阿里云 DYPNS API                        | 手机号一键验证                    |
| 对象存储   | MinIO / S3                              | SeedEdit 临时链接转存             |

---

## 爬虫

| 类别         | 技术                          | 版本        |
| ------------ | ----------------------------- | ----------- |
| 框架         | Scrapling                     | >= 0.4.9    |
| 抓取器       | StealthyFetcher               | Cloudflare 绕过 |
| 解析         | Scrapling Selector            | HTML 解析   |

用于 Ozon 榜单商品发现，位于 `backend/src/services/rank_scraper/`。

---

## 浏览器插件

| 类别         | 技术                          |
| ------------ | ----------------------------- |
| 标准         | Chrome Manifest V3            |
| 构建         | Webpack 5 + TypeScript        |
| 测试         | Jest                          |

### 功能

- Content Script 注入 `ozon.ru/product/*` 页面
- 一键采集商品全字段信息
- 同步至 OzonHelper 平台 API

---

## MCP Server

`ozon-mcp/` 提供 Ozon Seller API 的 MCP 工具，供 Cursor 等 AI Agent 调用。

| 类别         | 技术                          | 版本        |
| ------------ | ----------------------------- | ----------- |
| 协议         | MCP                           | >= 1.0.0    |
| HTTP         | httpx                         | >= 0.26.0   |
| 校验         | Pydantic                      | >= 2.6.0    |

工具覆盖：catalog、inventory、orders 等 Ozon Seller API 操作。

---

## 安全与认证

| 能力         | 技术                          |
| ------------ | ----------------------------- |
| JWT          | python-jose[cryptography]     |
| 密码哈希     | bcrypt                        |
| 凭证加密     | cryptography                  |
| API Key 鉴权 | 自定义 middleware             |
| CORS         | 限定 localhost:3000           |

---

## 开发工具链

### 后端

| 工具               | 用途                 |
| ------------------ | -------------------- |
| Ruff               | Lint + Format        |
| mypy (strict)      | 静态类型检查         |
| pytest             | 单元 / 集成测试      |
| pytest-asyncio     | 异步测试支持         |
| pytest-cov         | 覆盖率报告           |

### 前端

| 工具               | 用途                 |
| ------------------ | -------------------- |
| ESLint             | 代码检查             |
| eslint-config-next | Next.js 规则集       |
| Jest               | 单元测试             |
| Testing Library    | 组件测试             |
| tsc --noEmit       | 类型检查             |

### 规格与流程

| 工具               | 用途                 |
| ------------------ | -------------------- |
| Spec Kit           | 功能规格与任务管理   |
| OpenSpec           | 变更提案与归档       |
| CodeGraph          | 代码索引与依赖分析   |

---

## 相关文档

- [功能规格](../specs/001-ozon-follow-sell/spec.md)
- [实施计划](../specs/001-ozon-follow-sell/plan.md)
- [数据模型](../specs/001-ozon-follow-sell/data-model.md)
- [API 契约](../specs/001-ozon-follow-sell/contracts/api-v1.yaml.md)
- [快速启动](../specs/001-ozon-follow-sell/quickstart.md)
- [UI 设计规范](../apple/DESIGN.md)
