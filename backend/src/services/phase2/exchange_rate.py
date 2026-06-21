"""店铺展示汇率 — 手动配置优先，否则拉取公开市场汇率"""

from __future__ import annotations

import json
import logging
import uuid
from typing import TypedDict

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.cache import cache_get, cache_set
from src.models.tracking_sync import ExchangeRate

logger = logging.getLogger(__name__)

CNY_RUB_API_URL = (
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json'
)
CNY_RUB_CACHE_KEY = 'fx:cny_rub:v1'
CNY_RUB_CACHE_TTL = 86_400  # 公共接口按日更新


class CnyRubQuote(TypedDict):
    rate: float
    date: str
    source: str


async def _get_manual_cny_to_rub(db: AsyncSession, store_id: uuid.UUID) -> float | None:
    stmt = (
        select(ExchangeRate.rate)
        .where(
            ExchangeRate.store_id == store_id,
            ExchangeRate.from_currency == 'CNY',
            ExchangeRate.to_currency == 'RUB',
        )
        .order_by(ExchangeRate.updated_at.desc())
        .limit(1)
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return None
    rate = float(row)
    return rate if rate > 0 else None


async def fetch_market_cny_to_rub(*, force_refresh: bool = False) -> CnyRubQuote | None:
    """从 fawazahmed0/currency-api 拉取 1 CNY = ? RUB，Redis 缓存 24h。"""
    if not force_refresh:
        try:
            cached = await cache_get(CNY_RUB_CACHE_KEY)
            if cached:
                payload = json.loads(cached)
                rate = float(payload['rate'])
                if rate > 0:
                    return CnyRubQuote(
                        rate=rate,
                        date=str(payload.get('date') or ''),
                        source='market_rate',
                    )
        except Exception:
            logger.warning('读取 CNY/RUB 汇率缓存失败', exc_info=True)

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            resp = await client.get(CNY_RUB_API_URL)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.warning('拉取公开市场 CNY/RUB 汇率失败', exc_info=True)
        return None

    rub = data.get('cny', {}).get('rub')
    if rub is None:
        logger.warning('CNY/RUB 汇率响应缺少 cny.rub 字段')
        return None

    rate = float(rub)
    if rate <= 0:
        return None

    quote = CnyRubQuote(
        rate=rate,
        date=str(data.get('date') or ''),
        source='market_rate',
    )
    try:
        await cache_set(CNY_RUB_CACHE_KEY, quote, CNY_RUB_CACHE_TTL)
    except Exception:
        logger.warning('写入 CNY/RUB 汇率缓存失败', exc_info=True)
    return quote


async def get_cny_to_rub_rate(
    db: AsyncSession | None = None,
    store_id: uuid.UUID | None = None,
) -> tuple[float | None, str | None]:
    """返回 (CNY→RUB 汇率, 来源)。手动配置优先，否则用公共接口。"""
    if db is not None and store_id is not None:
        manual = await _get_manual_cny_to_rub(db, store_id)
        if manual is not None:
            return manual, 'manual_rate'

    quote = await fetch_market_cny_to_rub()
    if quote is None:
        return None, None
    return quote['rate'], quote['source']


async def get_exchange_rate_payload() -> dict:
    """供 GET /api/v1/exchange-rate 使用。"""
    quote = await fetch_market_cny_to_rub()
    if quote is None:
        return {
            'cny_to_rub': None,
            'rub_to_cny': None,
            'updated_at': None,
            'source': None,
        }
    rate = quote['rate']
    return {
        'cny_to_rub': rate,
        'rub_to_cny': round(1 / rate, 6) if rate > 0 else None,
        'updated_at': quote['date'] or None,
        'source': quote['source'],
    }
