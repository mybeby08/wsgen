import type { ShiftAssignment } from './schedule'

export interface EmployeeHistory {
  weekEnding: string
  shifts: ShiftAssignment[]
  offDays: string[]
  weekendOffs: number
}

export interface EmployeePreferences {
  preferredOffDays?: number[] // 0-6 for days of week (0 = Sunday)
  blockedDates?: string[]     // Specific dates (ISO format)
  maxConsecutiveDays?: number // Personal limit for consecutive work days
}

export interface Employee {
  id: string
  name: string
  isOnLeave: boolean
  preferences?: EmployeePreferences
  history: EmployeeHistory[]
}

