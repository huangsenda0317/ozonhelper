"""Ozon Seller API 日期边界 — 统计日按莫斯科时间。"""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

_MOSCOW = ZoneInfo('Europe/Moscow')


def ozon_local_date() -> date:
    """Ozon analytics 等接口的「当前日期」以莫斯科时区为准。"""
    return datetime.now(_MOSCOW).date()
