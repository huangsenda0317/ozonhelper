/** 商品加工类型 */

import type { SourcePlatform } from "@/lib/ozon-collection/types";

export type ProcessingStatus = "pool" | "processing" | "finished" | "failed";

export type SpecMode = "shared" | "per_spec";

export type ProcessingTimeRange = "all" | "today" | "yesterday" | "last7days";

export interface ProcessingSpec {
  id: string;
  name: string;
  images: string[];
}

export interface ProcessingAttribute {
  name: string;
  value: string;
}

export interface ProcessingOrder {
  id: string;
  collection_item_id: string;
  sku: string;
  name: string;
  photo_url: string | null;
  product_url: string | null;
  source_platform: SourcePlatform;
  title_zh: string;
  tags_zh: string[];
  description_zh: string;
  category_path_zh: string | null;
  attributes: ProcessingAttribute[];
  spec_mode: SpecMode;
  specs: ProcessingSpec[];
  images: string[];
  status: ProcessingStatus;
  attribute_completeness: number;
  ai_optimized_at: string | null;
  listed_to_management: boolean;
  current_price: number | null;
  brand: string | null;
  seller_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingFilters {
  keyword: string;
  source_platform: "all" | SourcePlatform;
  created_time: ProcessingTimeRange;
}

export const DEFAULT_PROCESSING_FILTERS: ProcessingFilters = {
  keyword: "",
  source_platform: "all",
  created_time: "all",
};

export const PROCESSING_STATUS_TABS: {
  value: ProcessingStatus;
  label: string;
}[] = [
  { value: "pool", label: "加工池" },
  { value: "processing", label: "加工中" },
  { value: "finished", label: "加工成品" },
  { value: "failed", label: "加工失败" },
];

export const PROCESSING_TIME_OPTIONS: {
  value: ProcessingTimeRange;
  label: string;
}[] = [
  { value: "all", label: "全部" },
  { value: "today", label: "今日" },
  { value: "yesterday", label: "昨日" },
  { value: "last7days", label: "近七天" },
];

export const PROCESSING_SOURCE_OPTIONS: {
  value: ProcessingFilters["source_platform"];
  label: string;
}[] = [
  { value: "all", label: "全部" },
  { value: "OZON", label: "OZON" },
  { value: "1688", label: "1688" },
];

export interface CreateFromCollectionResult {
  created: ProcessingOrder[];
  skipped: number;
  duplicateIds: string[];
}
