export type ShiftType = string

export interface ShiftAssignment {
  employeeId: string
  shift: ShiftType | 'OFF'
  scannerId?: number
  employeeName?: string
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

export interface AICacheData {
  conflicts?: any[]
  queryResponses?: Record<string, any>
  explanation?: any
  timestamp?: string
}

export interface Schedule {
  id: string
  weekStarting: string
  weekEnding: string
  dailySchedules: DailySchedule[]
  fairnessScore: number
  validated: boolean
  aiSuggestions?: AISuggestion[]
  aiCache?: AICacheData
}

