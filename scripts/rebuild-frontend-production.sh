#!/bin/bash
# 生产环境前端构建脚本（低内存 ECS 适用）
# 构建前停止 Docker 与应用服务以释放内存，构建完成后自动恢复。
#
# 用法（在项目根目录）:
#   bash scripts/rebuild-frontend-production.sh
#
# 若 ECS 内存仍不足，可在本地构建后上传产物:
#   cd frontend && npm run build
#   rsync -avz --delete frontend/.next/ admin@<host>:~/ozonhelper/frontend/.next/
#   rsync -avz frontend/public/ admin@<host>:~/ozonhelper/frontend/public/
#   ssh admin@<host> 'sudo systemctl restart ozonhelper-web'
#
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUILD_SUCCEEDED=0
STOPPED_DOCKER=0

# systemd unit 已安装（list-unit-files 对不存在的 unit 也会 exit 0，状态为 not-found）
systemd_unit_installed() {
  local unit=$1 state
  state=$(systemctl list-unit-files --no-legend --no-pager "$unit" 2>/dev/null | awk '{print $2}' | head -1)
  [ -n "$state" ] && [ "$state" != "not-found" ]
}

print_memory_status() {
  echo "   ── 内存状态 ──"
  free -h | awk 'NR==1 || /^Mem:/ || /^Swap:/ {print "   "$0}'
}

free_page_cache() {
  if [ -w /proc/sys/vm/drop_caches ] 2>/dev/null; then
    sync
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null && echo "   ✓ 已释放 page cache" && return 0
  fi
  if command -v sudo >/dev/null 2>&1; then
    sync
    sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches' 2>/dev/null && echo "   ✓ 已释放 page cache" && return 0
  fi
  echo "   ⚠ 无法释放 page cache（需 root），跳过"
}

ensure_build_swap() {
  local ram_mb swap_mb target_mb extra_file=/swapfile-build
  ram_mb=$(free -m | awk '/^Mem:/ {print $2}')
  swap_mb=$(free -m | awk '/^Swap:/ {print $2}')

  # ≤2G 物理内存的机器目标 4G swap；≤4G 目标 3G；其余保持 ≥2G
  if [ "${ram_mb:-0}" -le 2048 ]; then
    target_mb=4096
  elif [ "${ram_mb:-0}" -le 4096 ]; then
    target_mb=3072
  else
    target_mb=2048
  fi

  if [ "${swap_mb:-0}" -ge "$target_mb" ]; then
    echo "   Swap 已就绪: ${swap_mb}MB (目标 ≥${target_mb}MB)"
    return 0
  fi

  echo "   当前 Swap ${swap_mb:-0}MB 不足，目标 ${target_mb}MB（物理内存 ${ram_mb}MB）..."

  if [ -f /swapfile ] && ! swapon --show 2>/dev/null | grep -q '/swapfile'; then
    sudo swapon /swapfile 2>/dev/null || true
    swap_mb=$(free -m | awk '/^Swap:/ {print $2}')
    if [ "${swap_mb:-0}" -ge "$target_mb" ]; then
      echo "   ✓ 已启用 /swapfile"
      return 0
    fi
  fi

  if [ ! -f /swapfile ]; then
    echo "   创建 /swapfile (2G)..."
    sudo fallocate -l 2G /swapfile 2>/dev/null || \
      sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    swap_mb=$(free -m | awk '/^Swap:/ {print $2}')
  fi

  if [ "${swap_mb:-0}" -lt "$target_mb" ] && [ ! -f "$extra_file" ]; then
    local need_mb=$((target_mb - swap_mb))
    echo "   追加 ${need_mb}MB swap → ${extra_file}..."
    sudo fallocate -l "${need_mb}M" "$extra_file" 2>/dev/null || \
      sudo dd if=/dev/zero of="$extra_file" bs=1M count="$need_mb" status=none
    sudo chmod 600 "$extra_file"
    sudo mkswap "$extra_file"
    sudo swapon "$extra_file"
  elif [ -f "$extra_file" ] && ! swapon --show 2>/dev/null | grep -q "$extra_file"; then
    sudo swapon "$extra_file" 2>/dev/null || true
  fi

  swap_mb=$(free -m | awk '/^Swap:/ {print $2}')
  echo "   ✓ Swap 现为 ${swap_mb}MB"
}

prepare_build_memory() {
  print_memory_status
  free_page_cache
  # 构建期间更积极使用 swap
  if [ -w /proc/sys/vm/swappiness ] 2>/dev/null; then
    echo 80 > /proc/sys/vm/swappiness 2>/dev/null || \
      sudo sh -c 'echo 80 > /proc/sys/vm/swappiness' 2>/dev/null || true
  fi
  ensure_build_swap
  print_memory_status
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

restore_services() {
  cd "$ROOT"
  if [ "$STOPPED_DOCKER" = "1" ]; then
    docker compose up -d postgres redis minio 2>/dev/null || true
    sleep 3
  fi
  sudo systemctl start ozonhelper-api 2>/dev/null || true
  sleep 2
  sudo systemctl start ozonhelper-celery 2>/dev/null || true
  if systemd_unit_installed ozonhelper-celery-beat.service; then
    sudo systemctl start ozonhelper-celery-beat 2>/dev/null || true
  fi
  sudo systemctl start ozonhelper-web 2>/dev/null || true
}

on_exit() {
  local code=$?
  if [ "$BUILD_SUCCEEDED" = "1" ]; then
    return 0
  fi
  if [ "$code" -ne 0 ]; then
    echo ""
    echo "⚠️  构建失败 (exit $code)，正在尝试恢复 Docker 与应用服务..."
    restore_services || true
  fi
}
trap on_exit EXIT

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
if systemd_unit_installed ozonhelper-celery-beat.service; then
  if systemctl is-active --quiet ozonhelper-celery-beat 2>/dev/null; then
    sudo systemctl stop ozonhelper-celery-beat
    echo "   已停止 ozonhelper-celery-beat"
  fi
fi

echo ""
echo "🛑 [2/5] 停止 Docker (PostgreSQL / Redis / MinIO)..."
docker compose stop
STOPPED_DOCKER=1
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

echo ""
echo "   准备构建内存环境..."
prepare_build_memory

if [ -d .next ]; then
  echo "   清理旧构建 (.next)..."
  rm -rf .next
fi

# 低内存 ECS：单线程编译，限制 Node 堆并减少 libuv 线程池
export LOW_MEMORY_BUILD=1
export UV_THREADPOOL_SIZE=1
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=768"

echo "   NODE_OPTIONS=${NODE_OPTIONS}"
npm run build -- --no-lint

if [ ! -f .next/BUILD_ID ]; then
  echo "❌ 构建失败：未找到 .next/BUILD_ID"
  echo ""
  echo "若仍出现 SIGKILL / OOM，请检查:"
  echo "  sudo dmesg | tail -20          # 确认 OOM killer"
  echo "  free -h                        # 内存与 swap"
  echo "或在本地构建后 rsync .next/ 到服务器（见脚本头部注释）"
  exit 1
fi
echo "   ✓ 构建成功"
BUILD_SUCCEEDED=1

echo ""
echo "🐳 [4/5] 重启 Docker..."
cd "$ROOT"
docker compose up -d postgres redis minio
echo "   等待基础设施就绪..."
sleep 3

echo ""
echo "▶️  [5/5] 启动应用服务..."
bash "$ROOT/scripts/validate-backend-env.sh"
sudo systemctl start ozonhelper-api
sleep 2
sudo systemctl start ozonhelper-celery
if systemd_unit_installed ozonhelper-celery-beat.service; then
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
