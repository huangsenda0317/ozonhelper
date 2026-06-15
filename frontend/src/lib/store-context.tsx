"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/lib/api-client";

const STORAGE_KEY = "ozon_active_store_id";

export interface StoreSummary {
  id: string;
  name: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface StoreContextValue {
  stores: StoreSummary[];
  activeStoreId: string | null;
  activeStore: StoreSummary | null;
  loading: boolean;
  /** 同步完成后递增，子页面据此重新拉取数据 */
  dataRefreshKey: number;
  setActiveStoreId: (id: string) => void;
  refreshStores: (silent?: boolean) => Promise<void>;
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

  const refreshStores = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get<StoreSummary[]>("/stores");
      const list = res.data ?? [];
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

export function storeQuery(storeId: string | null): string {
  return storeId ? `store_id=${encodeURIComponent(storeId)}` : "";
}
