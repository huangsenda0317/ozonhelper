const STORAGE_KEY = "ozon_pending_sync_jobs";
const LEGACY_STORAGE_KEY = "ozon_pending_sync_job";
const SYNC_STATUS_EVENT = "ozon_sync_status_change";

export interface PendingSyncJob {
  storeId: string;
  jobId: string;
}

type PendingSyncMap = Record<string, string>;

function notifySyncStatusChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT));
  }
}

function readPendingMap(): PendingSyncMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PendingSyncMap;
      if (parsed && typeof parsed === "object") return parsed;
    }
    const legacyRaw = sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as PendingSyncJob;
      if (legacy.storeId && legacy.jobId) {
        const migrated = { [legacy.storeId]: legacy.jobId };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return {};
}

function writePendingMap(map: PendingSyncMap) {
  if (typeof window === "undefined") return;
  if (Object.keys(map).length === 0) {
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }
  notifySyncStatusChange();
}

export function subscribeSyncStatusChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SYNC_STATUS_EVENT, listener);
  return () => window.removeEventListener(SYNC_STATUS_EVENT, listener);
}

export function getAllPendingSyncJobs(): PendingSyncJob[] {
  return Object.entries(readPendingMap()).map(([storeId, jobId]) => ({
    storeId,
    jobId,
  }));
}

export function getPendingSyncJob(storeId: string): PendingSyncJob | null {
  const jobId = readPendingMap()[storeId];
  return jobId ? { storeId, jobId } : null;
}

export function hasPendingSyncJobs(): boolean {
  return getAllPendingSyncJobs().length > 0;
}

export function setPendingSyncJob(storeId: string, jobId: string): void {
  const map = readPendingMap();
  map[storeId] = jobId;
  writePendingMap(map);
}

export function clearPendingSyncJob(storeId: string): void {
  const map = readPendingMap();
  if (!(storeId in map)) return;
  delete map[storeId];
  writePendingMap(map);
}
