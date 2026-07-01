export interface ImageItem {
  url: string;
  type: 'main' | 'detail';
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export interface VariantItem {
  sku: string;
  label?: string;
  price?: number;
}

/** 与 ozon-scraper-mcp OzonProductDetail 对齐 */
export interface OzonProductDetail {
  ozon_product_id: string;
  source_url: string;
  scraped_at: string;

  title: string;
  description?: string;
  brand?: string;

  price_rub: number;
  original_price_rub?: number;
  discount_percent?: number;
  currency: 'RUB';

  images: ImageItem[];
  video_urls: string[];

  category_path?: string;
  category_breadcrumbs: BreadcrumbItem[];

  attributes: Record<string, string>;
  variants: VariantItem[];

  rating?: number;
  review_count?: number;
  question_count?: number;

  badges: string[];

  seller_name?: string;
  seller_url?: string;

  in_stock?: boolean;
  stock_text?: string;
  delivery_summary?: string;

  parse_method: 'dom';
  warnings: string[];
}
