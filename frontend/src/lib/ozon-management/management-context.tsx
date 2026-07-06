"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ProcessingOrder } from "@/lib/ozon-processing/types";

import { MOCK_LISTING_SEED } from "./mock-seed";
import type { ListingItem } from "./types";
import { DEFAULT_LISTING_FILTERS } from "./types";
import { filterListingItems, mapProcessingToListing } from "./utils";

export { DEFAULT_LISTING_FILTERS, filterListingItems };

const STORAGE_KEY = "ozon_listing_items";

function loadItems(): ListingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_LISTING_SEED];
    const parsed = JSON.parse(raw) as ListingItem[];
    return Array.isArray(parsed) ? parsed : [...MOCK_LISTING_SEED];
  } catch {
    return [...MOCK_LISTING_SEED];
  }
}

function persistItems(items: ListingItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export interface CreateFromProcessingResult {
  created: ListingItem[];
  duplicateOrderIds: string[];
}

interface ManagementContextValue {
  items: ListingItem[];
  createFromProcessing: (orders: ProcessingOrder[]) => CreateFromProcessingResult;
  removeItems: (ids: string[]) => ListingItem[];
  batchList: (ids: string[]) => void;
  getItemById: (id: string) => ListingItem | undefined;
  getByProcessingOrderId: (orderId: string) => ListingItem | undefined;
  refreshKey: number;
}

const ManagementContext = createContext<ManagementContextValue | null>(null);

export function ManagementProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ListingItem[]>([]);
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

  const createFromProcessing = useCallback(
    (orders: ProcessingOrder[]): CreateFromProcessingResult => {
      const created: ListingItem[] = [];
      const duplicateOrderIds: string[] = [];

      setItems((prev) => {
        const next = [...prev];
        for (const order of orders) {
          const exists = next.some(
            (i) =>
              i.processing_order_id === order.id && i.listing_status === "pending",
          );
          if (exists) {
            duplicateOrderIds.push(order.id);
            continue;
          }
          const listing = mapProcessingToListing(order);
          next.unshift(listing);
          created.push(listing);
        }
        return next;
      });
      bump();

      return { created, duplicateOrderIds };
    },
    [bump],
  );

  const removeItems = useCallback(
    (ids: string[]): ListingItem[] => {
      let removed: ListingItem[] = [];
      setItems((prev) => {
        removed = prev.filter((i) => ids.includes(i.id));
        return prev.filter((i) => !ids.includes(i.id));
      });
      bump();
      return removed;
    },
    [bump],
  );

  const batchList = useCallback(
    (ids: string[]) => {
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id)
            ? { ...item, listing_status: "listed" as const, listed_at: now }
            : item,
        ),
      );
      bump();
    },
    [bump],
  );

  const getItemById = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items],
  );

  const getByProcessingOrderId = useCallback(
    (orderId: string) =>
      items.find(
        (i) => i.processing_order_id === orderId && i.listing_status === "pending",
      ),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      createFromProcessing,
      removeItems,
      batchList,
      getItemById,
      getByProcessingOrderId,
      refreshKey,
    }),
    [
      items,
      createFromProcessing,
      removeItems,
      batchList,
      getItemById,
      getByProcessingOrderId,
      refreshKey,
    ],
  );

  return (
    <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>
  );
}

export function useManagement() {
  const ctx = useContext(ManagementContext);
  if (!ctx) {
    throw new Error("useManagement must be used within ManagementProvider");
  }
  return ctx;
}
