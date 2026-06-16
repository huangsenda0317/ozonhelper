#!/bin/bash
# 校验 backend/.env 关键配置（部署/重启前执行）
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [ ! -f .env ]; then
  echo "❌ 缺少 backend/.env"
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  echo "❌ 缺少 backend/.venv，请先安装依赖"
  exit 1
fi

.venv/bin/python <<'PY'
from src.config import get_settings
from src.services.crypto import validate_encryption_key

settings = get_settings()
validate_encryption_key(settings.encryption_key)
print("✓ ENCRYPTION_KEY 格式有效")

if settings.jwt_secret_key in ("", "change-me-in-production", "your-secret-key-change-in-production"):
    raise SystemExit("❌ JWT_SECRET_KEY 仍为默认值，请在 backend/.env 中修改")
print("✓ JWT_SECRET_KEY 已配置")
PY
