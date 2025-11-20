import { createClient, type Client } from '@libsql/client/web'

import { ENV } from '@/constants/config'

type SQLiteBindParams = (string | number | null)[]

interface SQLiteRunResult {
  rowsAffected: number
}

let client: Client | null = null
let initialized = false

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
      ai_cache TEXT,
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

function getDatabase(): Client {
  if (!client) {
    const url = ENV.TURSO_DB_URL
    const authToken = ENV.TURSO_DB_AUTH_TOKEN

    if (!url) {
      throw new Error(
        'Turso database URL not configured. Set TURSO_DB_URL in environment variables.',
      )
    }

    client = createClient({ url, authToken })
  }

  return client
}

export async function initDatabase(): Promise<void> {
  const db = getDatabase()
  for (const statement of TABLE_CREATE_STATEMENTS) {
    await db.execute(statement)
  }
  initialized = true
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (!initialized) {
    await initDatabase()
  }
}

export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<T[]> {
  const db = getDatabase()
  const result = await db.execute({ sql, args: params })
  return (result.rows ?? []) as T[]
}

export async function runStatement(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<SQLiteRunResult> {
  const db = getDatabase()
  const result = await db.execute({ sql, args: params })
  return { 
    rowsAffected: typeof result.rowsAffected === 'number' ? result.rowsAffected : 0 
  }
}
