/** 订单 API */

import { apiClient } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface OrderSummary {
  posting_number: string;
  order_id: string | null;
  status: string;
  fulfillment_type: string;
  created_at: string | null;
  shipment_date: string | null;
  products: { sku: string | null; name: string | null; quantity: number; price: number | null }[];
  total_price: number | null;
  is_overdue: boolean;
  synced_at: string | null;
}

export async function fetchOrders(
  storeId: string,
  params: {
    status?: string;
    fulfillment_type?: string;
    is_overdue?: boolean;
    page?: number;
    limit?: number;
  } = {},
) {
  const qs = new URLSearchParams(storeQuery(storeId));
  if (params.status) qs.set("status", params.status);
  if (params.fulfillment_type) qs.set("fulfillment_type", params.fulfillment_type);
  if (params.is_overdue !== undefined) qs.set("is_overdue", String(params.is_overdue));
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));
  const res = await apiClient.get<OrderSummary[]>(`/tracking/orders?${qs}`);
  return { items: res.data ?? [], total: res.meta?.total ?? 0 };
}

/** 预警 API */
export interface AlertItem {
  id: string;
  alert_type: string;
  reference_id: string;
  title: string;
  message: string | null;
  severity: string;
  status: string;
  created_at: string;
}

export async function fetchAlerts(storeId: string, page = 1, limit = 50) {
  const qs = new URLSearchParams(storeQuery(storeId));
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  const res = await apiClient.get<AlertItem[]>(`/tracking/alerts?${qs}`);
  return { items: res.data ?? [], total: res.meta?.total ?? 0 };
}

/** 店铺管理 API */
export interface StoreSummary {
  id: string;
  name: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export async function fetchStores(): Promise<StoreSummary[]> {
  const res = await apiClient.get<StoreSummary[]>("/stores");
  return res.data ?? [];
}

export async function createStore(body: { name: string; client_id: string; api_key: string }) {
  const res = await apiClient.post<StoreSummary>("/stores", body);
  return res.data;
}

export async function deleteStore(storeId: string) {
  await apiClient.delete(`/stores/${storeId}`);
}

export async function verifyStore(storeId: string) {
  const res = await apiClient.post<{ valid: boolean; reason?: string }>(
    `/stores/${storeId}/verify`,
    {},
  );
  return res.data;
}
