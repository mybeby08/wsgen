import { getHistoryForEmployee, type HistoryRecord } from './localHistoryService'
import type { ShiftAssignment, ShiftType } from '@/types'
import { getShiftCategory } from '@/services/algorithm/shiftCategoryUtils'

export interface EmployeeStats {
  employeeId: string
  totalShifts: number
  totalOffDays: number
  totalWeekendOffs: number
  earlyMorning: number
  morning: number
  midDay: number
  late: number
  earlyShifts: number // EARLY_MORNING + MORNING
  lateShifts: number // MID_DAY + LATE
  weeksTracked: number
}

export async function getEmployeeStats(employeeId: string, weeks = 6): Promise<EmployeeStats> {
  const history = await getHistoryForEmployee(employeeId, weeks)

  if (!history.length) {
    return {
      employeeId,
      totalShifts: 0,
      totalOffDays: 0,
      totalWeekendOffs: 0,
      earlyMorning: 0,
      morning: 0,
      midDay: 0,
      late: 0,
      earlyShifts: 0,
      lateShifts: 0,
      weeksTracked: 0,
    }
  }

  const stats = {
    employeeId,
    totalShifts: 0,
    totalOffDays: 0,
    totalWeekendOffs: 0,
    earlyMorning: 0,
    morning: 0,
    midDay: 0,
    late: 0,
    earlyShifts: 0,
    lateShifts: 0,
    weeksTracked: history.length,
  }

  history.forEach((record) => {
    stats.totalOffDays += record.offDays.length
    stats.totalWeekendOffs += record.weekendOffs

    const shifts = (record.shifts as ShiftAssignment[]) ?? []
    shifts.forEach((shift) => {
      if (shift.shift === 'OFF') return

      stats.totalShifts += 1

      // Preserve legacy per-shift counters for compatibility
      switch (shift.shift) {
        case 'EARLY_MORNING':
          stats.earlyMorning += 1
          break
        case 'MORNING':
          stats.morning += 1
          break
        case 'MID_DAY':
          stats.midDay += 1
          break
        case 'LATE':
          stats.late += 1
          break
      }

      // Aggregate early/late buckets based on category
      const category = getShiftCategory(shift.shift as ShiftType)
      if (category === 'EARLY') {
        stats.earlyShifts += 1
      } else if (category === 'LATE') {
        stats.lateShifts += 1
      }
    })
  })

  return stats
}

export async function getAllEmployeeStats(weeks = 6): Promise<EmployeeStats[]> {
  // This would require querying all employees first, then calculating stats
  // For now, return empty array – caller should use getEmployeeStats per employee
  return []
}

