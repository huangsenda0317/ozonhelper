/** 商品管理（待上架）类型 */

export type ListingStatus = "pending" | "listed";

export type SourceStatus = "collected" | "processed";

export type ListingTimeRange = "all" | "today" | "yesterday" | "last7days";

export interface ListingItem {
  id: string;
  processing_order_id: string;
  collection_item_id: string;
  sku: string;
  title_zh: string;
  photo_url: string | null;
  product_url: string | null;
  current_price: number | null;
  brand: string | null;
  seller_name: string | null;
  source_status: SourceStatus;
  shop_id: string | null;
  shop_name: string | null;
  listing_status: ListingStatus;
  listed_at: string | null;
  tags: string[];
  category_path_zh: string | null;
  description_zh: string | null;
  joined_at: string;
  page_views: number | null;
  stock: number | null;
}

export interface ListingFilters {
  keyword: string;
  source_status: "all" | SourceStatus;
  shop_id: "all" | string;
  joined_time: ListingTimeRange;
}

export const DEFAULT_LISTING_FILTERS: ListingFilters = {
  keyword: "",
  source_status: "all",
  shop_id: "all",
  joined_time: "all",
};

export const SOURCE_STATUS_OPTIONS: {
  value: ListingFilters["source_status"];
  label: string;
}[] = [
  { value: "all", label: "全部" },
  { value: "collected", label: "已采集" },
  { value: "processed", label: "已加工" },
];

export const LISTING_TIME_OPTIONS: {
  value: ListingTimeRange;
  label: string;
}[] = [
  { value: "all", label: "全部" },
  { value: "today", label: "今日" },
  { value: "yesterday", label: "昨日" },
  { value: "last7days", label: "近七天" },
];

export const MOCK_SHOP_OPTIONS = [
  { value: "all", label: "全部店铺" },
  { value: "shop-1", label: "Ozon 主店" },
  { value: "shop-2", label: "Ozon 副店" },
];
