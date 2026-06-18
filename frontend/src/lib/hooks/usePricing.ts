/** 价格中心 API */

import { apiClient } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface PricingItem {
  product_id: string;
  offer_id: string;
  name: string | null;
  price: number | null;
  old_price: number | null;
  suggested_min_price: number | null;
  currency: string;
  is_price_anomaly: boolean;
}

export interface ProfitConfig {
  offer_id: string;
  purchase_cost: number;
  logistics_cost: number;
  platform_fee_rate: number;
  exchange_rate: number;
  margin_buffer: number;
  max_price_threshold: number | null;
}

export async function fetchPricing(storeId: string, params: { page?: number; price_anomaly?: boolean } = {}) {
  const qs = new URLSearchParams(storeQuery(storeId));
  qs.set("page", String(params.page ?? 1));
  if (params.price_anomaly !== undefined) qs.set("price_anomaly", String(params.price_anomaly));
  const res = await apiClient.get<PricingItem[]>(`/tracking/pricing?${qs}`);
  return { items: res.data ?? [], total: res.meta?.total ?? 0 };
}

export async function fetchProfitConfig(storeId: string, offerId = "__default__") {
  const res = await apiClient.get<ProfitConfig>(`/tracking/pricing/profit-config?${storeQuery(storeId)}&offer_id=${offerId}`);
  return res.data!;
}

export async function saveProfitConfig(storeId: string, body: ProfitConfig) {
  const res = await apiClient.put<ProfitConfig>(`/tracking/pricing/profit-config?${storeQuery(storeId)}`, body);
  return res.data!;
}

export async function batchUpdatePrices(storeId: string, items: { offer_id: string; product_id?: string; price: number }[]) {
  const res = await apiClient.post<{ offer_id: string; success: boolean; message?: string }[]>(
    `/tracking/pricing/batch-update?${storeQuery(storeId)}`,
    { items, confirm_token: items.length > 50 ? "confirmed" : undefined },
  );
  return res.data ?? [];
}
