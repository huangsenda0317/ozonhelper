#!/bin/bash
# 生产环境前端构建脚本（低内存 ECS 适用）
# 构建前停止 Docker 与应用服务以释放内存，构建完成后自动恢复。
#
# 用法（在项目根目录）:
#   bash scripts/rebuild-frontend-production.sh
#
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "══════════════════════════════════════════════"
echo "  OzonHelper 生产前端构建（低内存模式）"
echo "══════════════════════════════════════════════"

echo ""
echo "🛑 [1/5] 停止应用服务以释放内存..."
for svc in ozonhelper-web ozonhelper-api ozonhelper-celery; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    sudo systemctl stop "$svc"
    echo "   已停止 $svc"
  fi
done

echo ""
echo "🛑 [2/5] 停止 Docker (PostgreSQL / Redis / MinIO)..."
docker compose stop
echo "   Docker 已停止"

echo ""
echo "⚛️  [3/5] 构建前端 (npm run build)..."
cd "$ROOT/frontend"

if [ ! -f .env.local ]; then
  echo "   创建 .env.local（来自 .env.production.example）"
  cp .env.production.example .env.local
fi

if [ ! -d node_modules ]; then
  echo "   安装依赖..."
  npm install
fi

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}"
npm run build

if [ ! -f .next/BUILD_ID ]; then
  echo "❌ 构建失败：未找到 .next/BUILD_ID"
  exit 1
fi
echo "   ✓ 构建成功"

echo ""
echo "🐳 [4/5] 重启 Docker..."
cd "$ROOT"
docker compose up -d postgres redis minio
echo "   等待基础设施就绪..."
sleep 3

echo ""
echo "▶️  [5/5] 启动应用服务..."
sudo systemctl start ozonhelper-api
sleep 2
sudo systemctl start ozonhelper-celery
sudo systemctl start ozonhelper-web

echo ""
echo "══════════════════════════════════════════════"
echo "✅ 前端构建并恢复服务完成"
echo ""
echo "检查状态:"
echo "  sudo systemctl status ozonhelper-web"
echo "  curl -I http://127.0.0.1:3000"
echo "  curl http://127.0.0.1:8000/api/v1/health"
echo "══════════════════════════════════════════════"
