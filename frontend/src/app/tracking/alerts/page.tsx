"use client";

import React, { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import { AlertItem, fetchAlerts } from "@/lib/hooks/useOrders";

export default function AlertsPage() {
  const { activeStoreId, dataRefreshKey } = useStoreContext();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    fetchAlerts(activeStoreId)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [activeStoreId, dataRefreshKey]);

  if (loading) return <p className="text-caption text-muted">加载预警...</p>;

  return (
    <div className="space-y-sm">
      {items.map((a) => (
        <Card key={a.id} variant="default" padding="md">
          <div className="flex items-start justify-between gap-md">
            <div>
              <p className="text-body font-medium">{a.title}</p>
              {a.message && <p className="text-caption text-muted mt-xs">{a.message}</p>}
              <p className="text-micro-cap text-muted mt-sm">
                {a.alert_type} · {new Date(a.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
            <span
              className={`text-caption px-sm py-xxs rounded ${
                a.severity === "critical" ? "bg-accent-pink/10 text-accent-pink" : "bg-surface-elevated"
              }`}
            >
              {a.severity}
            </span>
          </div>
        </Card>
      ))}
      {items.length === 0 && (
        <Card variant="default" padding="lg" className="text-center text-muted">
          暂无预警，店铺运行正常
        </Card>
      )}
    </div>
  );
}
