"use client";

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import { exportFinanceUrl, fetchFinanceSummary, FinanceSummary } from "@/lib/hooks/useFinance";

export default function FinancePage() {
  const { activeStoreId, dataRefreshKey } = useStoreContext();
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

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-body text-muted">基于 Ozon 交易流水同步汇总，毛利为本地估算</p>
        {activeStoreId && (
          <a href={exportFinanceUrl(activeStoreId)} className="inline-flex cursor-pointer">
            <Button variant="secondary" size="sm" className="gap-xs">
              <Download className="h-4 w-4" aria-hidden="true" />
              导出 Excel
            </Button>
          </a>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-lg">
          {[
            ["回款", summary.total_revenue],
            ["手续费", summary.total_fees],
            ["退款", summary.total_refunds],
            ["净结算", summary.net_settlement],
            ["毛利估算", summary.gross_profit],
            ["交易笔数", summary.transaction_count],
          ].map(([label, value]) => (
            <Card key={String(label)} variant="default" padding="md">
              <p className="text-micro-cap uppercase tracking-[0.25px] text-muted mb-xs">{label}</p>
              <p className="font-display text-heading-lg text-ink">{value}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
