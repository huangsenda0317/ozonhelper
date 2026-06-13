"""SupplySource 和 ProfitCalculation 数据库模型"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class SupplySource(Base):
    __tablename__ = 'supply_sources'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collected_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('collected_products.id'), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    price_cny: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    min_order: Mapped[int] = mapped_column(Integer, default=1)
    supplier_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    supplier_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    similarity_score: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    searched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProfitCalculation(Base):
    __tablename__ = 'profit_calculations'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collected_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('collected_products.id'), nullable=False, index=True
    )
    supply_source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('supply_sources.id'), nullable=True
    )
    ozon_price_cny: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    supply_cost_cny: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    logistics_cost_cny: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    commission_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    exchange_rate: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    gross_margin: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
