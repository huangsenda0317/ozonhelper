/** 库存 API */

import { apiClient } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface InventoryItem {
  product_id: string;
  offer_id: string;
  name: string | null;
  warehouse_id: string;
  present: number;
  reserved: number;
  is_low_stock: boolean;
  synced_at: string | null;
}

export async function fetchInventory(
  storeId: string,
  params: { search?: string; low_stock?: boolean; page?: number; limit?: number } = {},
) {
  const qs = new URLSearchParams(storeQuery(storeId));
  if (params.search) qs.set("search", params.search);
  if (params.low_stock) qs.set("low_stock", "true");
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));
  const res = await apiClient.get<InventoryItem[]>(`/tracking/inventory?${qs}`);
  return {
    items: res.data ?? [],
    total: res.meta?.total ?? 0,
  };
}

export async function batchUpdateInventory(
  storeId: string,
  items: { product_id: string; warehouse_id?: string; stock: number }[],
) {
  const res = await apiClient.post<{ product_id: string; success: boolean; message?: string }[]>(
    `/tracking/inventory/batch-update?${storeQuery(storeId)}`,
    { items },
  );
  return res.data ?? [];
}
