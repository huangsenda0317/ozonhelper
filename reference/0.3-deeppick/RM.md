# OzonHelper 项目现状说明

---

## 技术栈

| 层级                  | 技术                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **前端**              | Next.js 14 (App Router) + React 18 + TypeScript；UI 以 Ant Design 6 为主，辅 Tailwind；图表 ECharts；包管理 pnpm |
| **后端**              | Python 3.11+ / FastAPI / SQLAlchemy 2.0 (async) / Alembic / Pydantic Settings                                    |
| **浏览器插件**        | Chrome Manifest V3（商品页一键采集）                                                                             |
| **数据库**            | PostgreSQL 15（业务数据）                                                                                        |
| **中间件 / 基础设施** | Redis 7（Celery broker + 缓存）；Celery Worker + Beat（异步/定时任务）；MinIO（S3 兼容，图片存储）               |
| **爬虫**              | Scrapling（StealthyFetcher，榜单等）                                                                             |
| **外部服务**          | Ozon Seller API；火山引擎 SeedEdit 3.0（AI 改图）；腾讯云 TMT（中→俄翻译）；阿里云短信（登录）；                 |
| **部署依赖**          | Docker Compose 拉起 Postgres / Redis / MinIO；本地分别起 API、Celery、前端                                       |

---

## 功能完成度（按跟卖链路）

### 已基本可用

- **账号体系**：注册/登录、短信登录、JWT、个人 API Key（给插件用）
- **店铺管理**：绑定 Ozon 店铺凭证
- **店铺跟踪**：看板、商品、库存、订单、预警、财务/定价/物流等（含二期能力）
- **简单 AI 改图 / AI 翻译**：SeedEdit + Pillow 标准化、TMT 翻译、任务进度
- **AI 问答**：对话式助手页
- **商品采集 API + Chrome 插件**：详情页采集同步到平台

### 未做好 / 仍是 mock 或空壳（评估重点）

- **OZON数据获取**：获取OZON平台商品排行榜、列表、类目、详情、关键词搜索等数据(参考http://www.deeppick.cn/ 的排行榜)
- **1688数据获取**：获取1688商品列表、关键词搜索、商品详情等数据(参考https://www.deeppick.cn/#/collection-library/1688-keyword)
- **更精准的 AI 改图**：需要通过炼丹，完善AI改图方案，优化改图的准确性，目前的SeedEdit 3.0 改图对文字不是很适配
