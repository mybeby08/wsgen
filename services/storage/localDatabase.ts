import type { SQLiteDatabase } from 'expo-sqlite'
import { createClient, type Client } from '@libsql/client/web'
import Constants from 'expo-constants'

type SQLiteBindParams = (string | number | null)[]

// Global database reference for non-React contexts (Zustand stores, services)
let dbInstance: SQLiteDatabase | null = null

interface SQLiteRunResult {
  rowsAffected: number
}

interface DatabaseStatus {
  isInitialized: boolean
  isOnline: boolean
  lastSyncTime: number | null
  frameNumber: number | null
}

let client: Client | null = null
let initialized = false
let dbStatus: DatabaseStatus = {
  isInitialized: false,
  isOnline: false,
  lastSyncTime: null,
  frameNumber: null,
}

const TABLE_CREATE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      is_on_leave INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS schedules (
      schedule_id TEXT PRIMARY KEY NOT NULL,
      week_starting TEXT NOT NULL,
      week_ending TEXT NOT NULL,
      daily_schedules TEXT NOT NULL,
      fairness_score INTEGER,
      validated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS history (
      history_id TEXT PRIMARY KEY NOT NULL,
      employee_id TEXT NOT NULL,
      week_ending TEXT NOT NULL,
      shifts TEXT NOT NULL,
      off_days TEXT NOT NULL,
      weekend_offs INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );`,
  `CREATE INDEX IF NOT EXISTS idx_history_employee ON history (employee_id);`,
  `CREATE TABLE IF NOT EXISTS shift_metas (
      shift_id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      category TEXT NOT NULL,
      enabled_for_generation INTEGER NOT NULL DEFAULT 1,
      is_overtime INTEGER NOT NULL DEFAULT 0,
      role TEXT,
      note TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  `CREATE INDEX IF NOT EXISTS idx_schedules_week_starting ON schedules (week_starting);`,
  `CREATE INDEX IF NOT EXISTS idx_schedules_week_ending ON schedules (week_ending);`,
  `CREATE INDEX IF NOT EXISTS idx_employees_name ON employees (name);`,
]


/**
 * Initialize database schema.
 * Called by SQLiteProvider's onInit.
 */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  console.log('[DB] Initializing database schema...')
  
  // Store database instance for non-React contexts
  dbInstance = db
  
  // Create tables if they don't exist (idempotent)
  for (const statement of TABLE_CREATE_STATEMENTS) {
    await db.execAsync(statement)
  }
  
  dbStatus.isInitialized = true
  initialized = true
  
  console.log('[DB] Database schema initialized')
  
  // Try initial sync with Turso (non-blocking)
  void performInitialSync()
}

/**
 * Perform initial sync with Turso remote (non-blocking).
 */
async function performInitialSync(): Promise<void> {
  try {
    console.log('[DB] Attempting initial sync with Turso...')
    const tursoClient = getTursoClient()
    const syncResult = await tursoClient.sync()
    if (syncResult) {
      dbStatus.lastSyncTime = Date.now()
      dbStatus.frameNumber = syncResult.frame_no ?? null
      dbStatus.isOnline = true
      console.log(`[DB] Initial sync complete. Frame: ${dbStatus.frameNumber}`)
    }
  } catch (error) {
    console.warn('[DB] Initial sync failed, continuing in offline mode:', error)
    dbStatus.isOnline = false
  }
}

/**
 * Get Turso client for sync operations only.
 */
function getTursoClient(): Client {
  if (!client) {
    const extra = Constants.expoConfig?.extra ?? {}
    const remoteUrl = (extra.tursoDbUrl as string) || ''
    const authToken = (extra.tursoDbAuthToken as string | undefined) || undefined

    if (!remoteUrl) {
      throw new Error('Turso URL not configured')
    }

    client = createClient({
      url: 'file:wgs.db',
      syncUrl: remoteUrl,
      authToken: authToken,
    })
  }
  return client
}

/**
 * Get database instance for non-React contexts.
 * Throws if database not initialized.
 */
function getDbInstance(): SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Ensure SQLiteProvider is mounted.')
  }
  return dbInstance
}

/**
 * Execute a SQL query and return all results.
 * For use in non-React contexts (Zustand stores, services).
 */
export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<T[]> {
  const db = getDbInstance()
  const result = await db.getAllAsync<T>(sql, params)
  return result ?? []
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE).
 * For use in non-React contexts (Zustand stores, services).
 */
export async function runStatement(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<SQLiteRunResult> {
  const db = getDbInstance()
  const result = await db.runAsync(sql, params)
  return { rowsAffected: result.changes }
}

export async function ensureDatabaseInitialized(): Promise<void> {
  // No-op: initialization handled by SQLiteProvider
  return Promise.resolve()
}

/**
 * Manually trigger sync with Turso remote database.
 * Use this when connectivity is restored or user explicitly refreshes.
 */
export async function syncDatabase(): Promise<void> {
  try {
    const tursoClient = getTursoClient()
    console.log('[DB] Manual sync triggered...')
    const syncResult = await tursoClient.sync()
    if (syncResult) {
      dbStatus.lastSyncTime = Date.now()
      dbStatus.frameNumber = syncResult.frame_no ?? null
      dbStatus.isOnline = true
      console.log(`[DB] Manual sync complete. Frame: ${dbStatus.frameNumber}, Frames synced: ${syncResult.frames_synced}`)
    }
  } catch (error) {
    console.error('[DB] Manual sync failed:', error)
    dbStatus.isOnline = false
    throw error
  }
}

/**
 * Get current database status.
 */
export function getDatabaseStatus(): DatabaseStatus {
  return { ...dbStatus }
}
