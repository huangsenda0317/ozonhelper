"""凭证加密/解密工具 — Fernet 对称加密"""

from cryptography.fernet import Fernet

from src.config import get_settings


def _get_fernet() -> Fernet:
    """获取 Fernet 加密实例。"""
    settings = get_settings()
    key = settings.encryption_key.encode() if settings.encryption_key else Fernet.generate_key()
    return Fernet(key)


def encrypt_value(plaintext: str) -> str:
    """加密敏感凭证（Ozon API Key、Store 凭证等）。"""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """解密敏感凭证。"""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()
