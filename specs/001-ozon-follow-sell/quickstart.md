# 快速启动指南: Ozon 跟卖全链路平台

**日期**: 2026-06-12 | **功能**: [spec.md](./spec.md)

## 前置条件

- **Python 3.11+**: 后端与爬虫运行环境
- **Node.js 20+**: 前端与浏览器插件构建
- **PostgreSQL 15+**: 主数据库
- **Redis 7+**: 任务队列与缓存
- **Chrome/Chromium**: 浏览器插件运行与 Scrapling Playwright 回退

## 环境配置

### 1. 克隆仓库与分支

```bash
git clone <repo-url>
cd ozonhelper
git checkout 001-ozon-follow-sell
```

### 2. 后端环境搭建

```bash
cd backend

# 创建虚拟环境
python3.11 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -e ".[dev]"

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写必要的配置 (数据库连接、Ozon API 密钥等)
```

**.env 必需配置项**:
```bash
# 数据库
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ozonhelper

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_SECONDS=86400

# Ozon Seller API (用于测试)
OZON_API_BASE_URL=https://api-seller.ozon.ru
OZON_CLIENT_ID=your-client-id
OZON_API_KEY=your-api-key

# 火山引擎 SeedEdit 3.0 (AI 改图)
VOLCENGINE_ACCESS_KEY_ID=AKLT...
VOLCENGINE_SECRET_ACCESS_KEY=...
VOLCENGINE_REGION=cn-north-1
VOLCENGINE_SERVICE=cv
VOLCENGINE_SEEDEDIT_REQ_KEY=seededit_v3.0
VOLCENGINE_SEEDEDIT_CONCURRENCY=2

# AI 翻译服务 (腾讯云机器翻译 TMT)
TENCENT_SECRET_ID=AKID...
TENCENT_SECRET_KEY=...
TENCENT_TMT_REGION=ap-guangzhou
TENCENT_TMT_PROJECT_ID=0

# 图片存储 (MinIO/S3)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ozonhelper-images

# 加密密钥
ENCRYPTION_KEY=your-fernet-key
```

### 3. 数据库初始化

```bash
# 创建数据库
createdb ozonhelper

# 运行迁移
alembic upgrade head

# (可选) 加载测试数据
python scripts/seed_data.py
```

### 4. 启动后端服务

```bash
# 启动 FastAPI 开发服务器
uvicorn src.main:app --reload --port 8000

# 另一个终端: 启动 Celery Worker
celery -A src.worker.app worker --loglevel=info --concurrency=4

# (可选) 启动 Celery Beat (定时任务调度)
celery -A src.worker.app beat --loglevel=info
```

API 文档: 访问 `http://localhost:8000/docs` (Swagger UI)

### 5. 前端环境搭建

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local
```

**.env.local 配置**:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### 6. 启动前端

```bash
npm run dev
```

前端服务: `http://localhost:3000`

### 7. 浏览器插件安装

```bash
cd browser-extension

# 安装依赖
npm install

# 构建插件
npm run build
```

然后在 Chrome 中:
1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `browser-extension/dist/` 目录

安装后:
1. 点击插件图标 → 设置
2. 输入平台生成的 API 密钥
3. 保存

## 验证安装

### 后端健康检查

```bash
curl http://localhost:8000/api/v1/health
# {"status": "ok", "version": "1.0.0"}
```

### 完整流程测试

1. **注册用户**: 
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","name":"测试"}'
   ```

2. **登录获取 Token**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

3. **查看榜单**: 浏览器访问 `http://localhost:3000/rankings`

4. **采集商品**: 安装插件后，访问任意 Ozon 商品页面，点击插件采集按钮

## 开发工作流

### 运行测试

```bash
# 后端测试
cd backend
pytest tests/ -v --cov=src --cov-report=term-missing

# 前端测试
cd frontend
npm test -- --coverage

# 浏览器插件测试
cd browser-extension
npm test
```

### 代码检查

```bash
# 后端
cd backend
ruff check src/ tests/
mypy src/

# 前端
cd frontend
npm run lint
npm run type-check
```

### 数据库迁移

```bash
cd backend

# 创建新迁移 (修改模型后)
alembic revision --autogenerate -m "描述变更"

# 应用迁移
alembic upgrade head

# 回滚
alembic downgrade -1
```

## 目录速查

| 目录 | 用途 | 语言 |
|------|------|------|
| `backend/src/api/` | API 路由定义 | Python |
| `backend/src/services/` | 业务逻辑层 | Python |
| `backend/src/models/` | 数据库模型 | Python (SQLAlchemy) |
| `backend/src/worker/` | 异步任务 | Python (Celery) |
| `frontend/src/app/` | 页面路由 | TypeScript (Next.js) |
| `frontend/src/components/ui/` | Apple Design 基础组件 | TypeScript (React) |
| `frontend/src/components/features/` | 业务组件 | TypeScript (React) |
| `browser-extension/src/content/` | 页面 DOM 提取脚本 | TypeScript |
| `browser-extension/src/background/` | 后台 API 通信 | TypeScript |

## 常见问题

**Q: Scrapling 报 Cloudflare 错误?**
A: 确保使用 `StealthyFetcher.fetch(url, solve_cloudflare=True)`，并检查 Chrome/Chromium 版本兼容性。

**Q: 前端无法连接后端 API?**
A: 检查 `.env.local` 中的 `NEXT_PUBLIC_API_BASE_URL` 是否正确，确认后端已启动在 8000 端口。

**Q: Celery Worker 启动失败?**
A: 检查 Redis 是否运行 (`redis-cli ping`)，确认 `.env` 中 `REDIS_URL` 正确。

**Q: 数据库迁移报错?**
A: 确认 PostgreSQL 已启动，数据库 `ozonhelper` 已创建，检查 `DATABASE_URL` 中的用户名密码。
