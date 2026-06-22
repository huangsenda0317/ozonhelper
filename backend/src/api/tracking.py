"""店铺跟踪 ERP API 路由"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.api.exceptions import AppException
from src.api.store_deps import get_user_store
from src.database import get_db
from src.models.store import Store
from src.models.tracking_sync import Alert, InventoryAlertConfig, InventorySnapshot, SyncJob, SyncedOrder, SyncedProduct
from src.models.user import User
from src.schemas.alerts import AlertItem
from src.schemas.common import ApiResponse, PaginationMeta
from src.schemas.dashboard import DashboardKPI, TrendPoint
from src.schemas.inventory import (
    InventoryAlertConfigRequest,
    InventoryAlertConfigResponse,
    InventoryBatchResultItem,
    InventoryBatchUpdateRequest,
    InventoryItem,
)
from src.schemas.orders import OrderDetail, OrderProductItem, OrderSummary, TrackingEventItem
from src.schemas.sync import SyncJobResponse, SyncTriggerRequest
from src.schemas.tracking import (
    BatchVisibilityRequest,
    TrackingProductDetail,
    TrackingProductListParams,
    TrackingProductSummary,
)
from src.services.stores.credentials import ozon_client_for_store
from src.services.sync.dispatch import dispatch_sync_job
from src.services.sync.engine import _get_alert_config
from src.services.tracker.dashboard_service import get_dashboard_kpi, get_dashboard_trends
from src.services.tracker.product_service import tracking_product_service

router = APIRouter(prefix='/api/v1/tracking', tags=['店铺跟踪'])


def _iso_dt(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _parse_tracking_events(raw: object) -> list[TrackingEventItem]:
    if not isinstance(raw, list):
        return []
    events: list[TrackingEventItem] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        events.append(
            TrackingEventItem(
                at=item.get('at'),
                status=item.get('status'),
                tracking_number=item.get('tracking_number'),
            )
        )
    return events


def _row_to_order_summary(row: SyncedOrder) -> OrderSummary:
    return OrderSummary(
        posting_number=row.posting_number,
        order_id=row.order_id,
        status=row.status,
        fulfillment_type=row.fulfillment_type,
        created_at=_iso_dt(row.created_at),
        shipment_date=_iso_dt(row.shipment_date),
        products=[OrderProductItem(**p) for p in (row.products or [])],
        total_price=float(row.total_price) if row.total_price is not None else None,
        is_overdue=row.is_overdue,
        synced_at=_iso_dt(row.synced_at),
    )


def _row_to_order_detail(row: SyncedOrder) -> OrderDetail:
    summary = _row_to_order_summary(row)
    return OrderDetail(
        **summary.model_dump(),
        packed_at=_iso_dt(row.packed_at),
        shipped_at=_iso_dt(row.shipped_at),
        last_tracking_at=_iso_dt(row.last_tracking_at),
        delivered_at=_iso_dt(row.delivered_at),
        tracking_status=row.tracking_status,
        tracking_events=_parse_tracking_events(row.tracking_events),
        seller_note=row.seller_note,
    )


def _sync_job_response(job: SyncJob) -> SyncJobResponse:
    return SyncJobResponse(
        id=str(job.id),
        store_id=str(job.store_id),
        job_type=job.job_type,
        scope=job.scope,
        status=job.status,
        records_processed=job.records_processed,
        error_message=job.error_message,
        started_at=job.started_at.isoformat() if job.started_at else None,
        finished_at=job.finished_at.isoformat() if job.finished_at else None,
        created_at=job.created_at.isoformat(),
    )


@router.get('/dashboard', response_model=ApiResponse[DashboardKPI])
async def tracking_dashboard(
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await get_dashboard_kpi(db, store)
    return ApiResponse(success=True, data=data)


@router.get('/dashboard/trends', response_model=ApiResponse[list[TrendPoint]])
async def tracking_dashboard_trends(
    range: int = Query(default=7, alias='range', ge=7, le=30),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await get_dashboard_trends(db, store, days=range)
    return ApiResponse(success=True, data=data)


@router.post('/sync', response_model=ApiResponse[SyncJobResponse])
async def trigger_sync(
    body: SyncTriggerRequest,
    background_tasks: BackgroundTasks,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = SyncJob(
        store_id=store.id,
        job_type='manual',
        scope=body.scope,
        status='pending',
    )
    db.add(job)
    await db.flush()
    job_id = str(job.id)
    await db.commit()
    dispatch_sync_job(job_id, background_tasks)
    return ApiResponse(success=True, data=_sync_job_response(job))


@router.get('/sync-jobs/{job_id}', response_model=ApiResponse[SyncJobResponse])
async def get_sync_job(
    job_id: uuid.UUID,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(SyncJob).where(SyncJob.id == job_id, SyncJob.store_id == store.id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        from src.api.exceptions import NotFoundException

        raise NotFoundException('sync_job', str(job_id))
    return ApiResponse(success=True, data=_sync_job_response(job))


@router.get('/products', response_model=ApiResponse[list[TrackingProductSummary]])
async def list_tracking_products(
    search: str | None = Query(default=None),
    visibility: str = Query(default='ALL'),
    status: str | None = Query(default=None),
    has_stock: bool | None = Query(default=None),
    is_exception: bool | None = Query(default=None),
    sort_by: str = Query(default='updated_at'),
    sort_order: str = Query(default='desc'),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    refresh: bool = Query(default=False),
    realtime: bool = Query(default=False),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    params = TrackingProductListParams(
        search=search,
        visibility=visibility,
        status=status,
        has_stock=has_stock,
        is_exception=is_exception,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
    )
    items, total, cached_at = await tracking_product_service.list_products(
        params,
        store=store,
        db=db,
        refresh=refresh,
        realtime=realtime,
    )
    return ApiResponse(
        success=True,
        data=items,
        meta=PaginationMeta(total=total, page=page, limit=limit, cached_at=cached_at),
    )


@router.get('/products/{product_id}', response_model=ApiResponse[TrackingProductDetail])
async def get_tracking_product(
    product_id: str,
    realtime: bool = Query(default=False),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detail = await tracking_product_service.get_product_detail(
        product_id,
        store=store,
        db=db,
        realtime=realtime,
    )
    return ApiResponse(success=True, data=detail)


@router.post('/products/batch-visibility', response_model=ApiResponse[list[dict]])
async def batch_visibility(
    body: BatchVisibilityRequest,
    store: Store = Depends(get_user_store),
    current_user: User = Depends(get_current_user),
):
    results = await tracking_product_service.batch_visibility(store, body.product_ids, body.action)
    return ApiResponse(success=True, data=results)


@router.get('/inventory', response_model=ApiResponse[list[InventoryItem]])
async def list_inventory(
    search: str | None = Query(default=None),
    low_stock: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    config = await _get_alert_config(db, store.id)
    stmt = (
        select(InventorySnapshot, SyncedProduct.name)
        .join(
            SyncedProduct,
            (SyncedProduct.store_id == InventorySnapshot.store_id)
            & (SyncedProduct.product_id == InventorySnapshot.product_id),
            isouter=True,
        )
        .where(InventorySnapshot.store_id == store.id)
    )
    if search:
        q = f'%{search.strip()}%'
        stmt = stmt.where(
            InventorySnapshot.offer_id.ilike(q) | SyncedProduct.name.ilike(q)
        )
    if low_stock is True:
        stmt = stmt.where(InventorySnapshot.present < config.low_stock_threshold)

    count = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).all()
    items = [
        InventoryItem(
            product_id=inv.product_id,
            offer_id=inv.offer_id,
            name=name,
            warehouse_id=inv.warehouse_id,
            present=inv.present,
            reserved=inv.reserved,
            is_low_stock=inv.present < config.low_stock_threshold,
            synced_at=inv.synced_at.isoformat() if inv.synced_at else None,
        )
        for inv, name in rows
    ]
    return ApiResponse(success=True, data=items, meta=PaginationMeta(total=count, page=page, limit=limit))


@router.post('/inventory/batch-update', response_model=ApiResponse[list[InventoryBatchResultItem]])
async def batch_update_inventory(
    body: InventoryBatchUpdateRequest,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = ozon_client_for_store(store)
    results: list[InventoryBatchResultItem] = []
    stocks_payload = []
    offer_map = {}
    for item in body.items:
        stmt = select(SyncedProduct).where(
            SyncedProduct.store_id == store.id,
            SyncedProduct.product_id == item.product_id,
        )
        product = (await db.execute(stmt)).scalar_one_or_none()
        if not product:
            results.append(InventoryBatchResultItem(product_id=item.product_id, success=False, message='商品不存在'))
            continue
        offer_map[item.product_id] = product.offer_id
        stocks_payload.append(
            {
                'offer_id': product.offer_id,
                'product_id': int(item.product_id),
                'stock': item.stock,
                'warehouse_id': int(item.warehouse_id) if item.warehouse_id.isdigit() else item.warehouse_id,
            }
        )

    if stocks_payload:
        try:
            await client.update_stocks(stocks=stocks_payload)
            for item in body.items:
                if item.product_id in offer_map:
                    results.append(InventoryBatchResultItem(product_id=item.product_id, success=True))
        except Exception as exc:
            for item in body.items:
                if item.product_id in offer_map:
                    results.append(
                        InventoryBatchResultItem(product_id=item.product_id, success=False, message=str(exc))
                    )
    return ApiResponse(success=True, data=results)


@router.put('/inventory/alert-config', response_model=ApiResponse[InventoryAlertConfigResponse])
async def update_alert_config(
    body: InventoryAlertConfigRequest,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    config = await _get_alert_config(db, store.id)
    config.low_stock_threshold = body.low_stock_threshold
    config.order_overdue_hours = body.order_overdue_hours
    config.updated_at = datetime.now(UTC)
    return ApiResponse(
        success=True,
        data=InventoryAlertConfigResponse(
            low_stock_threshold=config.low_stock_threshold,
            order_overdue_hours=config.order_overdue_hours,
        ),
    )


@router.get('/orders', response_model=ApiResponse[list[OrderSummary]])
async def list_orders(
    status: str | None = Query(default=None),
    fulfillment_type: str | None = Query(default=None),
    is_overdue: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(SyncedOrder).where(SyncedOrder.store_id == store.id)
    if status:
        stmt = stmt.where(SyncedOrder.status.ilike(f'%{status}%'))
    if fulfillment_type and fulfillment_type.upper() != 'ALL':
        stmt = stmt.where(SyncedOrder.fulfillment_type == fulfillment_type.upper())
    if is_overdue is not None:
        stmt = stmt.where(SyncedOrder.is_overdue == is_overdue)
    stmt = stmt.order_by(SyncedOrder.created_at.desc().nulls_last())

    count = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all()
    items = [_row_to_order_summary(row) for row in rows]
    return ApiResponse(success=True, data=items, meta=PaginationMeta(total=count, page=page, limit=limit))


@router.get('/orders/{posting_number}', response_model=ApiResponse[OrderDetail])
async def get_order_detail(
    posting_number: str,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(SyncedOrder).where(
        SyncedOrder.store_id == store.id,
        SyncedOrder.posting_number == posting_number,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if not row:
        raise AppException(code='ORDER_NOT_FOUND', message='订单不存在', http_status=404)
    return ApiResponse(success=True, data=_row_to_order_detail(row))


@router.get('/alerts', response_model=ApiResponse[list[AlertItem]])
async def list_alerts(
    alert_type: str | None = Query(default=None, alias='type'),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alert).where(Alert.store_id == store.id)
    if alert_type and alert_type != 'all':
        stmt = stmt.where(Alert.alert_type == alert_type)
    if status:
        stmt = stmt.where(Alert.status == status)
    stmt = stmt.order_by(Alert.created_at.desc())
    count = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all()
    items = [
        AlertItem(
            id=str(row.id),
            alert_type=row.alert_type,
            reference_id=row.reference_id,
            title=row.title,
            message=row.message,
            severity=row.severity,
            status=row.status,
            created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]
    return ApiResponse(success=True, data=items, meta=PaginationMeta(total=count, page=page, limit=limit))
