"""店铺管理 API"""

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.api.exceptions import AppException, DuplicateException
from src.database import get_db
from src.models.store import Store
from src.models.tracking_sync import SyncJob
from src.models.user import User
from src.schemas.common import ApiResponse
from src.schemas.stores import StoreCreateRequest, StoreSummary, StoreVerifyResponse
from src.services.ozon.client import OzonSellerClient
from src.services.stores.credentials import (
    decrypt_store_client_id,
    encrypt_store_credentials,
    ozon_client_for_store,
)
from src.services.stores.lifecycle import delete_store_with_data
from src.services.sync.dispatch import dispatch_sync_job

router = APIRouter(prefix='/api/v1/stores', tags=['店铺管理'])
logger = logging.getLogger(__name__)


def _to_summary(store: Store) -> StoreSummary:
    return StoreSummary(
        id=str(store.id),
        name=store.name,
        is_active=store.is_active,
        last_sync_at=store.last_sync_at.isoformat() if store.last_sync_at else None,
        created_at=store.created_at.isoformat() if store.created_at else '',
    )


async def _ensure_store_unique(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    name: str,
    client_id: str,
) -> None:
    """同一用户下店铺名称与 Ozon Client-Id 不可重复。"""
    normalized_name = name.strip().casefold()
    normalized_client_id = client_id.strip()
    stmt = select(Store).where(Store.user_id == user_id)
    for store in (await db.execute(stmt)).scalars():
        if store.name.strip().casefold() == normalized_name:
            raise DuplicateException('该店铺名称已存在')
        if decrypt_store_client_id(store) == normalized_client_id:
            raise DuplicateException('该 Ozon 店铺已绑定，请勿重复添加')


@router.get('', response_model=ApiResponse[list[StoreSummary]])
async def list_stores(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Store).where(Store.user_id == current_user.id).order_by(Store.created_at.desc())
    stores = (await db.execute(stmt)).scalars().all()
    return ApiResponse(success=True, data=[_to_summary(s) for s in stores])


@router.post('', response_model=ApiResponse[StoreSummary], status_code=status.HTTP_201_CREATED)
async def create_store(
    body: StoreCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_store_unique(
        db,
        current_user.id,
        name=body.name,
        client_id=body.client_id,
    )

    client = OzonSellerClient.from_credentials(client_id=body.client_id, api_key=body.api_key)
    try:
        await client.seller_info()
    except AppException:
        raise
    finally:
        await client.close()

    try:
        enc_client_id, enc_api_key = encrypt_store_credentials(body.client_id, body.api_key)
    except AppException:
        raise

    try:
        store = Store(
            user_id=current_user.id,
            name=body.name,
            ozon_client_id=enc_client_id,
            ozon_api_key_encrypted=enc_api_key,
            is_active=True,
        )
        db.add(store)
        await db.flush()
        job = SyncJob(store_id=store.id, job_type='initial', scope='all', status='pending')
        db.add(job)
        await db.flush()
        job_id = str(job.id)
        await db.commit()
        await db.refresh(store)
    except SQLAlchemyError as exc:
        logger.exception('create_store db error for user %s', current_user.id)
        detail = str(getattr(exc, 'orig', exc))
        if 'sync_jobs' in detail and ('does not exist' in detail or 'UndefinedTable' in detail):
            raise AppException(
                code='DB_MIGRATION_REQUIRED',
                message='数据库未迁移到最新版本，请在服务器执行: cd backend && .venv/bin/alembic upgrade head',
                http_status=503,
            ) from exc
        raise AppException(
            code='DB_ERROR',
            message='保存店铺失败，请稍后重试',
            http_status=500,
        ) from exc

    try:
        dispatch_sync_job(job_id, background_tasks)
    except Exception:
        logger.exception('create_store sync dispatch failed for job %s', job_id)

    return ApiResponse(success=True, data=_to_summary(store))


@router.delete('/{store_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
    store_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Store).where(Store.id == store_id, Store.user_id == current_user.id)
    store = (await db.execute(stmt)).scalar_one_or_none()
    if not store:
        raise AppException(code='STORE_NOT_FOUND', message='店铺不存在', http_status=404)
    await delete_store_with_data(db, store)
    # 须在返回 204 前提交：get_db 的 commit 在响应发送后才执行，否则客户端立即拉列表仍会读到未删除的店铺
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post('/{store_id}/verify', response_model=ApiResponse[StoreVerifyResponse])
async def verify_store(
    store_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Store).where(Store.id == store_id, Store.user_id == current_user.id)
    store = (await db.execute(stmt)).scalar_one_or_none()
    if not store:
        raise AppException(code='STORE_NOT_FOUND', message='店铺不存在', http_status=404)
    client = ozon_client_for_store(store)
    try:
        await client.seller_info()
        return ApiResponse(success=True, data=StoreVerifyResponse(valid=True))
    except AppException as exc:
        return ApiResponse(
            success=True,
            data=StoreVerifyResponse(valid=False, reason=exc.message),
        )
    finally:
        await client.close()
