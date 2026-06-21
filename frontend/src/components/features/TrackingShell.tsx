"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  DollarSign,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Truck,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StoreSelect } from "@/components/features/StoreSelect";
import { useStoreContext } from "@/lib/store-context";
import { useStoreSync } from "@/lib/hooks/useStoreSync";
import { useSyncingStoreIds } from "@/lib/hooks/useSyncingStoreId";

const NAV = [
  { href: "/tracking", label: "概览", icon: LayoutDashboard, exact: true },
  { href: "/tracking/products", label: "商品", icon: Package },
  { href: "/tracking/inventory", label: "库存", icon: Warehouse },
  { href: "/tracking/pricing", label: "价格", icon: DollarSign },
  { href: "/tracking/listing", label: "刊登", icon: FileSpreadsheet },
  { href: "/tracking/orders", label: "订单", icon: ShoppingCart },
  { href: "/tracking/finance", label: "财务", icon: DollarSign },
  { href: "/tracking/logistics-alerts", label: "物流预警", icon: Truck },
  { href: "/tracking/alerts", label: "预警", icon: AlertTriangle },
];

function TrackingStoresLoading() {
  return (
    <div className="w-full space-y-lg animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg border border-hairline bg-surface-elevated/50"
          />
        ))}
      </div>
      <div className="h-56 rounded-lg border border-hairline bg-surface-elevated/50" />
    </div>
  );
}

function TrackingEmptyStores() {
  return (
    <Card variant="default" padding="lg" className="text-center">
      <Store
        className="h-10 w-10 text-accent-violet-mid mx-auto mb-md"
        aria-hidden="true"
      />
      <p className="text-heading-sm font-display text-ink mb-sm">
        尚未绑定 Ozon 店铺
      </p>
      <p className="text-caption text-muted mb-lg">
        绑定店铺后可同步商品、订单与库存数据
      </p>
      <Link href="/settings/stores" className="inline-flex cursor-pointer">
        <Button
          variant="primary"
          className="gap-sm normal-case tracking-normal"
        >
          <Store className="h-4 w-4" aria-hidden="true" />
          前往绑定
        </Button>
      </Link>
    </Card>
  );
}

export function StoreSwitcher() {
  const { stores, activeStoreId, setActiveStoreId, loading } =
    useStoreContext();

  return (
    <div className="flex items-center gap-sm flex-nowrap">
      {!loading && stores.length > 0 && (
        <span className="text-caption text-muted whitespace-nowrap shrink-0">
          当前店铺：
        </span>
      )}
      <StoreSelect
        stores={stores}
        value={activeStoreId}
        onChange={setActiveStoreId}
        loading={loading}
        className="min-w-[10rem] !w-auto"
      />
    </div>
  );
}

export function TrackingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    stores,
    activeStoreId,
    activeStore,
    loading: storesLoading,
    refreshStores,
    notifyDataRefresh,
  } = useStoreContext();

  const syncingStoreIds = useSyncingStoreIds();
  const otherStoresSyncing = syncingStoreIds.filter((id) => id !== activeStoreId);
  const otherSyncingNames = stores
    .filter((s) => otherStoresSyncing.includes(s.id))
    .map((s) => s.name);

  const onSyncSuccess = React.useCallback(async () => {
    await refreshStores(true);
    notifyDataRefresh();
  }, [refreshStores, notifyDataRefresh]);

  const { syncing, syncError, handleSync } = useStoreSync({
    activeStoreId,
    onSuccess: onSyncSuccess,
  });

  const activeStoreName = activeStore?.name ?? "当前店铺";

  return (
    <div className="max-w-7xl mx-auto px-xxl py-xxl">
      <header className="mb-xl flex flex-wrap items-center justify-between gap-md">
        <div>
          <p className="eyebrow-cap mb-sm">Shop ERP</p>
          <h1 className="font-display font-bold text-heading-md text-ink">
            店铺{" "}
            <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
              跟踪
            </span>
          </h1>
          <div className="mt-sm">
            <StoreSwitcher />
          </div>
        </div>
        {!storesLoading && stores.length > 0 && (
          <div className="flex flex-col items-end gap-xs shrink-0">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              title={`仅同步当前所选店铺「${activeStoreName}」的商品、库存、订单与财务数据，不影响其他店铺`}
              className="inline-flex items-center gap-xs h-8 px-2 text-caption rounded-md transition-colors duration-200 cursor-pointer text-muted hover:text-ink hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 dark:text-on-dark-muted dark:hover:text-on-primary dark:hover:bg-on-dark-faint"
            >
              <RefreshCw
                className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {syncing ? "同步中…" : "同步当前店铺"}
            </button>
            {otherSyncingNames.length > 0 && (
              <p className="text-caption text-muted max-w-[16rem] text-right">
                「{otherSyncingNames.join("」「")}」正在后台同步
              </p>
            )}
          </div>
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
                active ? "nav-tab-active" : "interactive-muted-soft"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {storesLoading ? (
        <div
          className="flex flex-col items-center gap-md py-xxl"
          aria-busy="true"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-accent-violet-mid"
            aria-hidden="true"
          />
          <p className="text-caption text-muted">加载店铺信息…</p>
          <TrackingStoresLoading />
        </div>
      ) : stores.length === 0 ? (
        <TrackingEmptyStores />
      ) : (
        children
      )}
    </div>
  );
}
