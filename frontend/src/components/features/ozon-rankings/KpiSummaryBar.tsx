"use client";

import React from "react";
import { BarChart3, Package, Tag, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { formatCurrency, formatNumber } from "@/lib/ozon-rankings/format";
import type { RankingSummary } from "@/lib/ozon-rankings/types";

interface KpiSummaryBarProps {
  summary: RankingSummary | null;
  loading?: boolean;
  stale?: boolean;
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-md animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 rounded-xl border border-hairline bg-surface-elevated/50"
        />
      ))}
    </div>
  );
}

export function KpiSummaryBar({ summary, loading, stale }: KpiSummaryBarProps) {
  if (loading) return <KpiSkeleton />;

  const cards = [
    {
      icon: TrendingUp,
      label: "总 GMV",
      value: formatCurrency(summary?.total_gmv),
    },
    {
      icon: BarChart3,
      label: "总销量",
      value: formatNumber(summary?.total_sold_count),
    },
    {
      icon: Tag,
      label: "热门类目",
      value: summary?.top_category || "—",
      align: "left" as const,
    },
    {
      icon: Package,
      label: "热门商品",
      value: summary?.top_product_name || "—",
      sub: summary?.top_product_gmv
        ? formatCurrency(summary.top_product_gmv)
        : undefined,
      align: "left" as const,
    },
  ];

  return (
    <div className="space-y-sm">
      {stale && (
        <p className="text-caption text-amber-600 dark:text-amber-400">
          数据来自缓存（上游服务暂不可用）
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {cards.map(({ icon: Icon, label, value, sub, align = "right" }) => (
          <Card key={label} padding="sm" className="min-h-[5rem]">
            <div className="flex items-start justify-between gap-sm">
              <div className="min-w-0 flex-1">
                <p className="text-caption text-muted mb-xs">{label}</p>
                <p
                  className={`text-body font-medium truncate ${
                    align === "right" ? "text-right tabular-nums" : ""
                  }`}
                  title={value}
                >
                  {value}
                </p>
                {sub && (
                  <p className="text-caption text-muted tabular-nums mt-xs">{sub}</p>
                )}
              </div>
              <Icon
                className="h-4 w-4 text-accent-violet-mid shrink-0 mt-0.5"
                aria-hidden="true"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
