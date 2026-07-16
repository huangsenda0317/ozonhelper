#!/bin/bash
# 仅重新部署前端（生产）
#
# 适用场景：只改了 frontend/，需要 pull + 构建 + 恢复服务。
# 构建仍走低内存模式（构建期间会短暂停 API/Celery/Docker 以腾内存，结束后自动恢复）。
#
# 用法（在项目根目录或任意目录）:
#   bash scripts/redeploy-frontend-production.sh
#   bash scripts/redeploy-frontend-production.sh --no-pull   # 已手动 git pull 时跳过
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_PULL=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    -h|--help)
      cat <<'EOF'
仅重新部署前端（生产）

适用：只改了 frontend/，需要 pull + 构建 + 恢复服务。
构建走低内存模式（短暂停 API/Celery/Docker，结束后自动恢复）。

用法:
  bash scripts/redeploy-frontend-production.sh
  bash scripts/redeploy-frontend-production.sh --no-pull
EOF
      exit 0
      ;;
    *)
      echo "未知参数: $arg"
      echo "用法: bash scripts/redeploy-frontend-production.sh [--no-pull]"
      exit 1
      ;;
  esac
done

echo "══════════════════════════════════════════════"
echo "  OzonHelper 仅重新部署前端"
echo "══════════════════════════════════════════════"

if [ "$DO_PULL" = "1" ]; then
  echo ""
  echo "📥 [1/2] git pull..."
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "⚠️  工作区有未提交改动，pull 可能失败或产生冲突。"
    echo "   如需跳过拉取: bash scripts/redeploy-frontend-production.sh --no-pull"
  fi
  git pull --ff-only
  echo "   ✓ 代码已更新 ($(git rev-parse --short HEAD))"
else
  echo ""
  echo "⏭️  [1/2] 跳过 git pull (--no-pull)，当前 $(git rev-parse --short HEAD)"
fi

echo ""
echo "⚛️  [2/2] 低内存构建前端并恢复服务..."
echo "   （内部调用 scripts/rebuild-frontend-production.sh）"
bash "$ROOT/scripts/rebuild-frontend-production.sh"

echo ""
echo "══════════════════════════════════════════════"
echo "✅ 前端重新部署完成"
echo ""
echo "建议检查:"
echo "  sudo systemctl status ozonhelper-web --no-pager"
echo "  curl -I http://127.0.0.1:3000"
echo "══════════════════════════════════════════════"
