#!/bin/bash
# 生产环境启动所有服务（不含前端 build，需先执行 rebuild-frontend-production.sh）
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🐳 启动 Docker..."
docker compose up -d postgres redis minio
sleep 3

echo "▶️  启动 systemd 服务..."
bash "$ROOT/scripts/validate-backend-env.sh"
sudo systemctl start ozonhelper-api
sleep 2
sudo systemctl start ozonhelper-celery
sudo systemctl start ozonhelper-web

echo ""
echo "✅ 服务已启动"
sudo systemctl status ozonhelper-api ozonhelper-celery ozonhelper-web --no-pager
