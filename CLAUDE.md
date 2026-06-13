<!-- SPECKIT START -->
**Language**: 所有回答和生成产物 MUST 使用简体中文输出。

## 当前功能

**功能**: Ozon 跟卖全链路平台
**分支**: `001-ozon-follow-sell`
**规格**: [specs/001-ozon-follow-sell/spec.md](specs/001-ozon-follow-sell/spec.md)
**计划**: [specs/001-ozon-follow-sell/plan.md](specs/001-ozon-follow-sell/plan.md)
**数据模型**: [specs/001-ozon-follow-sell/data-model.md](specs/001-ozon-follow-sell/data-model.md)
**API 契约**: [specs/001-ozon-follow-sell/contracts/api-v1.yaml.md](specs/001-ozon-follow-sell/contracts/api-v1.yaml.md)
**快速启动**: [specs/001-ozon-follow-sell/quickstart.md](specs/001-ozon-follow-sell/quickstart.md)

## 技术栈

- **前端**: Next.js 14+ (App Router) + React 18+ + TypeScript
- **UI 设计**: Apple Design System (`apple/DESIGN.md`) — SF Pro 字体, Action Blue (#0066cc), pill-shaped CTAs, alternating light/dark tiles
- **后端**: Python 3.11+ + FastAPI + SQLAlchemy 2.0 (async)
- **爬虫**: Scrapling v0.4.9+ (StealthyFetcher, adaptive tracking, Cloudflare bypass)
- **数据库**: PostgreSQL 15+ (业务数据) + Redis 7+ (任务队列/缓存)
- **任务队列**: Celery + Redis (榜单同步, AI 处理, 批量上架, 销售同步)
- **AI 服务**: 
  - **AI 改图**: 火山引擎 SeedEdit 3.0 (图生图, 异步提交+轮询, 0.2元/次, 并发2)
  - **AI 翻译**: 腾讯云机器翻译（TMT）TextTranslate API (zh→ru, 5次/秒, ≤6000字符/次)
  - **图片后处理**: Pillow (尺寸标准化至 Ozon 规范 1200×1200)
- **图片存储**: MinIO / S3 (SeedEdit 输出 24h 临时链接转存)

## 项目结构

```
backend/           # Python FastAPI 后端
frontend/          # Next.js 前端 (Apple Design)
browser-extension/ # Chrome 采集插件 (Manifest V3)
specs/001-ozon-follow-sell/  # 规格与设计文档
```
<!-- SPECKIT END -->