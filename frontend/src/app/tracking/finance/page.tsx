"use client";

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import { exportFinanceUrl, fetchFinanceSummary, FinanceSummary } from "@/lib/hooks/useFinance";
import { formatSellerMoney, sellerMetricLabel } from "@/lib/currency";

function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return "近 30 天";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  return `${fmt(start)} — ${fmt(end)}`;
}

function formatCount(value: number): string {
  return value.toLocaleString("zh-CN");
}

export default function FinancePage() {
  const { activeStoreId, activeStore, dataRefreshKey } = useStoreContext();
  const settlementCurrency = activeStore?.settlement_currency ?? "RUB";
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    fetchFinanceSummary(activeStoreId)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [activeStoreId, dataRefreshKey]);

  if (loading) {
    return <p className="text-caption text-muted">加载财务数据...</p>;
  }

  const periodLabel = summary
    ? formatPeriod(summary.period_start, summary.period_end)
    : "近 30 天";
  const storeName = activeStore?.name ?? "当前店铺";
  const needsFinanceResync =
    summary &&
    summary.delivery_count > 0 &&
    summary.actual_delivered_order_count === 0;

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="space-y-xs max-w-2xl">
          <p className="text-body text-muted">
            「{storeName}」财务汇总 · {periodLabel}
          </p>
          <p className="text-caption text-muted">
            回款、手续费与净结算均按订单下单日归属统计周期；流水笔数含同一订单的货款、物流与平台费分项。毛利为本地估算。
          </p>
        </div>
        {activeStoreId && (
          <a href={exportFinanceUrl(activeStoreId)} className="inline-flex cursor-pointer shrink-0">
            <Button variant="secondary" size="sm" className="gap-xs">
              <Download className="h-4 w-4" aria-hidden="true" />
              导出 Excel
            </Button>
          </a>
        )}
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-lg">
            {[
              [sellerMetricLabel("下单回款", settlementCurrency), formatSellerMoney(summary.total_revenue, settlementCurrency)],
              [sellerMetricLabel("手续费", settlementCurrency), formatSellerMoney(summary.total_fees, settlementCurrency)],
              [sellerMetricLabel("退款", settlementCurrency), formatSellerMoney(summary.total_refunds, settlementCurrency)],
              [sellerMetricLabel("净结算", settlementCurrency), formatSellerMoney(summary.net_settlement, settlementCurrency)],
              [sellerMetricLabel("毛利估算", settlementCurrency), formatSellerMoney(summary.gross_profit, settlementCurrency)],
              ["流水笔数", formatCount(summary.transaction_count)],
              ["送达回款笔数", formatCount(summary.delivery_count)],
              ["实际送达订单", formatCount(summary.actual_delivered_order_count)],
              ["同期入库订单", formatCount(summary.synced_order_count)],
            ].map(([label, value]) => (
              <Card key={String(label)} variant="default" padding="md">
                <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-xs">
                  {label}
                  {(label === "流水笔数" ||
                    label === "送达回款笔数" ||
                    label === "实际送达订单" ||
                    label === "同期入库订单") &&
                    `（${summary.range_days} 天）`}
                </p>
                <p className="font-display text-heading-lg text-ink">{value}</p>
                {label === "流水笔数" && (
                  <p className="text-caption text-muted mt-xs">
                    周期内关联订单的财务 operation 条数
                  </p>
                )}
                {label === "送达回款笔数" && (
                  <p className="text-caption text-muted mt-xs">
                    送达客户类回款，按下单日统计
                  </p>
                )}
                {label === "实际送达订单" && (
                  <p className="text-caption text-muted mt-xs">
                    财务模块 · 按 posting 下单日去重
                  </p>
                )}
                {label === "同期入库订单" && (
                  <p className="text-caption text-muted mt-xs">
                    订单模块 · 含在途/待发货/取消（增量同步不含已送达）
                  </p>
                )}
              </Card>
            ))}
          </div>

          {needsFinanceResync && (
            <p className="text-caption text-muted">
              正在回填财务订单元数据，若长时间仍为 0，请重启后端服务后刷新本页。
            </p>
          )}

          {summary.actual_delivered_order_count !== summary.synced_order_count && (
            <p className="text-caption text-muted">
              「实际送达订单」来自财务流水（近 {summary.range_days} 天下单且已结算送达，当前{" "}
              {formatCount(summary.actual_delivered_order_count)}）；「同期入库订单」来自订单模块（同期入库的全部状态，当前{" "}
              {formatCount(summary.synced_order_count)}，其中已送达{" "}
              {formatCount(summary.synced_delivered_order_count ?? 0)}）。两者口径不同：订单增量同步仅拉在途/待发货等活跃状态，不含已送达货件，因此数字不一致是正常现象，不代表同步失败。
            </p>
          )}
        </>
      )}
    </div>
  );
}
