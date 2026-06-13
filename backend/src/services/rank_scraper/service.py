"""榜单服务 — 获取榜单、缓存、降级逻辑"""

import json
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.cache import cache_get, cache_set
from src.models.ranked_product import RankedProduct
from src.schemas.rankings import RankedProductResponse


class RankingService:
    """榜单数据查询与服务。"""

    CACHE_PREFIX = 'rankings:'
    CACHE_TTL = 3600  # 1 小时

    async def get_rankings(
        self,
        db: AsyncSession,
        category: str,
        rank_type: str,
        page: int = 1,
        limit: int = 50,
        price_min: float | None = None,
        price_max: float | None = None,
        rating_min: float | None = None,
        sales_min: int | None = None,
    ) -> tuple[list[RankedProduct], int, datetime | None]:
        """获取榜单商品列表（带筛选）。"""

        # 构建查询
        stmt = select(RankedProduct).where(
            RankedProduct.category == category,
            RankedProduct.rank_type == rank_type,
        )

        if price_min is not None:
            stmt = stmt.where(RankedProduct.price_rub >= price_min)
        if price_max is not None:
            stmt = stmt.where(RankedProduct.price_rub <= price_max)
        if rating_min is not None:
            stmt = stmt.where(RankedProduct.rating >= rating_min)
        if sales_min is not None:
            stmt = stmt.where(RankedProduct.review_count >= sales_min)

        # 总数
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await db.execute(count_stmt)
        total = count_result.scalar() or 0

        # 分页
        stmt = stmt.order_by(RankedProduct.rank_position.asc())
        stmt = stmt.offset((page - 1) * limit).limit(limit)
        result = await db.execute(stmt)
        products = result.scalars().all()

        # 获取缓存时间
        cached_at = products[0].cached_at if products else None

        return products, total, cached_at

    async def get_categories(self, db: AsyncSession) -> list[str]:
        """获取所有可用的商品类目列表。"""
        stmt = select(RankedProduct.category).distinct().order_by(RankedProduct.category)
        result = await db.execute(stmt)
        return [row[0] for row in result.all()]

    def _cache_key(self, category: str, rank_type: str) -> str:
        """生成缓存键。"""
        return f'{self.CACHE_PREFIX}{category}:{rank_type}'

    async def get_from_cache(self, category: str, rank_type: str) -> list[dict] | None:
        """从缓存获取榜单数据。"""
        key = self._cache_key(category, rank_type)
        data = await cache_get(key)
        if data:
            return json.loads(data)
        return None

    async def set_cache(self, category: str, rank_type: str, data: list[dict]) -> None:
        """设置榜单缓存。"""
        key = self._cache_key(category, rank_type)
        await cache_set(key, data, self.CACHE_TTL)


ranking_service = RankingService()
