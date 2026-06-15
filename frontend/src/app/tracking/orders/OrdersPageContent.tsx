"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import { fetchOrders, OrderSummary } from "@/lib/hooks/useOrders";

export default function OrdersPageContent() {
  const { activeStoreId, dataRefreshKey } = useStoreContext();
  const searchParams = useSearchParams();
  const overdueOnly = searchParams.get("overdue") === "1";
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [ftype, setFtype] = useState("ALL");

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    fetchOrders(activeStoreId, {
      fulfillment_type: ftype,
      is_overdue: overdueOnly ? true : undefined,
    })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [activeStoreId, ftype, overdueOnly, dataRefreshKey]);

  if (loading) return <p className="text-caption text-muted">加载订单...</p>;

  return (
    <div className="space-y-md">
      <div className="flex gap-sm">
        {["ALL", "FBS", "FBO"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFtype(t)}
            className={`text-caption px-md py-xs rounded-md ${
              ftype === t ? "bg-surface-elevated font-medium" : "text-muted"
            }`}
          >
            {t === "ALL" ? "全部" : t}
          </button>
        ))}
      </div>
      <Card variant="default" padding="none" className="overflow-hidden">
        <table className="w-full text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-hairline bg-surface-elevated">
              <th className="px-lg py-md text-micro-cap text-muted">订单号</th>
              <th className="px-lg py-md text-micro-cap text-muted">类型</th>
              <th className="px-lg py-md text-micro-cap text-muted">状态</th>
              <th className="px-lg py-md text-micro-cap text-muted">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr
                key={o.posting_number}
                className={`border-b border-hairline ${o.is_overdue ? "bg-accent-pink/5" : ""}`}
              >
                <td className="px-lg py-md font-mono text-caption">{o.posting_number}</td>
                <td className="px-lg py-md">{o.fulfillment_type}</td>
                <td className={`px-lg py-md ${o.is_overdue ? "text-accent-pink" : ""}`}>
                  {o.status}
                  {o.is_overdue && " ⚠"}
                </td>
                <td className="px-lg py-md text-caption text-muted">
                  {o.created_at ? new Date(o.created_at).toLocaleString("zh-CN") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-center text-muted py-xl">暂无订单，请先同步</p>
        )}
      </Card>
    </div>
  );
}
