export type ShiftType = 'EARLY_MORNING' | 'MORNING' | 'MID_DAY' | 'LATE'

export interface ShiftAssignment {
  employeeId: string
  shift: ShiftType | 'OFF'
  scannerId?: number
}

export interface DailySchedule {
  date: string
  assignments: ShiftAssignment[]
}

export interface AISuggestion {
  title: string
  description: string
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface Schedule {
  id: string
  weekStarting: string
  weekEnding: string
  dailySchedules: DailySchedule[]
  fairnessScore: number
  validated: boolean
  aiSuggestions?: AISuggestion[]
}

