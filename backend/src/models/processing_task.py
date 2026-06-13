"""ProcessingTask 数据库模型 — AI 处理任务（改图/翻译）"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class ProcessingTask(Base):
    __tablename__ = 'processing_tasks'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collected_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('collected_products.id'), nullable=True, index=True
    )
    task_type: Mapped[str] = mapped_column(String(20), nullable=False)  # image_edit / translate
    status: Mapped[str] = mapped_column(String(20), default='pending')  # pending/running/success/failed
    input_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    output_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    seededit_task_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # 仅 image_edit
    seededit_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # in_queue/generating/done
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    cost_amount: Mapped[float] = mapped_column(Numeric(8, 4), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
