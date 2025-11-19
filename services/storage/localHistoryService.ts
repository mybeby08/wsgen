import { ensureDatabaseInitialized, queryAll, runStatement } from './localDatabase'

export interface HistoryRecord<TShift = unknown> {
  historyId: string
  employeeId: string
  weekEnding: string
  shifts: TShift
  offDays: string[]
  weekendOffs: number
  updatedAt: string
}

const mapHistory = (row: any): HistoryRecord => ({
  historyId: row.history_id,
  employeeId: row.employee_id,
  weekEnding: row.week_ending,
  shifts: JSON.parse(row.shifts),
  offDays: JSON.parse(row.off_days),
  weekendOffs: row.weekend_offs,
  updatedAt: row.updated_at,
})

export async function getHistoryForEmployee(
  employeeId: string,
  weeks = 6,
): Promise<HistoryRecord[]> {
  await ensureDatabaseInitialized()
  const rows = await queryAll(
    `SELECT * FROM history
      WHERE employee_id = ?
      ORDER BY week_ending DESC
      LIMIT ?`,
    [employeeId, weeks],
  )
  return rows.map(mapHistory)
}

interface SaveHistoryInput<TShift> {
  historyId: string
  employeeId: string
  weekEnding: string
  shifts: TShift
  offDays: string[]
  weekendOffs: number
  updatedAt?: string
}

export async function saveHistoryRecord<TShift = unknown>(
  entry: SaveHistoryInput<TShift>,
): Promise<void> {
  await ensureDatabaseInitialized()
  const updatedAt = entry.updatedAt ?? new Date().toISOString()
  await runStatement(
    `INSERT OR REPLACE INTO history (
      history_id,
      employee_id,
      week_ending,
      shifts,
      off_days,
      weekend_offs,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.historyId,
      entry.employeeId,
      entry.weekEnding,
      JSON.stringify(entry.shifts),
      JSON.stringify(entry.offDays),
      entry.weekendOffs,
      updatedAt,
    ],
  )
}

export async function pruneHistory(maxWeeks = 6): Promise<void> {
  await ensureDatabaseInitialized()
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - maxWeeks * 7)
  const thresholdIso = threshold.toISOString()

  await runStatement('DELETE FROM history WHERE week_ending < ?', [thresholdIso])
}

