"""默认管理员账号 — 启动时确保存在"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.auth.password import hash_password
from src.config import get_settings
from src.models.user import User

ADMIN_EMAIL = 'admin@ozonhelper.local'
ADMIN_NAME = 'admin'
ADMIN_PASSWORD = '111111'
ADMIN_LOGIN_ALIASES = {'admin'}


def normalize_login_account(account: str) -> str:
    """将登录账号规范为邮箱（支持 admin 别名）。"""
    value = account.strip().lower()
    if value in ADMIN_LOGIN_ALIASES or value == 'admin':
        return ADMIN_EMAIL
    return value


async def ensure_admin_user(session: AsyncSession) -> None:
    """创建或更新固定管理员账号。"""
    stmt = select(User).where(User.email == ADMIN_EMAIL)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    password_hash = hash_password(ADMIN_PASSWORD)

    if user is None:
        session.add(
            User(
                email=ADMIN_EMAIL,
                password_hash=password_hash,
                name=ADMIN_NAME,
                is_active=True,
            )
        )
    else:
        user.password_hash = password_hash
        user.name = ADMIN_NAME
        user.is_active = True

    await session.commit()


async def bootstrap_admin_user() -> None:
    """应用启动时初始化管理员（独立 engine，避免与请求 session 冲突）。"""
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with session_factory() as session:
            await ensure_admin_user(session)
    finally:
        await engine.dispose()
