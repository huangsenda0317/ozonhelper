import { waitForSyncJob } from "@/lib/hooks/useDashboard";
import { clearPendingSyncJob, setPendingSyncJob } from "@/lib/sync-session";

/** 注册进行中的同步任务并在后台轮询，供绑定店铺、手动同步等场景复用 */
export function beginStoreSyncTracking(
  storeId: string,
  jobId: string,
  onComplete?: () => void | Promise<void>,
): void {
  setPendingSyncJob(storeId, jobId);
  void (async () => {
    try {
      await waitForSyncJob(storeId, jobId);
      await onComplete?.();
    } catch {
      /* 错误由跟踪页或店铺列表的同步状态 hook 展示 */
    } finally {
      clearPendingSyncJob(storeId);
    }
  })();
}

/** 删除店铺或用户主动中止时，立即停止前端同步轮询 */
export function abortStoreSyncTracking(storeId: string): void {
  clearPendingSyncJob(storeId);
}
