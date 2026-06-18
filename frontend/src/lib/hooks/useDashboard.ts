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

export async function fetchTrends(storeId: string, range: 7 | 30 = 7): Promise<TrendPoint[]> {
  const res = await apiClient.get<TrendPoint[]>(
    `/tracking/dashboard/trends?${qs(storeId, `range=${range}`)}`,
  );
  return res.data ?? [];
}

export async function triggerSync(storeId: string, scope = "all"): Promise<SyncJob> {
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
  maxAttempts = 150,
): Promise<SyncJob> {
  let last: SyncJob | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const job = await fetchSyncJob(storeId, jobId);
    last = job;
    if (job.status === "succeeded") return job;
    if (job.status === "failed") {
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
      "同步超时：任务一直未开始。请确认后端已重启，或设置 SYNC_INLINE=true（默认已开启）且仅需 uvicorn。若使用 Celery，请启动 Worker。",
      504,
    );
  }
  if (last?.status === "running") {
    throw new ApiError(
      "SYNC_TIMEOUT",
      "同步超时：商品较多时首次全量同步可能超过 5 分钟，请稍后在看板查看是否已有数据。",
      504,
    );
  }
  throw new ApiError("SYNC_TIMEOUT", "同步超时", 504);
}
