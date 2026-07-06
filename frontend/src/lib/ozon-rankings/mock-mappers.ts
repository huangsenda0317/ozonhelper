import type {
  AggregatedRankingItem,
  CategoryOption,
  ProductRankingItem,
  RankingItem,
  RankingListData,
  RankingSummary,
  RankingView,
} from "@/lib/ozon-rankings/types";

const PATH_SEP = " / ";

function toFloat(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function toStringList(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value ? [value] : null;
  return null;
}

export function mapProductItem(item: Record<string, unknown>): ProductRankingItem {
  const reasons = item.opportunity_reasons;
  let opportunityReasons: string[] | null = null;
  if (Array.isArray(reasons)) {
    opportunityReasons = reasons.map(String);
  } else if (typeof reasons === "string" && reasons) {
    opportunityReasons = [reasons];
  }

  return {
    rank_no: toInt(item.rank_no),
    sku: item.sku != null ? String(item.sku) : null,
    name: item.name != null ? String(item.name) : null,
    brand: item.brand != null ? String(item.brand) : null,
    photo_url: item.photo_url != null ? String(item.photo_url) : null,
    product_url: item.product_url != null ? String(item.product_url) : null,
    category_path_zh:
      item.category_path_zh != null ? String(item.category_path_zh) : null,
    seller_name: item.seller_name != null ? String(item.seller_name) : null,
    sales_schema:
      item.sales_schema != null ? String(item.sales_schema) : null,
    gmv_sum: toFloat(item.gmv_sum),
    sold_count: toInt(item.sold_count),
    sold_sum: toFloat(item.sold_sum),
    avg_price: toFloat(item.avg_price),
    session_count: toInt(item.session_count),
    session_count_search: toInt(item.session_count_search),
    views: toInt(item.views),
    conv_to_cart_search: toFloat(item.conv_to_cart_search),
    pdp_to_cart_conversion: toFloat(item.pdp_to_cart_conversion),
    stock: toInt(item.stock),
    updated_at: item.updated_at != null ? String(item.updated_at) : null,
    opportunity_score: toFloat(item.opportunity_score),
    opportunity_reasons: opportunityReasons,
  };
}

export function mapRawProductItem(
  item: Record<string, unknown>,
  rankNo: number,
): ProductRankingItem {
  const categoryParts = [item.category1, item.category3]
    .filter((part) => part != null && String(part).trim())
    .map(String);

  return {
    rank_no: rankNo,
    sku: item.sku != null ? String(item.sku) : null,
    name:
      item.name != null
        ? String(item.name)
        : item.skuName != null
          ? String(item.skuName)
          : null,
    brand: item.brand != null ? String(item.brand) : null,
    photo_url: item.photo != null ? String(item.photo) : null,
    product_url: item.link != null ? String(item.link) : null,
    category_path_zh: categoryParts.length ? categoryParts.join(PATH_SEP) : null,
    seller_name: item.sellerName != null ? String(item.sellerName) : null,
    sales_schema:
      item.salesSchema != null ? String(item.salesSchema) : null,
    gmv_sum: toFloat(item.gmvSum),
    sold_count: toInt(item.soldCount),
    sold_sum: toFloat(item.soldSum),
    avg_price: toFloat(item.avgPrice),
    session_count: toInt(item.sessionCount),
    session_count_search: toInt(item.sessionCountSearch),
    views: toInt(item.views),
    conv_to_cart_search: toFloat(item.convToCartSearch),
    pdp_to_cart_conversion: toFloat(item.pdpToCartConversion),
    stock: toInt(item.stock),
    updated_at: null,
    opportunity_score: null,
    opportunity_reasons: null,
  };
}

export function mapAggregatedItem(
  item: Record<string, unknown>,
): AggregatedRankingItem {
  return {
    rank_no: toInt(item.rank_no),
    label: item.label != null ? String(item.label) : null,
    secondary_label:
      item.secondary_label != null ? String(item.secondary_label) : null,
    total_gmv: toFloat(item.total_gmv),
    total_sold_count: toInt(item.total_sold_count),
    total_search_sessions: toInt(item.total_search_sessions),
    total_views: toInt(item.total_views),
    avg_price: toFloat(item.avg_price),
    avg_search_cart_conversion: toFloat(item.avg_search_cart_conversion),
    avg_pdp_cart_conversion: toFloat(item.avg_pdp_cart_conversion),
    item_count: toInt(item.item_count),
    sku_count: toInt(item.sku_count),
    top_product_name:
      item.top_product_name != null ? String(item.top_product_name) : null,
    top_product_url:
      item.top_product_url != null ? String(item.top_product_url) : null,
    top_product_sku:
      item.top_product_sku != null ? String(item.top_product_sku) : null,
    top_photo_url: item.top_photo_url != null ? String(item.top_photo_url) : null,
    sample_brands: toStringList(item.sample_brands),
    sample_sellers: toStringList(item.sample_sellers),
  };
}

export function mapSummary(raw: Record<string, unknown> | null | undefined): RankingSummary | null {
  if (!raw) return null;
  return {
    total_gmv: toFloat(raw.total_gmv),
    total_sold_count: toInt(raw.total_sold_count),
    total_items: toInt(raw.total_items),
    top_category: raw.top_category != null ? String(raw.top_category) : null,
    top_product_name:
      raw.top_product_name != null ? String(raw.top_product_name) : null,
    top_product_gmv: toFloat(raw.top_product_gmv),
    top_product_sku:
      raw.top_product_sku != null ? String(raw.top_product_sku) : null,
    max_session_count_search: toInt(raw.max_session_count_search),
  };
}

function isAggregatedRawItem(item: Record<string, unknown>): boolean {
  return (
    item.view_type != null ||
    (item.total_gmv != null && item.gmv_sum == null && item.gmvSum == null)
  );
}

export function mapItems(view: RankingView, items: Record<string, unknown>[]): RankingItem[] {
  if (view === "product" || view === "opportunity") {
    return items
      .filter((item) => !isAggregatedRawItem(item))
      .map((item, index) => {
        if (isEnrichedProductItem(item)) {
          return mapProductItem(item);
        }
        if (isRawOzonProductItem(item)) {
          return mapRawProductItem(item, toInt(item.rank_no) ?? index + 1);
        }
        return mapProductItem(item);
      });
  }
  return items
    .filter((item) => isAggregatedRawItem(item))
    .map((item) => mapAggregatedItem(item));
}

function isEnrichedProductItem(item: Record<string, unknown>): boolean {
  return (
    item.gmv_sum != null ||
    item.seller_name != null ||
    item.photo_url != null ||
    item.product_url != null ||
    item.category_path_zh != null
  );
}

function isRawOzonProductItem(item: Record<string, unknown>): boolean {
  return (
    item.gmvSum != null ||
    item.sellerName != null ||
    item.photo != null ||
    item.link != null
  );
}

export function buildCategoryTree(
  items: Record<string, unknown>[],
): CategoryOption[] {
  const tree: Record<string, Record<string, Record<string, {
    label: string;
    path_zh: string;
    type_id: string;
  }>>> = {};

  for (const item of items) {
    const pathZh = String(item.path_zh || item.label || "").trim();
    if (!pathZh) continue;

    const parts = pathZh.split(PATH_SEP).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) continue;

    const [l1, l2, l3] = parts;
    const typeId = String(item.value || "");
    if (!typeId) continue;

    tree[l1] ??= {};
    tree[l1][l2] ??= {};
    tree[l1][l2][typeId] = {
      label: l3,
      path_zh: pathZh,
      type_id: typeId,
    };
  }

  return Object.keys(tree)
    .sort()
    .map((l1) => ({
      value: `cat1:${l1}`,
      label: l1,
      is_leaf: false,
      children: Object.keys(tree[l1])
        .sort()
        .map((l2) => ({
          value: `cat2:${l1}:${l2}`,
          label: l2,
          is_leaf: false,
          children: Object.entries(tree[l1][l2])
            .sort(([, a], [, b]) => a.label.localeCompare(b.label))
            .map(([, meta]) => ({
              value: meta.type_id,
              label: meta.label,
              path_zh: meta.path_zh,
              is_leaf: true,
            })),
        })),
    }));
}

interface MockRankingEnvelope {
  data?: {
    items?: Record<string, unknown>[];
    summary?: Record<string, unknown>;
    pagination?: {
      total?: number;
    };
    task?: {
      result_meta?: {
        first_payload?: {
          items?: Record<string, unknown>[];
        };
      };
    };
  };
}

export function extractMockItems(
  view: RankingView,
  envelope: MockRankingEnvelope,
): Record<string, unknown>[] {
  const items = envelope.data?.items ?? [];
  if (view !== "product") return items;

  if (items.length > 0 && items[0].sku != null) {
    return items;
  }

  return envelope.data?.task?.result_meta?.first_payload?.items ?? items;
}

export function buildRankingListData(
  view: RankingView,
  envelope: MockRankingEnvelope,
): RankingListData {
  const rawItems = extractMockItems(view, envelope);
  return {
    items: mapItems(view, rawItems),
    summary: mapSummary(envelope.data?.summary),
  };
}
