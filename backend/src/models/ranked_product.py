"""RankedProduct 数据库模型 — Ozon 排行榜商品"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class RankedProduct(Base):
    __tablename__ = 'ranked_products'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ozon_product_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    price_rub: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    rating: Mapped[float | None] = mapped_column(Numeric(3, 1), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    sales_trend: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rank_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cached_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
