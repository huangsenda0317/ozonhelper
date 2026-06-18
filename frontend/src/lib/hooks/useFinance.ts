/** 财务 API */

import { apiClient } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface FinanceSummary {
  total_revenue: number;
  total_fees: number;
  total_refunds: number;
  net_settlement: number;
  gross_profit: number;
  transaction_count: number;
}

export async function fetchFinanceSummary(storeId: string, range = "month") {
  const res = await apiClient.get<FinanceSummary>(`/tracking/finance/summary?${storeQuery(storeId)}&range=${range}`);
  return res.data!;
}

export function exportFinanceUrl(storeId: string, range = "30") {
  return `/api/v1/tracking/finance/export?${storeQuery(storeId)}&range=${range}`;
}
