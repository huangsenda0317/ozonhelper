/** 看板、同步、库存、订单 API */

import { apiClient, ApiError } from "@/lib/api-client";
import { storeQuery } from "@/lib/store-context";

export interface DashboardKPI {
  total_products: number;
  orders_today: number;
  orders_week: number;
  orders_month: number;
  units_sold_today: number;
  units_sold_week: number;
  units_sold_month: number;
  conversion_rate: number | null;
  last_synced_at: string | null;
  sync_required: boolean;
  alert_counts: {
    low_stock: number;
    overdue_orders: number;
    exception_products: number;
    logistics: number;
    bad_review: number;
    price_anomaly: number;
    total: number;
  };
  revenue_month?: number | null;
  fees_month?: number | null;
  gross_profit_month?: number | null;
}

export interface TrendPoint {
  date: string;
  orders: number;
  units_sold: number;
  revenue: number | null;
}

export type TrendRangeDays = 7 | 14 | 30;

/** 销售趋势可选天数：不超过店铺订单回溯窗口 */
export function trendRangeOptions(orderSyncDays: number): TrendRangeDays[] {
  if (orderSyncDays >= 30) return [7, 30];
  if (orderSyncDays >= 14) return [7, 14];
  return [7];
}

export async function fetchTrends(
  storeId: string,
  range: TrendRangeDays = 7,
): Promise<TrendPoint[]> {
  const res = await apiClient.get<TrendPoint[]>(
    `/tracking/dashboard/trends?${qs(storeId, `range=${range}`)}`,
  );
  return res.data ?? [];
}

export type SyncScope = "quick" | "all" | "products" | "inventory" | "orders";

export interface SyncJob {
  id: string;
  status: string;
  records_processed: number;
  error_message: string | null;
}

function qs(storeId: string, extra = ""): string {
  const base = storeQuery(storeId);
  return extra ? `${base}&${extra}` : base;
}

export async function fetchDashboard(storeId: string): Promise<DashboardKPI> {
  const res = await apiClient.get<DashboardKPI>(`/tracking/dashboard?${qs(storeId)}`);
  if (!res.data) throw new ApiError("DASHBOARD_ERROR", "看板加载失败", 500);
  return res.data;
}

export async function triggerSync(storeId: string, scope: SyncScope = "all"): Promise<SyncJob> {
  const res = await apiClient.post<SyncJob>(`/tracking/sync?${qs(storeId)}`, { scope });
  if (!res.data) throw new ApiError("SYNC_ERROR", "同步触发失败", 500);
  return res.data;
}

export async function fetchSyncJob(storeId: string, jobId: string): Promise<SyncJob> {
  const res = await apiClient.get<SyncJob>(`/tracking/sync-jobs/${jobId}?${qs(storeId)}`);
  if (!res.data) throw new ApiError("SYNC_JOB_ERROR", "同步任务不存在", 404);
  return res.data;
}

export async function pollSyncJob(
  storeId: string,
  jobId: string,
  maxAttempts = 300,
): Promise<SyncJob> {
  let last: SyncJob | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    let job: SyncJob;
    try {
      job = await fetchSyncJob(storeId, jobId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError("SYNC_JOB_GONE", "同步任务已结束", 404);
      }
      throw err;
    }
    last = job;
    if (job.status === "succeeded") return job;
    if (job.status === "failed") {
      if (job.error_message?.includes("店铺已删除")) {
        throw new ApiError("SYNC_CANCELLED", job.error_message, 200);
      }
      throw new ApiError(
        "SYNC_FAILED",
        job.error_message || "同步失败",
        500,
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (last?.status === "pending") {
    throw new ApiError(
      "SYNC_TIMEOUT",
      "同步超时：任务一直未开始。若 .env 设置了 SYNC_INLINE=false，请重启 uvicorn 与 Celery Worker；若 SYNC_INLINE=true（默认），只需 uvicorn、无需 Celery。",
      504,
    );
  }
  if (last?.status === "running") {
    throw new ApiError(
      "SYNC_TIMEOUT",
      "同步超时：订单量较大时全量同步可能超过 5 分钟，后台仍在执行，请稍后刷新看板。",
      504,
    );
  }
  throw new ApiError("SYNC_TIMEOUT", "同步超时", 504);
}

const syncInflight = new Map<string, Promise<SyncJob>>();

/** 等待同步任务完成；同一 store+job 复用进行中的轮询，避免重复请求 */
export function waitForSyncJob(storeId: string, jobId: string): Promise<SyncJob> {
  const key = `${storeId}:${jobId}`;
  let existing = syncInflight.get(key);
  if (!existing) {
    existing = pollSyncJob(storeId, jobId).finally(() => {
      syncInflight.delete(key);
    });
    syncInflight.set(key, existing);
  }
  return existing;
}
