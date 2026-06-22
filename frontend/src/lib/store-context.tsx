"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchStores, type StoreSummary } from "@/lib/hooks/useOrders";

const STORAGE_KEY = "ozon_active_store_id";

export { STORAGE_KEY as ACTIVE_STORE_STORAGE_KEY };

export type { StoreSummary };

interface StoreContextValue {
  stores: StoreSummary[];
  activeStoreId: string | null;
  activeStore: StoreSummary | null;
  loading: boolean;
  /** 同步完成后递增，子页面据此重新拉取数据 */
  dataRefreshKey: number;
  setActiveStoreId: (id: string) => void;
  refreshStores: (silent?: boolean, force?: boolean) => Promise<void>;
  notifyDataRefresh: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  const notifyDataRefresh = useCallback(() => {
    setDataRefreshKey((k) => k + 1);
  }, []);

  const refreshStores = useCallback(async (silent = false, force = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await fetchStores(force);
      setStores(list);
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const nextId =
        saved && list.some((s) => s.id === saved)
          ? saved
          : list[0]?.id ?? null;
      setActiveStoreIdState(nextId);
      if (nextId && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, nextId);
      }
    } catch {
      setStores([]);
      setActiveStoreIdState(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStores();
  }, [refreshStores]);

  const setActiveStoreId = useCallback((id: string) => {
    setActiveStoreIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId) ?? null,
    [stores, activeStoreId],
  );

  const value = useMemo(
    () => ({
      stores,
      activeStoreId,
      activeStore,
      loading,
      dataRefreshKey,
      setActiveStoreId,
      refreshStores,
      notifyDataRefresh,
    }),
    [stores, activeStoreId, activeStore, loading, dataRefreshKey, setActiveStoreId, refreshStores, notifyDataRefresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStoreContext must be used within StoreProvider");
  }
  return ctx;
}

/** 当前店铺 Ozon 合同结算货币（CNY / USD / RUB） */
export function useSettlementCurrency(): string {
  const { activeStore } = useStoreContext();
  return activeStore?.settlement_currency ?? "RUB";
}

export function storeQuery(storeId: string | null): string {
  return storeId ? `store_id=${encodeURIComponent(storeId)}` : "";
}
