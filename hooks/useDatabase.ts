import { useSQLiteContext } from 'expo-sqlite'

/**
 * Custom hook for database operations.
 * Uses expo-sqlite context for local-first architecture.
 */
export function useDatabase() {
  const db = useSQLiteContext()

  return {
    db,
    /**
     * Execute a SQL query and return all results.
     */
    async queryAll<T = Record<string, unknown>>(
      sql: string,
      params: (string | number | null)[] = [],
    ): Promise<T[]> {
      const result = await db.getAllAsync<T>(sql, params)
      return result ?? []
    },

    /**
     * Execute a SQL statement (INSERT, UPDATE, DELETE).
     */
    async runStatement(
      sql: string,
      params: (string | number | null)[] = [],
    ): Promise<{ rowsAffected: number }> {
      const result = await db.runAsync(sql, params)
      return { rowsAffected: result.changes }
    },
  }
}
