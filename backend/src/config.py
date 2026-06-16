"""应用配置管理 - 环境变量加载与 Pydantic Settings"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置。所有值从环境变量或 .env 文件加载。"""

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',  # 忽略 .env 中已废弃的 OZON_CLIENT_ID / OZON_API_KEY 等
    )

    # development 强制本地 MinIO；留空或 production 时，有 MINIO_PUBLIC_ENDPOINT 则用公网域名
    app_env: str = ''

    # 数据库
    database_url: str = 'postgresql+asyncpg://ozonhelper:ozonhelper@localhost:5432/ozonhelper'

    # Redis
    redis_url: str = 'redis://localhost:6379/0'

    # JWT
    jwt_secret_key: str = 'change-me-in-production'
    jwt_algorithm: str = 'HS256'
    jwt_expire_seconds: int = 86400

    # Ozon Seller API（凭证仅通过店铺管理页面绑定，不再从环境变量读取）
    ozon_api_base_url: str = 'https://api-seller.ozon.ru'
    ozon_tracking_cache_ttl: int = 600  # 店铺商品列表 Redis 缓存秒数，默认 10 分钟

    # 火山引擎 SeedEdit 3.0 (AI 改图)
    volcengine_access_key_id: str = ''
    volcengine_secret_access_key: str = ''
    volcengine_region: str = 'cn-north-1'
    volcengine_service: str = 'cv'
    volcengine_seededit_req_key: str = 'seededit_v3.0'
    volcengine_seededit_concurrency: int = 1

    # 智谱 GLM (AI 问答，可选)
    glm_api_key: str = ''

    # DeepSeek (AI 问答)
    deepseek_api_key: str = ''

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

    # 为 true 时在 API 进程内后台执行同步（无需单独启动 Celery Worker，适合本地开发）
    sync_inline: bool = True


@lru_cache()
def get_settings() -> Settings:
    """获取应用配置（单例缓存）。"""
    return Settings()
