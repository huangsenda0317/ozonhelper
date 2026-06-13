/**
 * Ozon 商品页面 DOM 提取器 (Content Script)
 * 提取标题、描述、价格、属性表格、SKU 变体、图片/视频 URL、类目路径
 */

interface ExtractedProduct {
  ozon_product_id: string;
  source_url: string;
  title: string;
  price_rub: number;
  original_price_rub?: number;
  description?: string;
  rating?: number;
  attributes: Record<string, string>;
  variants: Array<{ sku: string; [key: string]: string | number }>;
  images: Array<{ url: string; type: 'main' | 'detail' }>;
  video_urls: string[];
  category_path: string;
}

function extractProductId(): string {
  const url = window.location.href;
  const match = url.match(/\/product\/[^/]+-(\d+)/);
  if (match) return match[1];
  const segments = url.split('/');
  return segments[segments.length - 1] || '';
}

function extractTitle(): string {
  const selectors = ['h1[data-widget="webProductHeading"]', 'h1[class*="title"]', '[data-widget="webProductHeading"] h1'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return document.title?.split('—')[0]?.trim() || '';
}

function extractPrice(): number {
  const selectors = ['[data-widget="webPrice"] span', '[class*="price"] span', 'span[class*="price"]'];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const text = el.textContent?.replace(/[^\d]/g, '') || '';
      const price = parseInt(text, 10);
      if (price > 0) return price;
    }
  }
  return 0;
}

function extractDescription(): string {
  const sel = '[data-widget="webDescription"]';
  const el = document.querySelector(sel);
  return el?.textContent?.trim() || '';
}

function extractAttributes(): Record<string, string> {
  const attrs: Record<string, string> = {};
  const rows = document.querySelectorAll('[data-widget="webCharacteristics"] dl, [class*="characteristics"] div');
  rows.forEach((row) => {
    const key = row.querySelector('dt, [class*="key"]')?.textContent?.trim();
    const val = row.querySelector('dd, [class*="value"]')?.textContent?.trim();
    if (key && val) attrs[key] = val;
  });
  return attrs;
}

function extractVariants(): Array<Record<string, string | number>> {
  const variants: Array<Record<string, string | number>> = [];
  const variantElements = document.querySelectorAll('[data-widget="webSkuTile"], [class*="sku"]');
  variantElements.forEach((el) => {
    const label = el.getAttribute('data-label') || el.textContent?.trim() || '';
    variants.push({ sku: label, label, price: 0 });
  });
  return variants;
}

function extractImages(): Array<{ url: string; type: 'main' | 'detail' }> {
  const images: Array<{ url: string; type: 'main' | 'detail' }> = [];
  const imgs = document.querySelectorAll('[data-widget="webGallery"] img, [class*="gallery"] img');
  imgs.forEach((img, i) => {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    if (src && !src.includes('data:image')) {
      images.push({ url: src, type: i === 0 ? 'main' : 'detail' });
    }
  });
  return images;
}

function extractVideos(): string[] {
  const videos: string[] = [];
  const videoElements = document.querySelectorAll('[data-widget="webGallery"] video source, video source');
  videoElements.forEach((el) => {
    const src = el.getAttribute('src');
    if (src) videos.push(src);
  });
  return videos;
}

function extractCategoryPath(): string {
  const breadcrumbs = document.querySelectorAll('[data-widget="webBreadcrumbs"] a, [class*="breadcrumb"] a');
  return Array.from(breadcrumbs).map((el) => el.textContent?.trim() || '').filter(Boolean).join(' > ');
}

export function extractProduct(): ExtractedProduct {
  return {
    ozon_product_id: extractProductId(),
    source_url: window.location.href,
    title: extractTitle(),
    price_rub: extractPrice(),
    description: extractDescription(),
    attributes: extractAttributes(),
    variants: extractVariants(),
    images: extractImages(),
    video_urls: extractVideos(),
    category_path: extractCategoryPath(),
  };
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const product = extractProduct();
    sendResponse({ success: true, data: product });
  }
});
