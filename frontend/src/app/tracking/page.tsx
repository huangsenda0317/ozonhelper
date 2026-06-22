"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import {
  ChartTypeSwitch,
  SalesChartType,
  SalesTrendChart,
} from "@/components/features/SalesTrendChart";
import { Button } from "@/components/ui/Button";
import { Card as UiCard } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import {
  DashboardKPI,
  fetchDashboard,
  fetchTrends,
  TrendPoint,
  trendRangeOptions,
  TrendRangeDays,
} from "@/lib/hooks/useDashboard";
import { formatSellerMoney } from "@/lib/currency";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <UiCard variant="default" padding="md">
      <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-xs">{label}</p>
      <p className="font-display text-heading-lg text-ink">{value}</p>
    </UiCard>
  );
}

export default function TrackingDashboardPage() {
  const { activeStoreId, dataRefreshKey, activeStore } = useStoreContext();
  const settlementCurrency = activeStore?.settlement_currency ?? "RUB";
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [range, setRange] = useState<TrendRangeDays>(7);
  const orderSyncDays = activeStore?.order_sync_initial_days ?? 7;
  const trendRanges = useMemo(
    () => trendRangeOptions(orderSyncDays),
    [orderSyncDays],
  );
  const [chartType, setChartType] = useState<SalesChartType>("line");
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKpi = useCallback(async () => {
    if (!activeStoreId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setKpi(await fetchDashboard(activeStoreId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setKpi(null);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, dataRefreshKey]);

  const loadTrends = useCallback(async () => {
    if (!activeStoreId) return;
    setTrendsLoading(true);
    try {
      setTrends(await fetchTrends(activeStoreId, range));
    } catch (e) {
      if (!error) {
        setError(e instanceof Error ? e.message : "趋势加载失败");
      }
      setTrends([]);
    } finally {
      setTrendsLoading(false);
    }
  }, [activeStoreId, range, dataRefreshKey]);

  useEffect(() => {
    if (!trendRanges.includes(range)) {
      setRange(trendRanges[0]);
    }
  }, [trendRanges, range]);

  useEffect(() => {
    loadKpi();
  }, [loadKpi]);

  useEffect(() => {
    if (activeStoreId) {
      loadTrends();
    }
  }, [loadTrends, activeStoreId]);

  const lastSyncLabel = useMemo(() => {
    if (!kpi?.last_synced_at) return null;
    return new Date(kpi.last_synced_at).toLocaleString("zh-CN");
  }, [kpi]);

  if (loading) {
    return <p className="text-caption text-muted">加载看板...</p>;
  }

  if (error || !kpi) {
    return (
      <UiCard variant="default" padding="lg" className="text-center">
        <AlertCircle className="h-8 w-8 text-accent-pink mx-auto mb-md" />
        <p className="text-body text-accent-pink mb-md">{error ?? "加载失败"}</p>
        <Button variant="primary" size="sm" onClick={loadKpi}>
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

      {(kpi.revenue_month != null || kpi.gross_profit_month != null) && (
        <div className="space-y-xs">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-lg">
            <KpiCard label="本月下单回款" value={kpi.revenue_month != null ? formatSellerMoney(kpi.revenue_month, settlementCurrency) : "-"} />
            <KpiCard label="本月手续费" value={kpi.fees_month != null ? formatSellerMoney(kpi.fees_month, settlementCurrency) : "-"} />
            <KpiCard label="本月毛利估算" value={kpi.gross_profit_month != null ? formatSellerMoney(kpi.gross_profit_month, settlementCurrency) : "-"} />
          </div>
          <p className="text-caption text-muted">
            财务 KPI 按订单下单日归属当月，与 Ozon 结算日落账（常含历史订单集中入账）不同。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        <UiCard variant="default" padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-sm mb-sm">
            <p className="text-micro-cap uppercase tracking-[0.25px] text-muted">
              销售趋势
            </p>
            <div className="flex flex-wrap items-center gap-sm">
              <ChartTypeSwitch value={chartType} onChange={setChartType} />
              <div className="flex gap-xs">
                {trendRanges.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRange(d)}
                    className={`text-caption px-sm py-xxs rounded cursor-pointer transition-colors ${
                      range === d
                        ? "bg-surface-elevated font-medium text-ink"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {d}天
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-caption text-muted mb-sm">
            订单金额按本地同步订单卖家结算价按日汇总，与「今日订单」口径一致；销量仍来自 Ozon 分析。
          </p>
          <SalesTrendChart
            data={trends}
            chartType={chartType}
            currency={settlementCurrency}
            loading={trendsLoading}
          />
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
              className="flex items-center justify-between p-sm rounded-md hover:bg-surface-elevated cursor-pointer"
            >
              <span className="flex items-center gap-sm text-body">
                <TrendingUp className="h-4 w-4 text-accent-violet-mid" />
                异常商品
              </span>
              <span className="font-display">{kpi.alert_counts.exception_products}</span>
            </Link>
            <Link
              href="/tracking/logistics-alerts"
              className="flex items-center justify-between p-sm rounded-md hover:bg-surface-elevated cursor-pointer"
            >
              <span className="flex items-center gap-sm text-body">
                <AlertTriangle className="h-4 w-4 text-accent-pink" />
                物流预警
              </span>
              <span className="font-display">{kpi.alert_counts.logistics}</span>
            </Link>
            <Link
              href="/tracking/alerts?type=bad_review"
              className="flex items-center justify-between p-sm rounded-md hover:bg-surface-elevated cursor-pointer"
            >
              <span className="flex items-center gap-sm text-body">
                <AlertCircle className="h-4 w-4 text-accent-pink" />
                差评提醒
              </span>
              <span className="font-display">{kpi.alert_counts.bad_review}</span>
            </Link>
            <Link
              href="/tracking/pricing?anomaly=1"
              className="flex items-center justify-between p-sm rounded-md hover:bg-surface-elevated cursor-pointer"
            >
              <span className="flex items-center gap-sm text-body">
                <TrendingUp className="h-4 w-4 text-accent-pink" />
                价格异常
              </span>
              <span className="font-display">{kpi.alert_counts.price_anomaly}</span>
            </Link>
          </div>
        </UiCard>
      </div>
    </div>
  );
}
