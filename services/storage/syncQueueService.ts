import { ensureDatabaseInitialized, queryAll, runStatement } from './localDatabase'

export interface SyncQueueItem<TPayload = unknown> {
  itemId: string
  entityType: 'employee' | 'schedule' | 'history'
  operation: 'create' | 'update' | 'delete'
  payload: TPayload
  timestamp: string
  retries: number
}

const mapQueueItem = (row: any): SyncQueueItem => ({
  itemId: row.item_id,
  entityType: row.entity_type,
  operation: row.operation,
  payload: JSON.parse(row.payload),
  timestamp: row.timestamp,
  retries: row.retries,
})

interface EnqueueParams<TPayload> {
  itemId: string
  entityType: SyncQueueItem['entityType']
  operation: SyncQueueItem['operation']
  payload: TPayload
  timestamp?: string
}

export async function enqueueSyncItem<TPayload = unknown>(
  params: EnqueueParams<TPayload>,
): Promise<void> {
  await ensureDatabaseInitialized()
  const timestamp = params.timestamp ?? new Date().toISOString()
  await runStatement(
    `INSERT OR REPLACE INTO sync_queue (
      item_id,
      entity_type,
      operation,
      payload,
      timestamp,
      retries
    ) VALUES (?, ?, ?, ?, ?, COALESCE(
      (SELECT retries FROM sync_queue WHERE item_id = ?), 0
    ))`,
    [
      params.itemId,
      params.entityType,
      params.operation,
      JSON.stringify(params.payload),
      timestamp,
      params.itemId,
    ],
  )
}

export async function getPendingSyncItems(limit = 20): Promise<SyncQueueItem[]> {
  await ensureDatabaseInitialized()
  const rows = await queryAll(
    `SELECT * FROM sync_queue
      ORDER BY timestamp ASC
      LIMIT ?`,
    [limit],
  )
  return rows.map(mapQueueItem)
}

export async function deleteSyncItem(itemId: string): Promise<void> {
  await ensureDatabaseInitialized()
  await runStatement('DELETE FROM sync_queue WHERE item_id = ?', [itemId])
}

export async function incrementRetryCount(itemId: string): Promise<void> {
  await ensureDatabaseInitialized()
  await runStatement(
    `UPDATE sync_queue
      SET retries = retries + 1
      WHERE item_id = ?`,
    [itemId],
  )
}

