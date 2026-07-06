"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { MOCK_COLLECTION_SEED } from "./mock-seed";
import type {
  AddCollectionResult,
  CollectionFilters,
  CollectionItem,
  ProcessingStatus,
} from "./types";
import { DEFAULT_COLLECTION_FILTERS } from "./types";

const STORAGE_KEY = "ozon_collection_items";

function loadItems(): CollectionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_COLLECTION_SEED];
    const parsed = JSON.parse(raw) as CollectionItem[];
    return Array.isArray(parsed) ? parsed : [...MOCK_COLLECTION_SEED];
  } catch {
    return [...MOCK_COLLECTION_SEED];
  }
}

function persistItems(items: CollectionItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function filterCollectionItems(
  items: CollectionItem[],
  filters: CollectionFilters,
): CollectionItem[] {
  return items.filter((item) => {
    if (filters.keyword.trim()) {
      const kw = filters.keyword.trim().toLowerCase();
      const hay = [
        item.name,
        item.collection_name,
        item.sku,
        item.brand,
        item.seller_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    if (filters.source_platform !== "all") {
      if (item.source_platform !== filters.source_platform) return false;
    }

    if (filters.processing_status !== "all") {
      if (item.processing_status !== filters.processing_status) return false;
    }

    if (filters.collected_time !== "all") {
      const collected = new Date(item.collected_at);
      const now = new Date();
      const todayStart = startOfDay(now);

      if (filters.collected_time === "today") {
        if (collected < todayStart) return false;
      } else if (filters.collected_time === "yesterday") {
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        if (collected < yesterdayStart || collected >= todayStart) return false;
      } else if (filters.collected_time === "last7days") {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        if (collected < weekStart) return false;
      }
    }

    return true;
  });
}

interface CollectionContextValue {
  items: CollectionItem[];
  addItems: (incoming: CollectionItem[]) => AddCollectionResult;
  removeItems: (ids: string[]) => void;
  updateItem: (id: string, patch: Partial<CollectionItem>) => void;
  setProcessingStatus: (ids: string[], status: ProcessingStatus) => void;
  getItemById: (id: string) => CollectionItem | undefined;
  refreshKey: number;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setItems(loadItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistItems(items);
  }, [items, hydrated]);

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  const addItems = useCallback((incoming: CollectionItem[]): AddCollectionResult => {
    const added: CollectionItem[] = [];
    const duplicateSkus: string[] = [];

    setItems((prev) => {
      const next = [...prev];
      for (const item of incoming) {
        const exists = next.some(
          (e) => e.sku === item.sku && e.source_platform === item.source_platform,
        );
        if (exists) {
          duplicateSkus.push(item.sku);
        } else {
          next.unshift(item);
          added.push(item);
        }
      }
      return next;
    });
    bump();

    return { added, duplicateSkus, skipped: incoming.length - added.length - duplicateSkus.length };
  }, [bump]);

  const removeItems = useCallback(
    (ids: string[]) => {
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      bump();
    },
    [bump],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<CollectionItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      bump();
    },
    [bump],
  );

  const setProcessingStatus = useCallback(
    (ids: string[], status: ProcessingStatus) => {
      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id) ? { ...item, processing_status: status } : item,
        ),
      );
      bump();
    },
    [bump],
  );

  const getItemById = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addItems,
      removeItems,
      updateItem,
      setProcessingStatus,
      getItemById,
      refreshKey,
    }),
    [items, addItems, removeItems, updateItem, setProcessingStatus, getItemById, refreshKey],
  );

  return (
    <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) {
    throw new Error("useCollection must be used within CollectionProvider");
  }
  return ctx;
}

export { DEFAULT_COLLECTION_FILTERS };
