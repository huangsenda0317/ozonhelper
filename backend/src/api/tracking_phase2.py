"""店铺跟踪 ERP Phase2 API"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.api.exceptions import NotFoundException
from src.api.store_deps import get_user_store
from src.database import get_db
from src.models.store import Store
from src.models.tracking_sync import Alert, LogisticsAlertConfig, LogisticsAlertEvent, SyncedOrder
from src.models.user import User
from src.schemas.common import ApiResponse, PaginationMeta
from src.schemas.phase2 import (
    AlertBatchPatch,
    BatchNoteRequest,
    BatchPriceUpdateRequest,
    FinanceSummary,
    FinanceTransactionItem,
    ListingJobDetail,
    ListingJobSummary,
    ListingItemRow,
    LogisticsAlertPatch,
    LogisticsAlertRow,
    LogisticsConfigRequest,
    LogisticsConfigItem,
    PricingItem,
    ProfitConfigRequest,
    ProfitConfigResponse,
    ReturnOrderItem,
    ShipOrderRequest,
)
from src.services.phase2.finance import (
    export_finance_xlsx,
    finance_summary,
)
from src.services.phase2.fulfillment import (
    batch_update_notes,
    export_orders_csv,
    list_returns,
    ship_fbs_order,
)
from src.services.phase2.listing import (
    build_listing_template,
    create_listing_job,
    get_listing_items,
    get_listing_job,
    list_listing_jobs,
    parse_listing_excel,
)
from src.services.phase2.listing_worker import process_listing_job
from src.services.phase2.pricing import batch_update_prices, get_profit_config, list_pricing
from src.services.phase2.sync_extra import (
    LOGISTICS_NODE_DEFAULTS,
    check_logistics_alerts,
    ensure_logistics_configs,
)
from src.worker.phase2_tasks import dispatch_listing_job

router = APIRouter(prefix='/api/v1/tracking', tags=['店铺跟踪 Phase2'])


@router.get('/pricing', response_model=ApiResponse[list[PricingItem]])
async def get_pricing_list(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    price_anomaly: bool | None = Query(default=None),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = await list_pricing(db, store, page=page, limit=limit, price_anomaly=price_anomaly)
    return ApiResponse(
        success=True,
        data=[PricingItem(**i) for i in items],
        meta=PaginationMeta(total=total, page=page, limit=limit),
    )


@router.get('/pricing/profit-config', response_model=ApiResponse[ProfitConfigResponse])
async def get_profit_config_api(
    offer_id: str = Query(default='__default__'),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cfg = await get_profit_config(db, store.id, offer_id)
    return ApiResponse(
        success=True,
        data=ProfitConfigResponse(
            offer_id=cfg.offer_id,
            purchase_cost=float(cfg.purchase_cost),
            logistics_cost=float(cfg.logistics_cost),
            platform_fee_rate=float(cfg.platform_fee_rate),
            exchange_rate=float(cfg.exchange_rate),
            margin_buffer=float(cfg.margin_buffer),
            max_price_threshold=float(cfg.max_price_threshold) if cfg.max_price_threshold else None,
        ),
    )


@router.put('/pricing/profit-config', response_model=ApiResponse[ProfitConfigResponse])
async def put_profit_config_api(
    body: ProfitConfigRequest,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cfg = await get_profit_config(db, store.id, body.offer_id)
    cfg.purchase_cost = body.purchase_cost
    cfg.logistics_cost = body.logistics_cost
    cfg.platform_fee_rate = body.platform_fee_rate
    cfg.exchange_rate = body.exchange_rate
    cfg.margin_buffer = body.margin_buffer
    cfg.max_price_threshold = body.max_price_threshold
    cfg.updated_at = datetime.now(UTC)
    return ApiResponse(
        success=True,
        data=ProfitConfigResponse(
            offer_id=cfg.offer_id,
            purchase_cost=float(cfg.purchase_cost),
            logistics_cost=float(cfg.logistics_cost),
            platform_fee_rate=float(cfg.platform_fee_rate),
            exchange_rate=float(cfg.exchange_rate),
            margin_buffer=float(cfg.margin_buffer),
            max_price_threshold=float(cfg.max_price_threshold) if cfg.max_price_threshold else None,
        ),
    )


@router.post('/pricing/batch-update', response_model=ApiResponse[list[dict]])
async def batch_update_pricing(
    body: BatchPriceUpdateRequest,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload: list[dict] = []
    if body.items:
        for item in body.items:
            payload.append(
                {'offer_id': item.offer_id, 'product_id': item.product_id, 'price': item.price, 'old_price': item.old_price}
            )
    elif body.adjustment:
        all_items, _ = await list_pricing(db, store, page=1, limit=1000)
        adj = body.adjustment
        for row in all_items:
            price = row['price'] or 0
            if adj.get('type') == 'percent':
                price = price * (1 + float(adj.get('value', 0)) / 100)
            elif adj.get('type') == 'fixed':
                price = float(adj.get('value', price))
            payload.append({'offer_id': row['offer_id'], 'product_id': row['product_id'], 'price': round(price, 2)})
    if len(payload) > 50 and not body.confirm_token:
        from src.api.exceptions import AppException

        raise AppException(code='CONFIRM_REQUIRED', message='批量改价超过 50 条需 confirm_token', http_status=400)
    results = await batch_update_prices(db, store, payload)
    await db.commit()
    return ApiResponse(success=True, data=results)


@router.get('/listing/template')
async def listing_template(current_user: User = Depends(get_current_user)):
    content = build_listing_template()
    return Response(
        content=content,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=listing_template.xlsx'},
    )


@router.post('/listing/upload', response_model=ApiResponse[ListingJobSummary])
async def listing_upload(
    file: UploadFile = File(...),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    parsed = parse_listing_excel(content)
    job = await create_listing_job(db, store, file.filename or 'upload.xlsx', parsed)
    await db.commit()
    dispatch_listing_job(str(job.id))
    return ApiResponse(
        success=True,
        data=ListingJobSummary(
            id=str(job.id),
            filename=job.filename,
            status=job.status,
            total_items=job.total_items,
            success_count=job.success_count,
            failed_count=job.failed_count,
            created_at=job.created_at.isoformat(),
        ),
    )


@router.get('/listing/jobs', response_model=ApiResponse[list[ListingJobSummary]])
async def listing_jobs(
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = await list_listing_jobs(db, store.id)
    return ApiResponse(
        success=True,
        data=[
            ListingJobSummary(
                id=str(j.id),
                filename=j.filename,
                status=j.status,
                total_items=j.total_items,
                success_count=j.success_count,
                failed_count=j.failed_count,
                created_at=j.created_at.isoformat(),
                finished_at=j.finished_at.isoformat() if j.finished_at else None,
            )
            for j in jobs
        ],
    )


@router.get('/listing/jobs/{job_id}', response_model=ApiResponse[ListingJobDetail])
async def listing_job_detail(
    job_id: uuid.UUID,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = await get_listing_job(db, store.id, job_id)
    if not job:
        raise NotFoundException('listing_job', str(job_id))
    items = await get_listing_items(db, job_id)
    return ApiResponse(
        success=True,
        data=ListingJobDetail(
            id=str(job.id),
            filename=job.filename,
            status=job.status,
            total_items=job.total_items,
            success_count=job.success_count,
            failed_count=job.failed_count,
            created_at=job.created_at.isoformat(),
            finished_at=job.finished_at.isoformat() if job.finished_at else None,
            items=[
                ListingItemRow(
                    id=str(it.id),
                    offer_id=it.offer_id,
                    name=it.name,
                    status=it.status,
                    error_message=it.error_message,
                    rejection_reason=it.rejection_reason,
                )
                for it in items
            ],
        ),
    )


@router.post('/listing/jobs/{job_id}/retry', response_model=ApiResponse[dict])
async def listing_job_retry(
    job_id: uuid.UUID,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = await get_listing_job(db, store.id, job_id)
    if not job:
        raise NotFoundException('listing_job', str(job_id))
    dispatch_listing_job(str(job_id))
    return ApiResponse(success=True, data={'job_id': str(job_id), 'status': 'queued'})


@router.post('/orders/{posting_number}/ship', response_model=ApiResponse[dict])
async def ship_order(
    posting_number: str,
    body: ShipOrderRequest,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await ship_fbs_order(db, store, posting_number, body.tracking_number)
    await db.commit()
    return ApiResponse(success=True, data={'posting_number': order.posting_number, 'status': order.status})


@router.post('/orders/export')
async def export_orders(
    status: str | None = Query(default=None),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(SyncedOrder).where(SyncedOrder.store_id == store.id)
    if status:
        stmt = stmt.where(SyncedOrder.status.ilike(f'%{status}%'))
    orders = (await db.execute(stmt)).scalars().all()
    content = export_orders_csv(list(orders))
    return Response(content=content, media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=orders.csv'})


@router.patch('/orders/batch-note', response_model=ApiResponse[dict])
async def orders_batch_note(
    body: BatchNoteRequest,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = await batch_update_notes(db, store.id, body.posting_numbers, body.note)
    await db.commit()
    return ApiResponse(success=True, data={'updated': n})


@router.get('/returns', response_model=ApiResponse[list[ReturnOrderItem]])
async def returns_list_api(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows, total = await list_returns(db, store.id, page, limit)
    return ApiResponse(
        success=True,
        data=[
            ReturnOrderItem(
                return_id=r.return_id,
                posting_number=r.posting_number,
                status=r.status,
                reason=r.reason,
                created_at=r.created_at.isoformat() if r.created_at else None,
            )
            for r in rows
        ],
        meta=PaginationMeta(total=total, page=page, limit=limit),
    )


@router.get('/finance/summary', response_model=ApiResponse[FinanceSummary])
async def finance_summary_api(
    range: str = Query(default='month'),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await finance_summary(db, store, range)
    return ApiResponse(success=True, data=FinanceSummary(**data))


@router.get('/finance/export')
async def finance_export(
    range: str = Query(default='30'),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from src.models.tracking_sync import FinanceTransaction

    summary = await finance_summary(db, store, range)
    since = datetime.now(UTC) - __import__('datetime').timedelta(days=int(range) if range.isdigit() else 30)
    txs = (
        await db.execute(
            select(FinanceTransaction).where(
                FinanceTransaction.store_id == store.id,
                FinanceTransaction.operation_date >= since,
            )
        )
    ).scalars().all()
    content = export_finance_xlsx(summary, list(txs))
    return Response(
        content=content,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=finance_report.xlsx'},
    )


@router.get('/logistics-alerts/config', response_model=ApiResponse[list[LogisticsConfigItem]])
async def get_logistics_config(
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ensure_logistics_configs(db, store.id)
    rows = (
        await db.execute(select(LogisticsAlertConfig).where(LogisticsAlertConfig.store_id == store.id))
    ).scalars().all()
    by_type = {r.node_type: r for r in rows}
    items = [
        LogisticsConfigItem(
            node_type=nt,
            enabled=by_type[nt].enabled if nt in by_type else True,
            threshold_days=by_type[nt].threshold_days if nt in by_type else days,
        )
        for nt, days in LOGISTICS_NODE_DEFAULTS.items()
    ]
    return ApiResponse(success=True, data=items)


@router.put('/logistics-alerts/config', response_model=ApiResponse[list[LogisticsConfigItem]])
async def put_logistics_config(
    body: LogisticsConfigRequest,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for item in body.items:
        stmt = select(LogisticsAlertConfig).where(
            LogisticsAlertConfig.store_id == store.id,
            LogisticsAlertConfig.node_type == item.node_type,
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if not row:
            row = LogisticsAlertConfig(store_id=store.id, node_type=item.node_type)
            db.add(row)
        row.enabled = item.enabled
        row.threshold_days = item.threshold_days
        row.updated_at = datetime.now(UTC)
    await db.flush()
    await check_logistics_alerts(db, store)
    return await get_logistics_config(store=store, db=db, current_user=current_user)


@router.get('/logistics-alerts', response_model=ApiResponse[list[LogisticsAlertRow]])
async def list_logistics_alerts(
    status: str | None = Query(default=None),
    node_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await check_logistics_alerts(db, store)
    stmt = select(LogisticsAlertEvent).where(LogisticsAlertEvent.store_id == store.id)
    if status:
        stmt = stmt.where(LogisticsAlertEvent.status == status)
    if node_type:
        stmt = stmt.where(LogisticsAlertEvent.node_type == node_type)
    stmt = stmt.order_by(LogisticsAlertEvent.overdue_days.desc(), LogisticsAlertEvent.triggered_at.desc())
    count = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            LogisticsAlertRow(
                id=str(r.id),
                posting_number=r.posting_number,
                node_type=r.node_type,
                overdue_days=r.overdue_days,
                status=r.status,
                note=r.note,
                triggered_at=r.triggered_at.isoformat(),
                handled_at=r.handled_at.isoformat() if r.handled_at else None,
            )
            for r in rows
        ],
        meta=PaginationMeta(total=count, page=page, limit=limit),
    )


@router.patch('/logistics-alerts/{alert_id}', response_model=ApiResponse[LogisticsAlertRow])
async def patch_logistics_alert(
    alert_id: uuid.UUID,
    body: LogisticsAlertPatch,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        await db.execute(
            select(LogisticsAlertEvent).where(
                LogisticsAlertEvent.id == alert_id,
                LogisticsAlertEvent.store_id == store.id,
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise NotFoundException('logistics_alert', str(alert_id))
    row.status = body.status
    row.note = body.note
    if body.status in ('handled', 'ignored'):
        row.handled_at = datetime.now(UTC)
    return ApiResponse(
        success=True,
        data=LogisticsAlertRow(
            id=str(row.id),
            posting_number=row.posting_number,
            node_type=row.node_type,
            overdue_days=row.overdue_days,
            status=row.status,
            note=row.note,
            triggered_at=row.triggered_at.isoformat(),
            handled_at=row.handled_at.isoformat() if row.handled_at else None,
        ),
    )


@router.patch('/alerts/batch', response_model=ApiResponse[dict])
async def batch_patch_alerts(
    body: AlertBatchPatch,
    store: Store = Depends(get_user_store),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = [uuid.UUID(i) for i in body.alert_ids]
    rows = (
        await db.execute(select(Alert).where(Alert.store_id == store.id, Alert.id.in_(ids)))
    ).scalars().all()
    for row in rows:
        row.status = body.status
    await db.commit()
    return ApiResponse(success=True, data={'updated': len(rows)})
