"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreContext } from "@/lib/store-context";
import {
  fetchLogisticsAlerts,
  fetchLogisticsConfig,
  LogisticsAlert,
  LogisticsConfig,
  patchLogisticsAlert,
  saveLogisticsConfig,
} from "@/lib/hooks/useLogisticsAlerts";

const NODE_LABELS: Record<string, string> = {
  pending_pack: "待打包",
  pending_pickup: "待揽收",
  transport_stall: "运输停滞",
  pending_delivery: "待签收",
  abnormal: "异常滞留",
};

export default function LogisticsAlertsPage() {
  const { activeStoreId, dataRefreshKey } = useStoreContext();
  const [config, setConfig] = useState<LogisticsConfig[]>([]);
  const [alerts, setAlerts] = useState<LogisticsAlert[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!activeStoreId) return;
    setLoading(true);
    Promise.all([fetchLogisticsConfig(activeStoreId), fetchLogisticsAlerts(activeStoreId, "unhandled")])
      .then(([c, a]) => {
        setConfig(c);
        setAlerts(a.items);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeStoreId, dataRefreshKey]);

  if (loading) return <div className="h-48 animate-pulse bg-surface-elevated rounded-lg" />;

  return (
    <div className="space-y-lg">
      <div className="flex gap-sm">
        <Button variant="secondary" size="sm" onClick={() => setShowConfig((v) => !v)}>
          {showConfig ? "隐藏阈值配置" : "阈值配置"}
        </Button>
      </div>

      {showConfig && (
        <Card variant="default" padding="lg" className="space-y-md">
          {config.map((c, i) => (
            <div key={c.node_type} className="flex flex-wrap items-center gap-md">
              <span className="w-24 text-caption">{NODE_LABELS[c.node_type] ?? c.node_type}</span>
              <label className="flex items-center gap-xs text-caption cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={(e) => {
                    const next = [...config];
                    next[i] = { ...c, enabled: e.target.checked };
                    setConfig(next);
                  }}
                />
                启用
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={c.threshold_days}
                onChange={(e) => {
                  const next = [...config];
                  next[i] = { ...c, threshold_days: parseInt(e.target.value, 10) || 1 };
                  setConfig(next);
                }}
                className="w-16 border border-hairline rounded px-sm py-xs"
              />
              <span className="text-caption text-muted">天</span>
            </div>
          ))}
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              if (activeStoreId) {
                await saveLogisticsConfig(activeStoreId, config);
              }
            }}
          >
            保存配置
          </Button>
        </Card>
      )}

      <Card variant="default" padding="none" className="overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-hairline bg-surface-elevated">
              <th className="px-lg py-md text-micro-cap text-muted">订单号</th>
              <th className="px-lg py-md text-micro-cap text-muted">节点</th>
              <th className="px-lg py-md text-micro-cap text-muted">超时</th>
              <th className="px-lg py-md text-micro-cap text-muted">操作</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-b border-hairline bg-accent-pink/5">
                <td className="px-lg py-md font-mono text-caption">
                  <Link href={`/tracking/orders?posting=${a.posting_number}`} className="text-accent-violet-mid hover:underline">
                    {a.posting_number}
                  </Link>
                </td>
                <td className="px-lg py-md">{NODE_LABELS[a.node_type] ?? a.node_type}</td>
                <td className="px-lg py-md text-accent-pink">{a.overdue_days} 天</td>
                <td className="px-lg py-md">
                  <button
                    type="button"
                    className="text-caption text-muted hover:text-ink cursor-pointer"
                    onClick={async () => {
                      if (activeStoreId) {
                        await patchLogisticsAlert(activeStoreId, a.id, { status: "handled" });
                        load();
                      }
                    }}
                  >
                    标记已处理
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && (
          <p className="text-center text-muted py-xl">暂无物流预警</p>
        )}
      </Card>
    </div>
  );
}
