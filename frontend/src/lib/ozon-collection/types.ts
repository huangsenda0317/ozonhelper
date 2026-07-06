/** 商品采集箱类型 */

import type { RankingView } from "@/lib/ozon-rankings/types";

export type SourcePlatform = "OZON" | "1688";

export type ProcessingStatus = "pending" | "created";

export type CollectedTimeRange = "all" | "today" | "yesterday" | "last7days";

export interface CollectionItem {
  id: string;
  sku: string;
  name: string;
  photo_url: string | null;
  product_url: string | null;
  current_price: number | null;
  rating: number | null;
  review_count: number | null;
  competitor_count: number | null;
  sold_count: number | null;
  collection_name: string;
  brand: string | null;
  seller_name: string | null;
  collected_at: string;
  source_platform: SourcePlatform;
  source_view: RankingView;
  processing_status: ProcessingStatus;
  tags: string[];
  category_path_zh: string | null;
}

export interface CollectionFilters {
  keyword: string;
  collected_time: CollectedTimeRange;
  source_platform: "all" | SourcePlatform;
  processing_status: "all" | ProcessingStatus;
}

export const DEFAULT_COLLECTION_FILTERS: CollectionFilters = {
  keyword: "",
  collected_time: "all",
  source_platform: "all",
  processing_status: "all",
};

export const COLLECTED_TIME_OPTIONS: { value: CollectedTimeRange; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "today", label: "今日" },
  { value: "yesterday", label: "昨日" },
  { value: "last7days", label: "近七天" },
];

export const SOURCE_PLATFORM_OPTIONS: {
  value: CollectionFilters["source_platform"];
  label: string;
}[] = [
  { value: "all", label: "全部" },
  { value: "OZON", label: "OZON" },
  { value: "1688", label: "1688" },
];

export const PROCESSING_STATUS_OPTIONS: {
  value: CollectionFilters["processing_status"];
  label: string;
}[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "未创建" },
  { value: "created", label: "已创建" },
];

export interface AddCollectionResult {
  added: CollectionItem[];
  duplicateSkus: string[];
  skipped: number;
}

export type CollectionPanel = "detail" | "edit" | "compare";
