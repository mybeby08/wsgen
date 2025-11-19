import type { ShiftAssignment } from './schedule'

export interface EmployeeHistory {
  weekEnding: string
  shifts: ShiftAssignment[]
  offDays: string[]
  weekendOffs: number
}

export interface Employee {
  id: string
  name: string
  isOnLeave: boolean
  history: EmployeeHistory[]
}

