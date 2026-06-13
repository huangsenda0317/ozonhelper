#!/bin/bash
# OzonHelper 一键启动脚本
set -e

echo "🚀 OzonHelper 跟卖全链路平台 — 启动中..."

# 1. 检查 .env 文件
if [ ! -f backend/.env ]; then
    echo "📝 创建 backend/.env (从 .env.example 复制)..."
    cp backend/.env.example backend/.env
    echo "⚠️  请编辑 backend/.env 填入真实的 API 密钥:"
    echo "   - VOLCENGINE_ACCESS_KEY_ID / VOLCENGINE_SECRET_ACCESS_KEY (SeedEdit 3.0)"
    echo "   - TENCENT_SECRET_ID / TENCENT_SECRET_KEY (腾讯云 TMT 翻译)"
    echo "   - 按回车键继续..." && read
fi

if [ ! -f frontend/.env.local ]; then
    echo "📝 创建 frontend/.env.local..."
    cp frontend/.env.local.example frontend/.env.local
fi

# 2. 启动 Docker 服务
echo ""
echo "🐳 启动 Docker 服务 (PostgreSQL + Redis + MinIO)..."
docker compose up -d postgres redis minio
echo "⏳ 等待数据库就绪..."
sleep 3

# 3. 后端: 创建虚拟环境 & 安装依赖
echo ""
echo "🐍 配置 Python 后端..."
cd backend
if [ ! -d .venv ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -e ".[dev]" -q

# 4. 运行数据库迁移
echo ""
echo "🗄️  运行数据库迁移..."
alembic upgrade head

# 5. 启动后端服务
echo ""
echo "🌐 启动 FastAPI 后端 (http://localhost:8000)..."
uvicorn src.main:app --reload --port 8000 &
BACKEND_PID=$!

# 6. 启动 Celery Worker (另一个终端可手动启动)
echo "📦 Celery Worker 启动命令 (在新终端中运行):"
echo "   cd backend && source .venv/bin/activate && celery -A src.worker.app worker --loglevel=info"

# 7. 前端: 安装依赖 & 启动
echo ""
echo "⚛️  启动 Next.js 前端 (http://localhost:3000)..."
cd ../frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "══════════════════════════════════════════════"
echo "✅ OzonHelper 启动完成!"
echo ""
echo "📍 前端:     http://localhost:3000"
echo "📍 后端 API: http://localhost:8000"
echo "📍 API 文档: http://localhost:8000/docs"
echo "📍 MinIO:    http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "🧩 浏览器插件:"
echo "   1. 打开 chrome://extensions/"
echo "   2. 开启「开发者模式」"
echo "   3. 「加载已解压的扩展程序」→ 选择 browser-extension/ 目录"
echo "══════════════════════════════════════════════"

# 等待用户 Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '👋 已关闭所有服务'" INT
wait
