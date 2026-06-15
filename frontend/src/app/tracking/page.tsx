"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card as UiCard } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import {
  DashboardKPI,
  fetchDashboard,
  fetchTrends,
  TrendPoint,
} from "@/lib/hooks/useDashboard";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <UiCard variant="default" padding="md">
      <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-xs">{label}</p>
      <p className="font-display text-heading-lg text-ink">{value}</p>
    </UiCard>
  );
}

function SimpleTrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.map((d) => d.units_sold), 1);
  return (
    <div className="flex items-end gap-xs h-32 mt-md">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-xs">
          <div
            className="w-full bg-accent-violet rounded-t-sm min-h-[4px] transition-all"
            style={{ height: `${Math.round((d.units_sold / max) * 100)}%` }}
            title={`${d.date}: ${d.units_sold} 件`}
          />
          <span className="text-[10px] text-muted">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrackingDashboardPage() {
  const { activeStoreId, stores, dataRefreshKey } = useStoreContext();
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [range, setRange] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeStoreId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [k, t] = await Promise.all([
        fetchDashboard(activeStoreId),
        fetchTrends(activeStoreId, range),
      ]);
      setKpi(k);
      setTrends(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, range, dataRefreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const lastSyncLabel = useMemo(() => {
    if (!kpi?.last_synced_at) return null;
    return new Date(kpi.last_synced_at).toLocaleString("zh-CN");
  }, [kpi]);

  if (stores.length === 0) {
    return (
      <UiCard variant="default" padding="lg" className="text-center">
        <Package className="h-10 w-10 text-accent-violet-mid mx-auto mb-md" />
        <p className="text-heading-sm mb-sm">尚未绑定 Ozon 店铺</p>
        <Link href="/settings/stores">
          <Button variant="primary" size="sm">
            前往绑定
          </Button>
        </Link>
      </UiCard>
    );
  }

  if (loading) {
    return <p className="text-caption text-muted">加载看板...</p>;
  }

  if (error || !kpi) {
    return (
      <UiCard variant="default" padding="lg" className="text-center">
        <AlertCircle className="h-8 w-8 text-accent-pink mx-auto mb-md" />
        <p className="text-body text-accent-pink mb-md">{error ?? "加载失败"}</p>
        <Button variant="primary" size="sm" onClick={load}>
          重试
        </Button>
      </UiCard>
    );
  }

  return (
    <div className="space-y-xl">
      {kpi.sync_required && (
        <UiCard variant="default" padding="md" className="border-accent-violet/30">
          <p className="text-body">
            店铺尚未同步数据，请点击右上角「立即同步」完成首次拉取。
          </p>
        </UiCard>
      )}

      {lastSyncLabel && (
        <p className="text-caption text-muted">最近同步：{lastSyncLabel}</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        <KpiCard label="商品总数" value={kpi.total_products} />
        <KpiCard label="今日订单" value={kpi.orders_today} />
        <KpiCard label="本周销量" value={kpi.units_sold_week} />
        <KpiCard
          label="转化率"
          value={
            kpi.conversion_rate != null
              ? `${(kpi.conversion_rate * 100).toFixed(2)}%`
              : "-"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        <UiCard variant="default" padding="lg">
          <div className="flex items-center justify-between mb-sm">
            <p className="text-micro-cap uppercase tracking-[0.25px] text-muted">
              销售趋势
            </p>
            <div className="flex gap-xs">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRange(d)}
                  className={`text-caption px-sm py-xxs rounded ${
                    range === d ? "bg-surface-elevated font-medium" : "text-muted"
                  }`}
                >
                  {d}天
                </button>
              ))}
            </div>
          </div>
          {trends.length > 0 ? (
            <SimpleTrendChart data={trends} />
          ) : (
            <p className="text-caption text-muted py-lg text-center">暂无趋势数据</p>
          )}
        </UiCard>

        <UiCard variant="default" padding="lg">
          <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-md">
            预警摘要
          </p>
          <div className="space-y-sm">
            <Link
              href="/tracking/alerts"
              className="flex items-center justify-between p-sm rounded-md hover:bg-surface-elevated"
            >
              <span className="flex items-center gap-sm text-body">
                <AlertTriangle className="h-4 w-4 text-accent-pink" />
                低库存
              </span>
              <span className="font-display">{kpi.alert_counts.low_stock}</span>
            </Link>
            <Link
              href="/tracking/orders?overdue=1"
              className="flex items-center justify-between p-sm rounded-md hover:bg-surface-elevated"
            >
              <span className="flex items-center gap-sm text-body">
                <ShoppingCart className="h-4 w-4 text-accent-pink" />
                超时订单
              </span>
              <span className="font-display">{kpi.alert_counts.overdue_orders}</span>
            </Link>
            <Link
              href="/tracking/products?exception=1"
              className="flex items-center justify-between p-sm rounded-md hover:bg-surface-elevated"
            >
              <span className="flex items-center gap-sm text-body">
                <TrendingUp className="h-4 w-4 text-accent-violet-mid" />
                异常商品
              </span>
              <span className="font-display">{kpi.alert_counts.exception_products}</span>
            </Link>
          </div>
        </UiCard>
      </div>
    </div>
  );
}
