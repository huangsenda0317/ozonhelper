"""Alembic 迁移环境配置"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from src.config import get_settings
from src.database import Base

# 导入所有模型以确保 Base.metadata 包含所有表
from src.models.api_key import ApiKey  # noqa: F401
from src.models.collected_product import CollectedProduct  # noqa: F401
from src.models.processing_task import ProcessingTask  # noqa: F401
from src.models.ranked_product import RankedProduct  # noqa: F401
from src.models.selected_product import SelectedProduct  # noqa: F401
from src.models.sourcing import ProfitCalculation, SupplySource  # noqa: F401
from src.models.store import Store  # noqa: F401
from src.models.tracking_sync import (  # noqa: F401
    Alert,
    AnalyticsDaily,
    InventoryAlertConfig,
    InventorySnapshot,
    SyncJob,
    SyncedOrder,
    SyncedProduct,
)
from src.models.user import User  # noqa: F401

config = context.config
settings = get_settings()

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option('sqlalchemy.url', settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式迁移（生成 SQL 脚本）。"""
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """在线模式迁移（异步）。"""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """在线模式迁移（直接连接数据库执行）。"""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
