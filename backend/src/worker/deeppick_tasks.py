"""DeepPick 选品排行榜 Celery 任务"""

import asyncio
import logging

from src.cache import close_redis
from src.schemas.deeppick_rankings import RankingQueryParams
from src.services.deeppick.ranking_service import deeppick_ranking_service
from src.worker.app import celery_app

logger = logging.getLogger(__name__)

VIEWS = ['product', 'category', 'brand', 'seller', 'opportunity']


@celery_app.task(name='warmup_deeppick_rankings', bind=True, max_retries=2)
def warmup_deeppick_rankings(self):
    """预热 DeepPick 五大榜单首页缓存。"""

    async def _warmup() -> None:
        try:
            for view in VIEWS:
                params = RankingQueryParams(view=view, page=1, limit=50)
                await deeppick_ranking_service.fetch_and_cache(params)
                logger.info('DeepPick 预热完成: view=%s', view)
        finally:
            await close_redis()

    try:
        asyncio.run(_warmup())
    except Exception as exc:
        logger.exception('DeepPick 预热失败')
        raise self.retry(exc=exc, countdown=300) from exc
