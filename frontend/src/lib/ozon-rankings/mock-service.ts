import categoryOptionsMock from "@/components/features/ozon-rankings/mock/categoryOptions";
import rankingsBrandMock from "@/components/features/ozon-rankings/mock/rankingsBrand";
import rankingsCategoryMock from "@/components/features/ozon-rankings/mock/rankingsCategory";
import rankingsOpportunityMock from "@/components/features/ozon-rankings/mock/rankingsOpportunity";
import rankingsProductsMock from "@/components/features/ozon-rankings/mock/rankingsPorducts";
import rankingsSellerMock from "@/components/features/ozon-rankings/mock/rankingsSeller";
import {
  buildCategoryTree,
  buildRankingListData,
} from "@/lib/ozon-rankings/mock-mappers";
import type {
  CategoryOptionsData,
  RankingFilters,
  RankingItem,
  RankingListData,
  RankingListMeta,
  RankingView,
} from "@/lib/ozon-rankings/types";

/** 暂时停用爬虫接口，使用本地 mock 数据 */
export const USE_OZON_RANKINGS_MOCK = true;

const MOCK_BY_VIEW = {
  product: rankingsProductsMock,
  category: rankingsCategoryMock,
  brand: rankingsBrandMock,
  seller: rankingsSellerMock,
  opportunity: rankingsOpportunityMock,
} as const;

function matchesKeyword(item: RankingItem, keyword: string, view: RankingView): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;

  const haystack: string[] = [];
  if ("sku" in item) {
    haystack.push(
      item.name ?? "",
      item.sku ?? "",
      item.brand ?? "",
      item.seller_name ?? "",
      item.category_path_zh ?? "",
    );
  } else {
    haystack.push(
      item.label ?? "",
      item.secondary_label ?? "",
      ...(item.sample_brands ?? []),
      ...(item.sample_sellers ?? []),
      item.top_product_name ?? "",
    );
  }

  return haystack.some((text) => text.toLowerCase().includes(q));
}

function matchesCategory(item: RankingItem, category: string): boolean {
  const typeId = category.trim();
  if (!typeId) return true;

  if ("sku" in item) {
    const raw = item as RankingItem & {
      category3_id?: string;
      category_path_zh?: string | null;
    };
    return (
      raw.category_path_zh?.includes(typeId) === true ||
      JSON.stringify(item).includes(typeId)
    );
  }

  return (
    item.label?.includes(typeId) === true ||
    item.secondary_label?.includes(typeId) === true
  );
}

function matchesSalesSchema(item: RankingItem, salesSchema: string): boolean {
  const schema = salesSchema.trim().toUpperCase();
  if (!schema) return true;
  if (!("sales_schema" in item)) return true;
  return (item.sales_schema ?? "").toUpperCase() === schema;
}

function filterItems(
  items: RankingItem[],
  view: RankingView,
  filters: RankingFilters,
): RankingItem[] {
  return items.filter(
    (item) =>
      matchesKeyword(item, filters.keyword, view) &&
      matchesCategory(item, filters.category) &&
      matchesSalesSchema(item, filters.sales_schema),
  );
}

export async function fetchMockRankings(params: {
  view: RankingView;
  filters: RankingFilters;
  page: number;
  limit: number;
}): Promise<{ data: RankingListData; meta: RankingListMeta }> {
  const envelope = MOCK_BY_VIEW[params.view];
  const base = buildRankingListData(params.view, envelope);
  const filtered = filterItems(base.items, params.view, params.filters);
  const total =
    envelope.data?.pagination?.total != null && !params.filters.keyword &&
    !params.filters.category &&
    !params.filters.sales_schema
      ? envelope.data.pagination.total
      : filtered.length;
  const start = (params.page - 1) * params.limit;
  const pageItems = filtered.slice(start, start + params.limit).map((item, index) => ({
    ...item,
    rank_no: start + index + 1,
  }));

  return {
    data: {
      items: pageItems,
      summary: base.summary,
    },
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      cached_at: null,
      stale: false,
    },
  };
}

export async function fetchMockCategoryOptions(): Promise<CategoryOptionsData> {
  const items = (categoryOptionsMock.data?.items ?? []) as Record<string, unknown>[];
  const options = buildCategoryTree(items);
  return {
    options,
    total: items.length,
  };
}
