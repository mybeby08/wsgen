/**
 * Database row types that map to SQL tables
 */

export interface EmployeeRow {
  id: string
  name: string
  is_on_leave: number
  updated_at: string
}

export interface ScheduleRow {
  schedule_id: string
  week_starting: string
  week_ending: string
  daily_schedules: string
  fairness_score: number | null
  validated: number
  created_at: string
  updated_at: string
}

export interface HistoryRow {
  history_id: string
  employee_id: string
  week_ending: string
  shifts: string
  off_days: string
  weekend_offs: number
  updated_at: string
}

export interface ShiftMetaRow {
  shift_id: string
  label: string
  start_time: string
  end_time: string
  category: string
  enabled_for_generation: number
  is_overtime: number
  role: string | null
  note: string | null
  display_order: number
  created_at: string
  updated_at: string
}

/**
 * Type guard to check if a value is a valid number (not NaN or null)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Converts database boolean (0 or 1) to TypeScript boolean
 */
export function dbBoolToBoolean(value: number): boolean {
  return value === 1
}

/**
 * Converts TypeScript boolean to database boolean (0 or 1)
 */
export function booleanToDbBool(value: boolean): number {
  return value ? 1 : 0
}
