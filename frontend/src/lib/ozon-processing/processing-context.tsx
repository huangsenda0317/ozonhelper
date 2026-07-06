"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CollectionItem } from "@/lib/ozon-collection/types";

import { MOCK_PROCESSING_SEED } from "./mock-seed";
import type {
  CreateFromCollectionResult,
  ProcessingOrder,
  ProcessingStatus,
} from "./types";
import { DEFAULT_PROCESSING_FILTERS } from "./types";
import {
  calcAttributeCompleteness,
  filterProcessingOrders,
  mapCollectionToProcessingOrder,
  mockOptimizeCopy,
} from "./utils";

export { DEFAULT_PROCESSING_FILTERS, filterProcessingOrders };

const STORAGE_KEY = "ozon_processing_orders";
const OPTIMIZE_DELAY_MS = 1500;

function loadOrders(): ProcessingOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_PROCESSING_SEED];
    const parsed = JSON.parse(raw) as ProcessingOrder[];
    return Array.isArray(parsed) ? parsed : [...MOCK_PROCESSING_SEED];
  } catch {
    return [...MOCK_PROCESSING_SEED];
  }
}

function persistOrders(orders: ProcessingOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

interface ProcessingContextValue {
  orders: ProcessingOrder[];
  createFromCollection: (items: CollectionItem[]) => CreateFromCollectionResult;
  removeOrders: (ids: string[]) => ProcessingOrder[];
  updateOrder: (id: string, patch: Partial<ProcessingOrder>) => void;
  setOrderStatus: (ids: string[], status: ProcessingStatus) => void;
  markListedToManagement: (ids: string[], listed: boolean) => void;
  getOrderById: (id: string) => ProcessingOrder | undefined;
  optimizeCopy: (id: string) => Promise<ProcessingOrder>;
  optimizingId: string | null;
  refreshKey: number;
}

const ProcessingContext = createContext<ProcessingContextValue | null>(null);

export function ProcessingProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<ProcessingOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(loadOrders());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistOrders(orders);
  }, [orders, hydrated]);

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  const createFromCollection = useCallback(
    (items: CollectionItem[]): CreateFromCollectionResult => {
      const created: ProcessingOrder[] = [];
      const duplicateIds: string[] = [];

      setOrders((prev) => {
        const next = [...prev];
        for (const item of items) {
          const exists = next.some((o) => o.collection_item_id === item.id);
          if (exists) {
            duplicateIds.push(item.id);
            continue;
          }
          const order = mapCollectionToProcessingOrder(item);
          next.unshift(order);
          created.push(order);
        }
        return next;
      });
      bump();

      return {
        created,
        duplicateIds,
        skipped: items.length - created.length - duplicateIds.length,
      };
    },
    [bump],
  );

  const removeOrders = useCallback(
    (ids: string[]): ProcessingOrder[] => {
      let removed: ProcessingOrder[] = [];
      setOrders((prev) => {
        removed = prev.filter((o) => ids.includes(o.id));
        return prev.filter((o) => !ids.includes(o.id));
      });
      bump();
      return removed;
    },
    [bump],
  );

  const updateOrder = useCallback(
    (id: string, patch: Partial<ProcessingOrder>) => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== id) return order;
          const merged = {
            ...order,
            ...patch,
            updated_at: new Date().toISOString(),
          };
          merged.attribute_completeness = calcAttributeCompleteness(merged);
          return merged;
        }),
      );
      bump();
    },
    [bump],
  );

  const setOrderStatus = useCallback(
    (ids: string[], status: ProcessingStatus) => {
      setOrders((prev) =>
        prev.map((order) =>
          ids.includes(order.id)
            ? { ...order, status, updated_at: new Date().toISOString() }
            : order,
        ),
      );
      bump();
    },
    [bump],
  );

  const markListedToManagement = useCallback(
    (ids: string[], listed: boolean) => {
      setOrders((prev) =>
        prev.map((order) =>
          ids.includes(order.id)
            ? { ...order, listed_to_management: listed, updated_at: new Date().toISOString() }
            : order,
        ),
      );
      bump();
    },
    [bump],
  );

  const getOrderById = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  );

  const optimizeCopy = useCallback(
    async (id: string): Promise<ProcessingOrder> => {
      const current = orders.find((o) => o.id === id);
      if (!current) throw new Error("加工单不存在");

      setOptimizingId(id);
      await new Promise((r) => setTimeout(r, OPTIMIZE_DELAY_MS));

      const optimized = mockOptimizeCopy(current);
      const updated: ProcessingOrder = {
        ...current,
        ...optimized,
        ai_optimized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attribute_completeness: calcAttributeCompleteness({
          ...current,
          ...optimized,
        }),
      };

      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setOptimizingId(null);
      bump();
      return updated;
    },
    [orders, bump],
  );

  const value = useMemo(
    () => ({
      orders,
      createFromCollection,
      removeOrders,
      updateOrder,
      setOrderStatus,
      markListedToManagement,
      getOrderById,
      optimizeCopy,
      optimizingId,
      refreshKey,
    }),
    [
      orders,
      createFromCollection,
      removeOrders,
      updateOrder,
      setOrderStatus,
      markListedToManagement,
      getOrderById,
      optimizeCopy,
      optimizingId,
      refreshKey,
    ],
  );

  return (
    <ProcessingContext.Provider value={value}>{children}</ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const ctx = useContext(ProcessingContext);
  if (!ctx) {
    throw new Error("useProcessing must be used within ProcessingProvider");
  }
  return ctx;
}
