import NetInfo from '@react-native-community/netinfo'

import { ensureAnonymousSession } from '@/services/appwrite/authService'

import {
  deleteSyncItem,
  getPendingSyncItems,
  incrementRetryCount,
  SyncQueueItem,
} from '../storage/syncQueueService'

const SYNC_INTERVAL_MS = 5 * 60 * 1000

let syncInterval: ReturnType<typeof setInterval> | null = null
let isSyncing = false

export async function syncToCloud(): Promise<void> {
  if (isSyncing) return
  isSyncing = true

  try {
    const netState = await NetInfo.fetch()
    if (!netState.isConnected) {
      return
    }

    await ensureAnonymousSession()
    const pending = await getPendingSyncItems()

    for (const item of pending) {
      await processQueueItem(item)
    }
  } finally {
    isSyncing = false
  }
}

export async function syncFromCloud(): Promise<void> {
  const netState = await NetInfo.fetch()
  if (!netState.isConnected) {
    return
  }

  await ensureAnonymousSession()
  // TODO: Implement downloading Appwrite changes into SQLite
  console.info('[sync] syncFromCloud is not implemented yet')
}

export function scheduleSyncJob(intervalMs = SYNC_INTERVAL_MS): void {
  if (syncInterval) return

  syncInterval = setInterval(() => {
    void syncToCloud()
  }, intervalMs)
}

export function cancelSyncJob(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

async function processQueueItem(item: SyncQueueItem) {
  try {
    // TODO: Replace with real Appwrite mutation logic.
    console.info('[sync] Placeholder upload for item', item.itemId)
    await deleteSyncItem(item.itemId)
  } catch (error) {
    console.warn('[sync] Failed to process queue item', item.itemId, error)
    await incrementRetryCount(item.itemId)
  }
}

export function handleConflicts<T>(local: T, remote: T): T {
  // Last-write-wins placeholder – can be enhanced later
  return remote ?? local
}

