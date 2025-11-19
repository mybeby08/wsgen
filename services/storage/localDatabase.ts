import {
  openDatabaseSync,
  type SQLiteBindParams,
  type SQLiteDatabase,
  type SQLiteRunResult,
} from 'expo-sqlite'

const DB_NAME = 'work-schedules.db'

let database: SQLiteDatabase | null = null
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
  `CREATE TABLE IF NOT EXISTS sync_queue (
      item_id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0
    );`,
]

export function getDatabase(): SQLiteDatabase {
  if (!database) {
    database = openDatabaseSync(DB_NAME)
  }
  return database
}

export async function initDatabase(): Promise<void> {
  const db = getDatabase()
  for (const statement of TABLE_CREATE_STATEMENTS) {
    await db.execAsync(statement)
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
  return db.getAllAsync<T>(sql, params)
}

export async function runStatement(
  sql: string,
  params: SQLiteBindParams = [],
): Promise<SQLiteRunResult> {
  const db = getDatabase()
  return db.runAsync(sql, params)
}

