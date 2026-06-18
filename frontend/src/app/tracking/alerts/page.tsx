"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, AlertTriangle, DollarSign, ShoppingCart, Truck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import { AlertItem, fetchAlerts } from "@/lib/hooks/useOrders";
import { batchPatchAlerts } from "@/lib/hooks/useLogisticsAlerts";

const TYPE_TABS = [
  { id: "all", label: "全部" },
  { id: "low_stock", label: "低库存" },
  { id: "overdue_order", label: "超时订单" },
  { id: "exception_product", label: "异常商品" },
  { id: "logistics", label: "物流" },
  { id: "bad_review", label: "差评" },
  { id: "price_anomaly", label: "价格" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  low_stock: AlertTriangle,
  overdue_order: ShoppingCart,
  exception_product: AlertCircle,
  logistics: Truck,
  bad_review: AlertCircle,
  price_anomaly: DollarSign,
};

export default function AlertsPage() {
  const { activeStoreId, dataRefreshKey } = useStoreContext();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [type, setType] = useState(searchParams.get("type") || "all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    const qs = new URLSearchParams();
    if (type !== "all") qs.set("type", type);
    fetchAlerts(activeStoreId, 1, 50, type !== "all" ? type : undefined)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [activeStoreId, type, dataRefreshKey]);

  if (loading) {
    return <div className="space-y-sm animate-pulse">{Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-20 bg-surface-elevated rounded-lg" />
    ))}</div>;
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap gap-xs">
        {TYPE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`text-caption px-md py-xs rounded-md cursor-pointer transition-colors duration-200 ${
              type === t.id ? "bg-surface-elevated font-medium" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex gap-sm">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              if (activeStoreId) {
                await batchPatchAlerts(activeStoreId, [...selected], "read");
                setSelected(new Set());
              }
            }}
          >
            批量标记已读 ({selected.size})
          </Button>
        </div>
      )}

      <div className="space-y-sm">
        {items.map((a) => {
          const Icon = TYPE_ICONS[a.alert_type] ?? AlertTriangle;
          return (
            <Card key={a.id} variant="default" padding="md" className="border-l-4 border-l-accent-pink/60">
              <div className="flex items-start gap-md">
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(a.id)) next.delete(a.id);
                      else next.add(a.id);
                      return next;
                    })
                  }
                  className="mt-1 cursor-pointer"
                />
                <Icon className="h-5 w-5 text-accent-pink shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium">{a.title}</p>
                  {a.message && <p className="text-caption text-muted mt-xs">{a.message}</p>}
                  <p className="text-micro-cap text-muted mt-sm">
                    {a.alert_type} · {new Date(a.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
                <span
                  className={`text-caption px-sm py-xxs rounded shrink-0 ${
                    a.severity === "critical" ? "bg-accent-pink/10 text-accent-pink" : "bg-surface-elevated"
                  }`}
                >
                  {a.severity}
                </span>
              </div>
            </Card>
          );
        })}
        {items.length === 0 && (
          <Card variant="default" padding="lg" className="text-center text-muted">
            暂无预警，店铺运行正常
          </Card>
        )}
      </div>
    </div>
  );
}
