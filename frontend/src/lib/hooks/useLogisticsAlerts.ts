/** 物流预警 API */

import { apiClient } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface LogisticsConfig {
  node_type: string;
  enabled: boolean;
  threshold_days: number;
}

export interface LogisticsAlert {
  id: string;
  posting_number: string;
  node_type: string;
  overdue_days: number;
  status: string;
  note: string | null;
  triggered_at: string;
  handled_at: string | null;
}

export async function fetchLogisticsConfig(storeId: string) {
  const res = await apiClient.get<LogisticsConfig[]>(`/tracking/logistics-alerts/config?${storeQuery(storeId)}`);
  return res.data ?? [];
}

export async function saveLogisticsConfig(storeId: string, items: LogisticsConfig[]) {
  const res = await apiClient.put<LogisticsConfig[]>(`/tracking/logistics-alerts/config?${storeQuery(storeId)}`, { items });
  return res.data ?? [];
}

export async function fetchLogisticsAlerts(storeId: string, status?: string) {
  const qs = new URLSearchParams(storeQuery(storeId));
  if (status) qs.set("status", status);
  const res = await apiClient.get<LogisticsAlert[]>(`/tracking/logistics-alerts?${qs}`);
  return { items: res.data ?? [], total: res.meta?.total ?? 0 };
}

export async function patchLogisticsAlert(storeId: string, id: string, body: { status: string; note?: string }) {
  const res = await apiClient.patch<LogisticsAlert>(`/tracking/logistics-alerts/${id}?${storeQuery(storeId)}`, body);
  return res.data!;
}

export async function batchPatchAlerts(storeId: string, alertIds: string[], status: string) {
  await apiClient.patch(`/tracking/alerts/batch?${storeQuery(storeId)}`, { alert_ids: alertIds, status });
}
