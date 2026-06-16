"""凭证加密/解密工具 — Fernet 对称加密"""

from cryptography.fernet import Fernet, InvalidToken

from src.api.exceptions import AppException
from src.config import get_settings


def validate_encryption_key(key: str) -> None:
    """校验 ENCRYPTION_KEY 是否为合法 Fernet 密钥。"""
    if not key or not key.strip():
        raise AppException(
            code='ENCRYPTION_KEY_MISSING',
            message='未配置 ENCRYPTION_KEY，请在 backend/.env 中设置（可用 Fernet.generate_key() 生成）',
            http_status=503,
        )
    try:
        Fernet(key.strip().encode())
    except ValueError as exc:
        raise AppException(
            code='ENCRYPTION_KEY_INVALID',
            message='ENCRYPTION_KEY 格式无效，必须为 Fernet 密钥（python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"）',
            http_status=503,
        ) from exc


def _get_fernet() -> Fernet:
    """获取 Fernet 加密实例。"""
    settings = get_settings()
    validate_encryption_key(settings.encryption_key)
    return Fernet(settings.encryption_key.strip().encode())


def encrypt_value(plaintext: str) -> str:
    """加密敏感凭证（Ozon API Key、Store 凭证等）。"""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """解密敏感凭证。"""
    f = _get_fernet()
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise AppException(
            code='DECRYPTION_FAILED',
            message='凭证解密失败，可能 ENCRYPTION_KEY 已变更',
            http_status=503,
        ) from exc
