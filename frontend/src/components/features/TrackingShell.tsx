"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  LayoutDashboard,
  Package,
  RefreshCw,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useStoreContext } from "@/lib/store-context";
import { triggerSync, pollSyncJob } from "@/lib/hooks/useDashboard";

const NAV = [
  { href: "/tracking", label: "概览", icon: LayoutDashboard, exact: true },
  { href: "/tracking/products", label: "商品", icon: Package },
  { href: "/tracking/inventory", label: "库存", icon: Warehouse },
  { href: "/tracking/orders", label: "订单", icon: ShoppingCart },
  { href: "/tracking/alerts", label: "预警", icon: AlertTriangle },
];

export function StoreSwitcher() {
  const { stores, activeStoreId, setActiveStoreId, loading } =
    useStoreContext();
  if (loading)
    return <span className="text-caption text-muted">加载店铺...</span>;
  if (stores.length === 0) {
    return (
      <Link
        href="/settings/stores"
        className="text-caption text-accent-violet-mid hover:underline"
      >
        绑定店铺
      </Link>
    );
  }
  return (
    <select
      value={activeStoreId ?? ""}
      onChange={(e) => setActiveStoreId(e.target.value)}
      className="text-caption bg-surface-elevated border border-hairline rounded-md px-sm py-xs"
    >
      {stores.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function TrackingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { stores, activeStoreId, refreshStores, notifyDataRefresh } =
    useStoreContext();
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  const handleSync = async () => {
    if (!activeStoreId) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const job = await triggerSync(activeStoreId, "all");
      const result = await pollSyncJob(activeStoreId, job.id);
      if (result.status === "failed") {
        setSyncError(result.error_message || "同步失败");
        return;
      }
      await refreshStores(true);
      notifyDataRefresh();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="mb-xl flex flex-wrap items-start justify-between gap-md">
        <div>
          <p className="eyebrow-cap mb-sm">Shop ERP</p>
          <h1 className="font-display font-bold text-heading-md text-ink">
            店铺{" "}
            <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
              跟踪
            </span>
          </h1>
          <div className="flex items-center gap-md mt-sm">
            <StoreSwitcher />
            {stores.length === 0 && (
              <Link href="/settings/stores">
                <Button variant="primary" size="sm">
                  添加店铺
                </Button>
              </Link>
            )}
          </div>
        </div>
        {stores.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-xs ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "同步中..." : "立即同步"}
          </Button>
        )}
      </header>
      {syncError && (
        <p className="text-caption text-accent-pink mb-md -mt-lg">
          {syncError}
        </p>
      )}

      <nav className="flex flex-wrap gap-xs mb-xl border-b border-hairline pb-sm">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-xs px-md py-sm text-caption rounded-md transition-colors ${
                active
                  ? "bg-surface-elevated text-ink-deep font-medium"
                  : "text-muted hover:text-ink-deep hover:bg-surface-elevated/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
