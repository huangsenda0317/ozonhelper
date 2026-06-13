"""应用配置管理 - 环境变量加载与 Pydantic Settings"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置。所有值从环境变量或 .env 文件加载。"""

    # 数据库
    database_url: str = 'postgresql+asyncpg://ozonhelper:ozonhelper@localhost:5432/ozonhelper'

    # Redis
    redis_url: str = 'redis://localhost:6379/0'

    # JWT
    jwt_secret_key: str = 'change-me-in-production'
    jwt_algorithm: str = 'HS256'
    jwt_expire_seconds: int = 86400

    # Ozon Seller API
    ozon_api_base_url: str = 'https://api-seller.ozon.ru'
    ozon_client_id: str = ''
    ozon_api_key: str = ''

    # 火山引擎 SeedEdit 3.0 (AI 改图)
    volcengine_access_key_id: str = ''
    volcengine_secret_access_key: str = ''
    volcengine_region: str = 'cn-north-1'
    volcengine_service: str = 'cv'
    volcengine_seededit_req_key: str = 'seededit_v3.0'
    volcengine_seededit_concurrency: int = 1

    # 腾讯云机器翻译 TMT (AI 翻译)
    tencent_secret_id: str = ''
    tencent_secret_key: str = ''
    tencent_tmt_region: str = 'ap-guangzhou'
    tencent_tmt_project_id: int = 0

    # 图片存储 (MinIO/S3)
    minio_endpoint: str = 'localhost:9000'
    minio_access_key: str = 'minioadmin'
    minio_secret_key: str = 'minioadmin'
    minio_bucket: str = 'ozonhelper-images'
    minio_secure: bool = False
    # 浏览器访问用公网域名（预签名 URL）；留空则与 minio_endpoint 相同
    minio_public_endpoint: str = ''
    minio_public_secure: bool = False

    # 加密密钥 (Fernet)
    encryption_key: str = ''

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'


@lru_cache()
def get_settings() -> Settings:
    """获取应用配置（单例缓存）。"""
    return Settings()
