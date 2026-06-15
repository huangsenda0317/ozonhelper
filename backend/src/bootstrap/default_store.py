"""默认店铺 bootstrap — 将 .env 凭证迁移为 admin 用户的 Store"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.bootstrap.admin_user import ADMIN_EMAIL
from src.config import get_settings
from src.models.store import Store
from src.models.user import User
from src.services.stores.credentials import encrypt_store_credentials


async def ensure_default_store(session: AsyncSession) -> None:
    settings = get_settings()
    if not settings.ozon_client_id or not settings.ozon_api_key:
        return

    user_stmt = select(User).where(User.email == ADMIN_EMAIL)
    user = (await session.execute(user_stmt)).scalar_one_or_none()
    if not user:
        return

    count_stmt = select(func.count()).select_from(Store).where(Store.user_id == user.id)
    count = (await session.execute(count_stmt)).scalar_one()
    if count and count > 0:
        return

    enc_client_id, enc_api_key = encrypt_store_credentials(
        settings.ozon_client_id,
        settings.ozon_api_key,
    )
    session.add(
        Store(
            user_id=user.id,
            name='默认店铺',
            ozon_client_id=enc_client_id,
            ozon_api_key_encrypted=enc_api_key,
            is_active=True,
        )
    )
    await session.commit()


async def bootstrap_default_store() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with session_factory() as session:
            await ensure_default_store(session)
    finally:
        await engine.dispose()
