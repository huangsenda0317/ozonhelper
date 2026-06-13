"""Ozon 排行榜 HTML 解析器 — 基于 Scrapling 自适应提取"""

import json
import re

from scrapling import Selector


def parse_ranking_html(html: str, rank_type: str = 'hot') -> list[dict]:
    """将 Ozon 排行榜 HTML 解析为商品数据字典列表。

    使用 Scrapling 自适应元素定位 (adaptive=True)，
    即使在 Ozon 页面结构变更后也能正确提取数据。

    Args:
        html: Ozon 排行榜页面 HTML
        rank_type: 榜单类型标识

    Returns:
        商品数据字典列表，每个字典包含:
        - ozon_product_id
        - title
        - category
        - price_rub
        - rating
        - review_count
        - image_url
        - rank_position
    """
    page = Selector(html)
    products = []

    # 自适应定位商品卡片
    product_cards = page.css('.widget-search-result-container', adaptive=True)

    for idx, card in enumerate(product_cards, 1):
        try:
            # 提取商品 ID
            link = card.css('a', adaptive=True).first
            href = link.attr('href') if link else ''
            product_id = _extract_product_id(href)

            # 提取标题
            title_elem = card.css('[class*="title"]', adaptive=True).first
            title = title_elem.text.strip() if title_elem else ''

            # 提取价格
            price_elem = card.css('[class*="price"]', adaptive=True).first
            price_rub = _parse_price(price_elem.text if price_elem else '0')

            # 提取评分
            rating_elem = card.css('[class*="rating"]', adaptive=True).first
            rating = _parse_rating(rating_elem.text if rating_elem else None)

            # 提取评价数量
            review_elem = card.css('[class*="review"]', adaptive=True).first
            review_count = _parse_int(review_elem.text if review_elem else '0')

            # 提取图片
            img = card.css('img', adaptive=True).first
            image_url = img.attr('src') if img else None

            if title and product_id:
                products.append({
                    'ozon_product_id': product_id,
                    'title': title,
                    'category': '',  # 由调用方注入
                    'price_rub': price_rub,
                    'rating': rating,
                    'review_count': review_count,
                    'sales_trend': _estimate_trend(idx, len(product_cards)),
                    'rank_type': rank_type,
                    'rank_position': idx,
                    'image_url': image_url,
                })
        except Exception:
            continue

    return products


def _extract_product_id(href: str) -> str:
    """从 URL 中提取 Ozon 商品 ID。"""
    match = re.search(r'/product/[^/]+-(\d+)', href)
    if match:
        return match.group(1)
    match = re.search(r'/(\d{6,})', href)
    return match.group(1) if match else ''


def _parse_price(text: str) -> float:
    """解析价格字符串为浮点数（卢布）。"""
    cleaned = re.sub(r'[^\d.,]', '', text)
    cleaned = cleaned.replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _parse_rating(text: str | None) -> float | None:
    """解析评分为浮点数。"""
    if not text:
        return None
    try:
        return float(text.replace(',', '.'))
    except ValueError:
        return None


def _parse_int(text: str) -> int:
    """解析整数字符串。"""
    cleaned = re.sub(r'[^\d]', '', text)
    try:
        return int(cleaned)
    except ValueError:
        return 0


def _estimate_trend(position: int, total: int) -> str:
    """根据排名位置估算销量趋势。"""
    ratio = position / max(total, 1)
    if ratio <= 0.2:
        return '上升'
    elif ratio <= 0.6:
        return '稳定'
    return '下降'
