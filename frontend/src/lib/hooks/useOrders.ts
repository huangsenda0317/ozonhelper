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

export async function fetchAlerts(storeId: string, page = 1, limit = 50, type?: string) {
  const qs = new URLSearchParams(storeQuery(storeId));
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  if (type) qs.set("type", type);
  const res = await apiClient.get<AlertItem[]>(`/tracking/alerts?${qs}`);
  return { items: res.data ?? [], total: res.meta?.total ?? 0 };
}

export async function shipOrder(storeId: string, postingNumber: string, trackingNumber: string) {
  const res = await apiClient.post<{ posting_number: string; status: string }>(
    `/tracking/orders/${encodeURIComponent(postingNumber)}/ship?${storeQuery(storeId)}`,
    { tracking_number: trackingNumber },
  );
  return res.data;
}

export function exportOrdersUrl(storeId: string, status?: string) {
  const qs = new URLSearchParams(storeQuery(storeId));
  if (status) qs.set("status", status);
  return `/api/v1/tracking/orders/export?${qs}`;
}

export async function fetchReturns(storeId: string, page = 1) {
  const res = await apiClient.get<{ return_id: string; posting_number: string | null; status: string; reason: string | null }[]>(
    `/tracking/returns?${storeQuery(storeId)}&page=${page}`,
  );
  return { items: res.data ?? [], total: res.meta?.total ?? 0 };
}

/** 店铺管理 API */
export interface StoreSummary {
  id: string;
  name: string;
  is_active: boolean;
  order_sync_initial_days: number;
  last_sync_at: string | null;
  created_at: string;
}

export type OrderSyncInitialDays = 7 | 14 | 30;

export interface StoreOrderSyncDaysResult extends StoreSummary {
  sync_job_id: string;
}

export interface StoreCreateResult extends StoreSummary {
  sync_job_id: string;
}

let storesFetchInflight: Promise<StoreSummary[]> | null = null;

/** 丢弃进行中的列表请求去重，确保变更后能拉到最新数据 */
export function invalidateStoresFetchCache() {
  storesFetchInflight = null;
}

export async function fetchStores(force = false): Promise<StoreSummary[]> {
  if (!force && storesFetchInflight) {
    return storesFetchInflight;
  }
  storesFetchInflight = apiClient
    .get<StoreSummary[]>("/stores")
    .then((res) => res.data ?? [])
    .finally(() => {
      storesFetchInflight = null;
    });
  return storesFetchInflight;
}

export async function createStore(body: { name: string; client_id: string; api_key: string }) {
  const res = await apiClient.post<StoreCreateResult>("/stores", body);
  invalidateStoresFetchCache();
  return res.data;
}

export async function deleteStore(storeId: string) {
  await apiClient.delete(`/stores/${storeId}`);
  invalidateStoresFetchCache();
}

export async function verifyStore(storeId: string) {
  const res = await apiClient.post<{ valid: boolean; reason?: string }>(
    `/stores/${storeId}/verify`,
    {},
  );
  return res.data;
}

export async function updateStoreOrderSyncDays(
  storeId: string,
  orderSyncInitialDays: OrderSyncInitialDays,
): Promise<StoreOrderSyncDaysResult> {
  const res = await apiClient.patch<StoreOrderSyncDaysResult>(
    `/stores/${storeId}/order-sync-days`,
    { order_sync_initial_days: orderSyncInitialDays },
  );
  invalidateStoresFetchCache();
  if (!res.data) throw new Error("更新订单回溯天数失败");
  return res.data;
}
