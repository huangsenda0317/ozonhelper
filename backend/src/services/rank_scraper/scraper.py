"""Ozon 排行榜爬虫 — Scrapling StealthyFetcher"""

import asyncio

from scrapling.fetchers import StealthyFetcher


class RankScraper:
    """Ozon 排行榜爬虫，使用 Scrapling 绕过 Cloudflare 防护。"""

    BASE_URL = 'https://www.ozon.ru'

    def __init__(self):
        self.fetcher = StealthyFetcher()

    async def fetch_category_ranking(
        self,
        category_url: str,
        rank_type: str = 'hot',
        page: int = 1,
    ) -> str:
        """抓取指定类目和榜单类型的页面 HTML。

        Args:
            category_url: Ozon 类目页面 URL
            rank_type: 榜单类型 (hot/rising/new)
            page: 页码

        Returns:
            页面 HTML 文本

        Raises:
            RuntimeError: 抓取失败时抛出
        """
        url = f'{self.BASE_URL}{category_url}?page={page}'

        for attempt in range(3):
            try:
                page_obj = self.fetcher.fetch(
                    url,
                    solve_cloudflare=True,
                    dns_over_https=True,
                    block_ads=True,
                )
                return page_obj.html
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f'抓取失败 (尝试 {attempt + 1}/3): {url}') from e
                wait = 2 ** attempt  # 指数退避: 1s, 2s, 4s
                await asyncio.sleep(wait)

        raise RuntimeError(f'抓取失败: {url}')


# 全局单例
scraper = RankScraper()
