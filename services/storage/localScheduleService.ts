import type { ScheduleRow } from '@/types/database'
import { dbBoolToBoolean, booleanToDbBool } from '@/types/database'

import { ensureDatabaseInitialized, queryAll, runStatement } from './localDatabase'

export interface ScheduleRecord<TAssignments = unknown> {
  scheduleId: string
  weekStarting: string
  weekEnding: string
  dailySchedules: TAssignments
  fairnessScore: number | null
  validated: boolean
  createdAt: string
  updatedAt: string
}

const mapSchedule = (row: ScheduleRow): ScheduleRecord => ({
  scheduleId: row.schedule_id,
  weekStarting: row.week_starting,
  weekEnding: row.week_ending,
  dailySchedules: JSON.parse(row.daily_schedules),
  fairnessScore: row.fairness_score,
  validated: dbBoolToBoolean(row.validated),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function getScheduleByWeek(weekStarting: string): Promise<ScheduleRecord | null> {
  await ensureDatabaseInitialized()
  const rows = await queryAll<ScheduleRow>('SELECT * FROM schedules WHERE week_starting = ? LIMIT 1', [
    weekStarting,
  ])
  if (!rows.length) return null
  return mapSchedule(rows[0])
}

interface SaveScheduleInput<TAssignments> {
  scheduleId: string
  weekStarting: string
  weekEnding: string
  dailySchedules: TAssignments
  fairnessScore?: number | null
  validated?: boolean
  createdAt?: string
  updatedAt?: string
}

export async function saveSchedule<TAssignments = unknown>(
  schedule: SaveScheduleInput<TAssignments>,
): Promise<void> {
  await ensureDatabaseInitialized()
  const now = new Date().toISOString()
  const createdAt = schedule.createdAt ?? now
  const updatedAt = schedule.updatedAt ?? now

  await runStatement(
    `INSERT OR REPLACE INTO schedules (
      schedule_id,
      week_starting,
      week_ending,
      daily_schedules,
      fairness_score,
      validated,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schedule.scheduleId,
      schedule.weekStarting,
      schedule.weekEnding,
      JSON.stringify(schedule.dailySchedules),
      schedule.fairnessScore ?? null,
      booleanToDbBool(schedule.validated ?? false),
      createdAt,
      updatedAt,
    ],
  )
}

export async function getRecentSchedules(limit = 3): Promise<ScheduleRecord[]> {
  await ensureDatabaseInitialized()
  const rows = await queryAll<ScheduleRow>('SELECT * FROM schedules ORDER BY week_starting DESC LIMIT ?', [
    limit,
  ])
  return rows.map(mapSchedule)
}

