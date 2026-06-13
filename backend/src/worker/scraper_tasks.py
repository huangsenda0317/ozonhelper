"""爬虫相关 Celery 异步任务"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ranked_product import RankedProduct
from src.services.rank_scraper.parser import parse_ranking_html
from src.services.rank_scraper.scraper import scraper
from src.worker.app import celery_app
from src.worker.async_runner import run_async_task

# Ozon 常见类目映射
CATEGORIES = {
    'dom-17777': '家居用品',
    'odezhda-obuv-aksessuary-7500': '服装鞋包',
    'elektronika-15500': '电子产品',
    'krasota-zdorove-6500': '美容健康',
    'detskie-tovary-7000': '儿童用品',
    'sport-otdykh-11000': '运动户外',
    'produkty-pitaniya-9200': '食品饮料',
    'avto-moto-8500': '汽车用品',
}


@celery_app.task(name='sync_rankings', bind=True, max_retries=3)
def sync_rankings(self, category_url: str | None = None):
    """定时同步 Ozon 排行榜数据。

    Args:
        category_url: 指定要同步的类目 URL，None 表示同步所有类目
    """
    targets = [(url, name) for url, name in CATEGORIES.items()]
    if category_url:
        targets = [(category_url, CATEGORIES.get(category_url, '未知'))]

    async def _sync(db: AsyncSession) -> None:
        for cat_url, cat_name in targets:
            for rank_type in ['hot', 'rising', 'new']:
                try:
                    html = await scraper.fetch_category_ranking(
                        f'/category/{cat_url}/',
                        rank_type=rank_type,
                    )
                    products = parse_ranking_html(html, rank_type=rank_type)

                    for p in products:
                        p['category'] = cat_name
                        stmt = select(RankedProduct).where(
                            RankedProduct.ozon_product_id == p['ozon_product_id'],
                            RankedProduct.rank_type == rank_type,
                        )
                        result = await db.execute(stmt)
                        existing = result.scalar_one_or_none()

                        if existing:
                            _update_existing(existing, p)
                        else:
                            db.add(RankedProduct(**p))

                    await db.flush()
                    print(f'✅ 同步完成: {cat_name} [{rank_type}] — {len(products)} 商品')
                except Exception as e:
                    print(f'❌ 同步失败: {cat_name} [{rank_type}] — {e}')
                    continue

    try:
        run_async_task(_sync)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60) from exc


def _update_existing(existing: RankedProduct, data: dict):
    """更新已有商品数据（不可变模式）。"""
    existing.title = data['title']
    existing.price_rub = data['price_rub']
    existing.rating = data.get('rating')
    existing.review_count = data.get('review_count', 0)
    existing.sales_trend = data.get('sales_trend')
    existing.rank_position = data['rank_position']
    existing.image_url = data.get('image_url')
    existing.cached_at = datetime.now(timezone.utc)
