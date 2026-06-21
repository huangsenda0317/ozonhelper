/** 财务 API */

import { apiClient } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface FinanceSummary {
  total_revenue: number;
  total_fees: number;
  total_refunds: number;
  net_settlement: number;
  gross_profit: number;
  /** Ozon 财务流水条数（一笔订单通常对应多条流水） */
  transaction_count: number;
  /** Ozon「送达客户」财务入账笔数（按 operation_date，含历史订单延迟结算） */
  delivery_count: number;
  /** 近 N 天实际送达订单数（按 posting 下单日去重） */
  actual_delivered_order_count: number;
  /** 同期订单模块入库数（含在途/待发货/取消等全部状态） */
  synced_order_count: number;
  /** 同期订单模块中状态为已送达的数量 */
  synced_delivered_order_count: number;
  range_days: number;
  period_start: string | null;
  period_end: string | null;
}

export async function fetchFinanceSummary(storeId: string, range = "month") {
  const res = await apiClient.get<FinanceSummary>(`/tracking/finance/summary?${storeQuery(storeId)}&range=${range}`);
  return res.data!;
}

export function exportFinanceUrl(storeId: string, range = "30") {
  return `/api/v1/tracking/finance/export?${storeQuery(storeId)}&range=${range}`;
}
