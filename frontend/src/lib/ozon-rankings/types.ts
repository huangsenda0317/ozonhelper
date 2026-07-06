/** DeepPick 选品排行榜类型 */

export type RankingView =
  | "product"
  | "category"
  | "brand"
  | "seller"
  | "opportunity";

export interface RankingSummary {
  total_gmv: number | null;
  total_sold_count: number | null;
  total_items: number | null;
  top_category: string | null;
  top_product_name: string | null;
  top_product_gmv: number | null;
  top_product_sku: string | null;
  max_session_count_search: number | null;
}

export interface ProductRankingItem {
  rank_no: number | null;
  sku: string | null;
  name: string | null;
  brand: string | null;
  photo_url: string | null;
  product_url: string | null;
  category_path_zh: string | null;
  seller_name: string | null;
  sales_schema: string | null;
  gmv_sum: number | null;
  sold_count: number | null;
  sold_sum: number | null;
  avg_price: number | null;
  session_count: number | null;
  session_count_search: number | null;
  views: number | null;
  conv_to_cart_search: number | null;
  pdp_to_cart_conversion: number | null;
  stock: number | null;
  updated_at: string | null;
  opportunity_score: number | null;
  opportunity_reasons: string[] | null;
}

export interface AggregatedRankingItem {
  rank_no: number | null;
  label: string | null;
  secondary_label: string | null;
  total_gmv: number | null;
  total_sold_count: number | null;
  total_search_sessions: number | null;
  total_views: number | null;
  avg_price: number | null;
  avg_search_cart_conversion: number | null;
  avg_pdp_cart_conversion: number | null;
  item_count: number | null;
  sku_count: number | null;
  top_product_name: string | null;
  top_product_url: string | null;
  top_photo_url: string | null;
  sample_brands: string[] | null;
  sample_sellers: string[] | null;
}

export type RankingItem = ProductRankingItem | AggregatedRankingItem;

export interface RankingListData {
  items: RankingItem[];
  summary: RankingSummary | null;
}

export interface RankingListMeta {
  total: number;
  page: number;
  limit: number;
  cached_at?: string | null;
  stale?: boolean;
}

export interface RankingFilters {
  sort_key: string;
  keyword: string;
  category: string;
  sales_schema: string;
}

export interface CategoryOption {
  value: string;
  label: string;
  path_zh?: string | null;
  is_leaf?: boolean;
  children?: CategoryOption[];
}

export interface CategoryOptionsData {
  options: CategoryOption[];
  total: number;
}

/** 根据 type_id 在级联树中反查选中路径 */
export function findCategoryPath(
  options: CategoryOption[],
  typeId: string,
  trail: string[] = [],
): string[] | undefined {
  for (const opt of options) {
    const path = [...trail, opt.value];
    if (opt.is_leaf && opt.value === typeId) return path;
    if (opt.children?.length) {
      const found = findCategoryPath(opt.children, typeId, path);
      if (found) return found;
    }
  }
  return undefined;
}

export const RANKING_VIEWS: { value: RankingView; label: string }[] = [
  { value: "product", label: "商品榜" },
  { value: "category", label: "类目榜" },
  { value: "brand", label: "品牌榜" },
  { value: "seller", label: "卖家榜" },
  { value: "opportunity", label: "机会榜" },
];

export const SORT_OPTIONS = [
  { value: "sum_gmv_desc", label: "GMV" },
  { value: "sold_count_desc", label: "销量" },
  { value: "session_count_search_desc", label: "搜索会话" },
  { value: "views_desc", label: "曝光" },
  { value: "avg_price_desc", label: "均价" },
];

export const SALES_SCHEMA_OPTIONS = [
  { value: "", label: "全部" },
  { value: "FBO", label: "FBO" },
  { value: "FBS", label: "FBS" },
];

export function isProductView(view: RankingView): boolean {
  return view === "product" || view === "opportunity";
}

export function isProductItem(
  item: RankingItem,
  view: RankingView,
): item is ProductRankingItem {
  if (!isProductView(view)) return false;
  if ("total_gmv" in item && item.total_gmv != null) return false;
  return (
    item.gmv_sum != null ||
    item.sku != null ||
    item.photo_url != null ||
    item.product_url != null
  );
}
