"""Store (Ozon 店铺) 数据库模型 — 凭证加密存储"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Store(Base):
    __tablename__ = 'stores'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    ozon_client_id: Mapped[str] = mapped_column(Text, nullable=False)  # 加密存储
    ozon_api_key_encrypted: Mapped[str] = mapped_column(Text, nullable=False)  # 加密存储
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    order_sync_initial_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7, server_default='7')
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
