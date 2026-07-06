import type {
  AggregatedRankingItem,
  ProductRankingItem,
  RankingItem,
  RankingView,
} from "@/lib/ozon-rankings/types";
import { isProductItem, isProductView } from "@/lib/ozon-rankings/types";

import type { CollectionItem } from "./types";
import { extractSkuFromOzonUrl } from "./utils";

function newCollectionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function baseFromProduct(
  product: ProductRankingItem,
  view: RankingView,
): Omit<CollectionItem, "id" | "collected_at"> {
  const sku =
    product.sku ?? extractSkuFromOzonUrl(product.product_url) ?? "unknown";
  const name = product.name || product.sku || "未命名商品";

  return {
    sku,
    name,
    photo_url: product.photo_url,
    product_url: product.product_url,
    current_price: product.avg_price,
    rating: null,
    review_count: null,
    competitor_count: null,
    sold_count: product.sold_count,
    collection_name: name,
    brand: product.brand,
    seller_name: product.seller_name,
    source_platform: "OZON",
    source_view: view,
    processing_status: "pending",
    tags: [],
    category_path_zh: product.category_path_zh,
  };
}

function baseFromAggregated(
  agg: AggregatedRankingItem,
  view: RankingView,
): Omit<CollectionItem, "id" | "collected_at"> | null {
  const sku =
    agg.top_product_sku ?? extractSkuFromOzonUrl(agg.top_product_url);
  if (!sku || !agg.top_product_url) return null;

  const name = agg.top_product_name || agg.label || sku;

  return {
    sku,
    name,
    photo_url: agg.top_photo_url,
    product_url: agg.top_product_url,
    current_price: agg.avg_price,
    rating: null,
    review_count: null,
    competitor_count: null,
    sold_count: agg.total_sold_count,
    collection_name: name,
    brand: agg.sample_brands?.[0] ?? null,
    seller_name: agg.sample_sellers?.[0] ?? null,
    source_platform: "OZON",
    source_view: view,
    processing_status: "pending",
    tags: [],
    category_path_zh: agg.label,
  };
}

export function mapRankingItemToCollection(
  record: RankingItem,
  view: RankingView,
): CollectionItem | null {
  let base: Omit<CollectionItem, "id" | "collected_at"> | null = null;

  if (isProductView(view) && isProductItem(record, view)) {
    base = baseFromProduct(record as ProductRankingItem, view);
  } else if (!isProductView(view) && !isProductItem(record, view)) {
    base = baseFromAggregated(record as AggregatedRankingItem, view);
  }

  if (!base || base.sku === "unknown") return null;

  return {
    ...base,
    id: newCollectionId(),
    collected_at: new Date().toISOString(),
  };
}
