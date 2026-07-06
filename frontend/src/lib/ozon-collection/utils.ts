import {
  isProductItem,
  isProductView,
  type AggregatedRankingItem,
  type ProductRankingItem,
  type RankingItem,
  type RankingView,
} from "@/lib/ozon-rankings/types";

export function extractSkuFromOzonUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/product\/(\d+)/);
  return match?.[1] ?? null;
}

export function getRankingRowKey(
  record: RankingItem,
  view: RankingView,
  index: number,
): string {
  if (isProductItem(record, view)) {
    const product = record as ProductRankingItem;
    return `${view}:product:${product.sku ?? product.rank_no ?? index}`;
  }
  const aggregated = record as AggregatedRankingItem;
  return `${view}:agg:${aggregated.label ?? aggregated.rank_no ?? index}`;
}

export function isRankingRowCollectable(
  record: RankingItem,
  view: RankingView,
): boolean {
  if (isProductView(view) && isProductItem(record, view)) {
    const product = record as ProductRankingItem;
    return Boolean(product.sku || product.product_url);
  }
  if (!isProductView(view) && !isProductItem(record, view)) {
    const agg = record as AggregatedRankingItem;
    return Boolean(
      agg.top_product_url &&
        (agg.top_product_sku || extractSkuFromOzonUrl(agg.top_product_url)),
    );
  }
  return false;
}
