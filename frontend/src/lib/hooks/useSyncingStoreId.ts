"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchSyncJob } from "@/lib/hooks/useDashboard";
import {
  clearPendingSyncJob,
  getAllPendingSyncJobs,
  hasPendingSyncJobs,
  subscribeSyncStatusChange,
} from "@/lib/sync-session";

/** 返回当前正在同步的店铺 ID 列表（各店铺独立，互不影响） */
export function useSyncingStoreIds(): string[] {
  const [syncingStoreIds, setSyncingStoreIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const pendingList = getAllPendingSyncJobs();
    if (pendingList.length === 0) {
      setSyncingStoreIds([]);
      return;
    }

    const active: string[] = [];
    await Promise.all(
      pendingList.map(async ({ storeId, jobId }) => {
        try {
          const job = await fetchSyncJob(storeId, jobId);
          if (job.status === "pending" || job.status === "running") {
            active.push(storeId);
            return;
          }
          clearPendingSyncJob(storeId);
        } catch {
          clearPendingSyncJob(storeId);
        }
      }),
    );
    setSyncingStoreIds(active);
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = subscribeSyncStatusChange(() => void refresh());

    const interval = setInterval(() => {
      if (hasPendingSyncJobs()) void refresh();
    }, 3000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  return syncingStoreIds;
}

/** @deprecated 使用 useSyncingStoreIds，仅兼容单店判断 */
export function useSyncingStoreId(): string | null {
  const ids = useSyncingStoreIds();
  return ids.length === 1 ? ids[0]! : ids[0] ?? null;
}

export function useIsStoreSyncing(storeId: string | null): boolean {
  const syncingStoreIds = useSyncingStoreIds();
  if (!storeId) return false;
  return syncingStoreIds.includes(storeId);
}
