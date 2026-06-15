"""店铺 ERP 同步相关 ORM 模型"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class SyncedProduct(Base):
    __tablename__ = 'synced_products'
    __table_args__ = (UniqueConstraint('store_id', 'product_id', name='uq_synced_products_store_product'),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('stores.id'), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String(64), nullable=False)
    offer_id: Mapped[str] = mapped_column(String(256), nullable=False, default='')
    sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False, default='')
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default='RUB')
    stock_present: Mapped[int] = mapped_column(Integer, default=0)
    status_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    visibility: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_exception: Mapped[bool] = mapped_column(Boolean, default=False)
    exception_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    primary_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    ordered_units: Mapped[int] = mapped_column(Integer, default=0)
    hits_view: Mapped[int] = mapped_column(Integer, default=0)
    conversion_rate: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    ozon_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InventorySnapshot(Base):
    __tablename__ = 'inventory_snapshots'
    __table_args__ = (
        UniqueConstraint('store_id', 'product_id', 'warehouse_id', name='uq_inventory_snapshots_store_product_wh'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('stores.id'), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String(64), nullable=False)
    offer_id: Mapped[str] = mapped_column(String(256), nullable=False, default='')
    warehouse_id: Mapped[str] = mapped_column(String(64), nullable=False, default='default')
    present: Mapped[int] = mapped_column(Integer, default=0)
    reserved: Mapped[int] = mapped_column(Integer, default=0)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SyncedOrder(Base):
    __tablename__ = 'synced_orders'
    __table_args__ = (UniqueConstraint('store_id', 'posting_number', name='uq_synced_orders_store_posting'),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('stores.id'), nullable=False, index=True)
    posting_number: Mapped[str] = mapped_column(String(128), nullable=False)
    order_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default='')
    fulfillment_type: Mapped[str] = mapped_column(String(8), nullable=False, default='FBS')
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    shipment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    products: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    total_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    is_overdue: Mapped[bool] = mapped_column(Boolean, default=False)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AnalyticsDaily(Base):
    __tablename__ = 'analytics_daily'
    __table_args__ = (UniqueConstraint('store_id', 'day', name='uq_analytics_daily_store_day'),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('stores.id'), nullable=False, index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    orders: Mapped[int] = mapped_column(Integer, default=0)
    units_sold: Mapped[int] = mapped_column(Integer, default=0)
    revenue: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    hits_view: Mapped[int] = mapped_column(Integer, default=0)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SyncJob(Base):
    __tablename__ = 'sync_jobs'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('stores.id'), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(32), nullable=False)
    scope: Mapped[str] = mapped_column(String(32), nullable=False, default='all')
    status: Mapped[str] = mapped_column(String(16), nullable=False, default='pending')
    records_processed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryAlertConfig(Base):
    __tablename__ = 'inventory_alert_configs'
    __table_args__ = (UniqueConstraint('store_id', name='uq_inventory_alert_configs_store'),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('stores.id'), nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5)
    order_overdue_hours: Mapped[int] = mapped_column(Integer, default=48)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Alert(Base):
    __tablename__ = 'alerts'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('stores.id'), nullable=False, index=True)
    alert_type: Mapped[str] = mapped_column(String(32), nullable=False)
    reference_id: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), default='warning')
    status: Mapped[str] = mapped_column(String(16), default='unread')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
