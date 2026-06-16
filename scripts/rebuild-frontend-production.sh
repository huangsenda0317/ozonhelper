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

ensure_build_swap() {
  local swap_mb
  swap_mb=$(free -m | awk '/^Swap:/ {print $2}')
  if [ "${swap_mb:-0}" -ge 1024 ]; then
    echo "   Swap 已就绪: ${swap_mb}MB"
    return 0
  fi
  echo "   可用内存偏低，尝试启用 2G swap（缓解 next build OOM）..."
  if [ -f /swapfile ] && ! swapon --show 2>/dev/null | grep -q '/swapfile'; then
    sudo swapon /swapfile 2>/dev/null && return 0
  fi
  if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile 2>/dev/null || \
      sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "   ✓ swap 已启用"
  fi
}

resolve_swc_version() {
  local pkg="$1"
  node -e "
    const next = require('next/package.json');
    const ver = next.optionalDependencies && next.optionalDependencies['${pkg}'];
    if (!ver) process.exit(1);
    process.stdout.write(ver);
  "
}

echo "══════════════════════════════════════════════"
echo "  OzonHelper 生产前端构建（低内存模式）"
echo "══════════════════════════════════════════════"

echo ""
echo "🛑 [1/5] 停止应用服务以释放内存..."
for svc in ozonhelper-web ozonhelper-api ozonhelper-celery ozonhelper-celery-beat; do
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

echo "   安装/更新依赖 (npm install)..."
npm install

# Next.js 会向上查找 package-lock.json；仓库根目录另有无关 lockfile，需跳过自动修补。
# @next/swc 版本在 next.optionalDependencies 中（常与 next 主版本号不同，如 14.2.35 → swc 14.2.33）。
export NEXT_IGNORE_INCORRECT_LOCKFILE=1
export NEXT_TELEMETRY_DISABLED=1
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)       SWC_PKG="@next/swc-linux-x64-gnu" ;;
  Linux-aarch64|Linux-arm64) SWC_PKG="@next/swc-linux-arm64-gnu" ;;
  Darwin-arm64)       SWC_PKG="@next/swc-darwin-arm64" ;;
  Darwin-x86_64)      SWC_PKG="@next/swc-darwin-x64" ;;
  *)                  SWC_PKG="" ;;
esac
if [ -n "$SWC_PKG" ]; then
  SWC_VER=$(resolve_swc_version "$SWC_PKG" || true)
  if [ -n "$SWC_VER" ]; then
    echo "   确保 SWC 原生包: ${SWC_PKG}@${SWC_VER}"
    npm install "${SWC_PKG}@${SWC_VER}" --no-audit --no-fund
  else
    echo "   ⚠ 未解析到 ${SWC_PKG} 版本，依赖 npm 自动安装 optionalDependencies"
  fi
fi

ensure_build_swap

# 低内存 ECS：单线程编译，降低峰值内存
export LOW_MEMORY_BUILD=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
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
if systemctl list-unit-files ozonhelper-celery-beat.service &>/dev/null; then
  sudo systemctl start ozonhelper-celery-beat
fi
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
