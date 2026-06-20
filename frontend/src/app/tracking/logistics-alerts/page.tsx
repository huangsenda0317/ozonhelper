"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { LogisticsConfigModal } from "@/components/features/LogisticsConfigModal";
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
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!activeStoreId) return;
    setLoading(true);
    Promise.all([
      fetchLogisticsConfig(activeStoreId),
      fetchLogisticsAlerts(activeStoreId, "unhandled"),
    ])
      .then(([c, a]) => {
        setConfig(c);
        setAlerts(a.items);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeStoreId, dataRefreshKey]);

  const handleSaveConfig = async (items: LogisticsConfig[]) => {
    if (!activeStoreId) return;
    const saved = await saveLogisticsConfig(activeStoreId, items);
    setConfig(saved);
  };

  if (loading) {
    return <div className="h-48 animate-pulse bg-surface-elevated rounded-lg" />;
  }

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <p className="text-caption text-muted">
          监控各物流节点停滞情况，超时订单将出现在下方列表。
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfigModalOpen(true)}
          className="gap-xs shrink-0"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          阈值配置
        </Button>
      </div>

      <LogisticsConfigModal
        open={configModalOpen}
        config={config}
        onClose={() => setConfigModalOpen(false)}
        onSave={handleSaveConfig}
      />

      <Card variant="default" padding="none" className="overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-hairline bg-surface-elevated">
              <th className="px-lg py-md text-micro-cap text-muted font-medium">订单号</th>
              <th className="px-lg py-md text-micro-cap text-muted font-medium">节点</th>
              <th className="px-lg py-md text-micro-cap text-muted font-medium">超时</th>
              <th className="px-lg py-md text-micro-cap text-muted font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr
                key={a.id}
                className="border-b border-hairline last:border-b-0 bg-accent-pink/5 dark:bg-accent-pink/10"
              >
                <td className="px-lg py-md font-mono text-caption">
                  <Link
                    href={`/tracking/orders?posting=${a.posting_number}`}
                    className="text-accent-violet-mid hover:text-ink dark:hover:text-on-primary transition-colors duration-200"
                  >
                    {a.posting_number}
                  </Link>
                </td>
                <td className="px-lg py-md text-body text-ink">
                  {NODE_LABELS[a.node_type] ?? a.node_type}
                </td>
                <td className="px-lg py-md text-body text-accent-pink font-medium">
                  {a.overdue_days} 天
                </td>
                <td className="px-lg py-md">
                  <button
                    type="button"
                    className="interactive-muted text-caption rounded-md px-sm py-xs"
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
