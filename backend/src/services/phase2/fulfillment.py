"""履约服务"""

from __future__ import annotations

import csv
import io
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tracking_sync import ReturnOrder, SyncedOrder
from src.models.store import Store
from src.services.stores.credentials import ozon_client_for_store


async def ship_fbs_order(
    db: AsyncSession,
    store: Store,
    posting_number: str,
    tracking_number: str,
) -> SyncedOrder:
    client = ozon_client_for_store(store)
    stmt = select(SyncedOrder).where(
        SyncedOrder.store_id == store.id,
        SyncedOrder.posting_number == posting_number,
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        from src.api.exceptions import NotFoundException

        raise NotFoundException('order', posting_number)

    packages = [{'products': [{'product_id': 0}]}]
    try:
        await client.posting_fbs_ship(posting_number=posting_number, packages=packages)
    except Exception:
        await client.set_tracking_number(posting_number=posting_number, tracking_number=tracking_number)

    await client.set_tracking_number(posting_number=posting_number, tracking_number=tracking_number)
    order.status = 'delivering'
    order.shipped_at = datetime.now(UTC)
    order.tracking_status = 'shipped'
    return order


async def batch_update_notes(db: AsyncSession, store_id: uuid.UUID, posting_numbers: list[str], note: str) -> int:
    stmt = select(SyncedOrder).where(
        SyncedOrder.store_id == store_id,
        SyncedOrder.posting_number.in_(posting_numbers),
    )
    orders = (await db.execute(stmt)).scalars().all()
    for order in orders:
        order.seller_note = note
    return len(orders)


def export_orders_csv(orders: list[SyncedOrder]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['posting_number', 'order_id', 'status', 'fulfillment_type', 'created_at', 'total_price'])
    for o in orders:
        writer.writerow([
            o.posting_number,
            o.order_id or '',
            o.status,
            o.fulfillment_type,
            o.created_at.isoformat() if o.created_at else '',
            float(o.total_price) if o.total_price else '',
        ])
    return buf.getvalue().encode('utf-8-sig')


async def list_returns(db: AsyncSession, store_id: uuid.UUID, page: int, limit: int) -> tuple[list[ReturnOrder], int]:
    stmt = select(ReturnOrder).where(ReturnOrder.store_id == store_id).order_by(ReturnOrder.created_at.desc())
    count = len((await db.execute(stmt)).scalars().all())
    rows = (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all()
    return list(rows), count
