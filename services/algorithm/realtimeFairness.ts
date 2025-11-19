import { getDay, parseISO } from 'date-fns'
import type { Schedule, ShiftType } from '@/types'
import { getShiftCategory, isOvertimeShiftId } from './shiftCategoryUtils'

export interface FairnessWarning {
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  title: string
  description: string
  affectedEmployees: string[]
}

export interface FairnessResult {
  score: number
  warnings: FairnessWarning[]
}

export function calculateLiveFairness(schedule: Schedule, employeeNames: Record<string, string>): FairnessResult {
  const warnings: FairnessWarning[] = []

  // Calculate shift balance per employee
  const employeeStats = new Map<
    string,
    {
      earlyShifts: number
      lateShifts: number
      totalShifts: number
      offDays: number
      weekendOffs: number
      consecutiveWorking: number
      overtimeShifts: number
    }
  >()

  // Initialize stats
  schedule.dailySchedules[0]?.assignments.forEach((assignment) => {
    employeeStats.set(assignment.employeeId, {
      earlyShifts: 0,
      lateShifts: 0,
      totalShifts: 0,
      offDays: 0,
      weekendOffs: 0,
      consecutiveWorking: 0,
      overtimeShifts: 0,
    })
  })

  // Collect statistics
  schedule.dailySchedules.forEach((day) => {
    const dayOfWeek = getDay(parseISO(day.date))
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    day.assignments.forEach((assignment) => {
      const stats = employeeStats.get(assignment.employeeId)
      if (!stats) return

      if (assignment.shift === 'OFF') {
        stats.offDays++
        if (isWeekend) stats.weekendOffs++
        stats.consecutiveWorking = 0
      } else {
        stats.totalShifts++
        stats.consecutiveWorking++

        const category = getShiftCategory(assignment.shift as ShiftType)
        if (category === 'EARLY') {
          stats.earlyShifts++
        } else if (category === 'LATE') {
          stats.lateShifts++
        }

        if (isOvertimeShiftId(assignment.shift as ShiftType)) {
          stats.overtimeShifts++
        }
      }
    })
  })

  // Check for warnings
  let totalBalance = 0
  let totalWeekendFairness = 0
  let employeeCount = 0

  employeeStats.forEach((stats, employeeId) => {
    const employeeName = employeeNames[employeeId] || employeeId
    employeeCount++

    // Warning: Too many early or late shifts
    if (stats.earlyShifts >= 5) {
      warnings.push({
        severity: 'MEDIUM',
        title: 'Heavy Early Shift Load',
        description: `${employeeName} has ${stats.earlyShifts} early shifts this week`,
        affectedEmployees: [employeeName],
      })
    }

    if (stats.lateShifts >= 5) {
      warnings.push({
        severity: 'MEDIUM',
        title: 'Heavy Late Shift Load',
        description: `${employeeName} has ${stats.lateShifts} late shifts this week`,
        affectedEmployees: [employeeName],
      })
    }

    // Warning: No weekend off
    if (stats.weekendOffs === 0) {
      warnings.push({
        severity: 'HIGH',
        title: 'No Weekend Off',
        description: `${employeeName} works both weekend days`,
        affectedEmployees: [employeeName],
      })
    }

    // Warning: Too many consecutive working days
    if (stats.consecutiveWorking > 5) {
      warnings.push({
        severity: 'HIGH',
        title: 'Excessive Consecutive Days',
        description: `${employeeName} works ${stats.consecutiveWorking} days in a row`,
        affectedEmployees: [employeeName],
      })
    }

    // Calculate balance score
    const total = stats.earlyShifts + stats.lateShifts
    if (total > 0) {
      const deviation = Math.abs(stats.earlyShifts - stats.lateShifts) / total
      totalBalance += 100 - deviation * 100
    }

    // Calculate weekend fairness
    totalWeekendFairness += stats.weekendOffs > 0 ? 100 : 0
  })

  const balanceScore = employeeCount > 0 ? totalBalance / employeeCount : 100
  const weekendScore = employeeCount > 0 ? totalWeekendFairness / employeeCount : 100

  // Overall score (weighted)
  const score = Math.round(balanceScore * 0.4 + weekendScore * 0.6)

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
  }
}

