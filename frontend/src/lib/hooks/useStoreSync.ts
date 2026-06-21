"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearPendingSyncJob,
  getPendingSyncJob,
  setPendingSyncJob,
} from "@/lib/sync-session";
import {
  fetchSyncJob,
  triggerSync,
  waitForSyncJob,
} from "@/lib/hooks/useDashboard";

interface UseStoreSyncOptions {
  activeStoreId: string | null;
  onSuccess: () => Promise<void>;
}

export function useStoreSync({ activeStoreId, onSuccess }: UseStoreSyncOptions) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const isMountedRef = useRef(true);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const followSyncJob = useCallback(async (storeId: string, jobId: string) => {
    if (!isMountedRef.current) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await waitForSyncJob(storeId, jobId);
      if (!isMountedRef.current) return;
      if (result.status === "failed") {
        setSyncError(result.error_message || "同步失败");
        return;
      }
      await onSuccessRef.current();
    } catch (err) {
      if (!isMountedRef.current) return;
      setSyncError(err instanceof Error ? err.message : "同步失败");
    } finally {
      clearPendingSyncJob(storeId);
      if (isMountedRef.current) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!activeStoreId) {
      setSyncing(false);
      setSyncError(null);
      return;
    }

    let cancelled = false;

    async function resumePendingSync() {
      const storeId = activeStoreId;
      if (!storeId) return;

      const pending = getPendingSyncJob(storeId);
      if (!pending) {
        if (isMountedRef.current) setSyncing(false);
        return;
      }

      setSyncing(true);

      try {
        const job = await fetchSyncJob(storeId, pending.jobId);
        if (cancelled || !isMountedRef.current) return;

        if (job.status === "pending" || job.status === "running") {
          await followSyncJob(storeId, pending.jobId);
          return;
        }

        clearPendingSyncJob(storeId);
        if (job.status === "succeeded") {
          await onSuccessRef.current();
        } else if (job.status === "failed") {
          setSyncError(job.error_message || "同步失败");
        }
        if (isMountedRef.current) setSyncing(false);
      } catch {
        if (!cancelled) {
          clearPendingSyncJob(storeId);
          if (isMountedRef.current) setSyncing(false);
        }
      }
    }

    void resumePendingSync();
    return () => {
      cancelled = true;
    };
  }, [activeStoreId, followSyncJob]);

  const handleSync = useCallback(async () => {
    if (!activeStoreId || syncing) return;

    const pending = getPendingSyncJob(activeStoreId);
    if (pending) {
      try {
        const job = await fetchSyncJob(activeStoreId, pending.jobId);
        if (job.status === "pending" || job.status === "running") {
          await followSyncJob(activeStoreId, pending.jobId);
          return;
        }
        clearPendingSyncJob(activeStoreId);
      } catch {
        clearPendingSyncJob(activeStoreId);
      }
    }

    setSyncing(true);
    setSyncError(null);
    try {
      const job = await triggerSync(activeStoreId);
      setPendingSyncJob(activeStoreId, job.id);
      await followSyncJob(activeStoreId, job.id);
    } catch (err) {
      clearPendingSyncJob(activeStoreId);
      if (isMountedRef.current) {
        setSyncError(err instanceof Error ? err.message : "同步失败");
        setSyncing(false);
      }
    }
  }, [activeStoreId, syncing, followSyncJob]);

  return { syncing, syncError, handleSync };
}
