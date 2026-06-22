"""Ozon Seller API 日期边界 — 统计日按莫斯科时间。"""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

_MOSCOW = ZoneInfo('Europe/Moscow')
_SHANGHAI = ZoneInfo('Asia/Shanghai')


def ozon_local_date() -> date:
    """Ozon analytics 等接口的「当前日期」以莫斯科时区为准。"""
    return datetime.now(_MOSCOW).date()


def to_ozon_business_date(dt: datetime) -> date | None:
    """将 UTC/aware datetime 转为 Ozon 莫斯科业务日。"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo('UTC'))
    return dt.astimezone(_MOSCOW).date()


def prompt_datetime_context() -> str:
    """供 AI 问答 system prompt 注入的当前时间（避免模型臆测日期）。"""
    now_cn = datetime.now(_SHANGHAI)
    moscow_date = datetime.now(_MOSCOW).date()
    return (
        f'北京时间 {now_cn:%Y年%m月%d日 %H:%M}；'
        f'Ozon 业务日（莫斯科）{moscow_date:%Y年%m月%d日}'
    )
