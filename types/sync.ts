export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  pendingCount: number
}

