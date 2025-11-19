import type { DailySchedule, Employee, ShiftAssignment, ShiftType } from '@/types'

import type { OffDayMap } from './offDayAssigner'
import { isWeekend } from './weekUtils'
import { getShiftCategory } from './shiftCategoryUtils'

interface FairnessInput {
  employees: Employee[]
  dailySchedules: DailySchedule[]
  offDayMap: OffDayMap
}

export function calculateFairnessScore(input: FairnessInput): number {
  const shiftBalance = calculateShiftBalanceScore(input)
  const weekendFairness = calculateWeekendFairnessScore(input)
  const patternDiversity = calculatePatternDiversityScore(input)

  const score =
    shiftBalance * 0.3 + weekendFairness * 0.4 + patternDiversity * 0.3

  return Math.round(Math.max(0, Math.min(100, score)))
}

function calculateShiftBalanceScore({ employees, dailySchedules }: FairnessInput): number {
  if (!employees.length) return 100

  const scores = employees.map((employee) => {
    const historyShifts = employee.history?.flatMap((entry) => entry.shifts) ?? []
    const currentShifts = getAssignmentsForEmployee(dailySchedules, employee.id)
    const combined = [...historyShifts, ...currentShifts]

    const { early, late } = combined.reduce(
      (acc, shift) => {
        const category = getShiftCategory(shift.shift as ShiftType)
        if (category === 'EARLY') {
          acc.early += 1
        } else if (category === 'LATE') {
          acc.late += 1
        }
        return acc
      },
      { early: 0, late: 0 },
    )

    const total = early + late
    if (!total) return 100
    const deviation = Math.abs(early - late) / total
    return Math.max(0, 100 - deviation * 100)
  })

  return average(scores)
}

function calculateWeekendFairnessScore({ employees, offDayMap }: FairnessInput): number {
  if (!employees.length) return 100

  const counts = employees.map((employee) => {
    const historyCount = employee.history?.reduce((total, entry) => total + (entry.weekendOffs ?? 0), 0) ?? 0
    const currentOffs = offDayMap.get(employee.id) ?? []
    const currentWeekend = currentOffs.filter((date) => isWeekend(date)).length
    return historyCount + currentWeekend
  })

  const mean = average(counts)
  const variance = counts.reduce((acc, count) => acc + (count - mean) ** 2, 0) / employees.length

  return clamp(100 - variance * 5, 0, 100)
}

function calculatePatternDiversityScore({ employees, offDayMap, dailySchedules }: FairnessInput): number {
  if (!employees.length) return 100

  const penalties = employees.map((employee) => {
    const offPattern = (offDayMap.get(employee.id) ?? []).slice().sort().join('|')
    const historyPatterns =
      employee.history?.map((entry) => [...entry.offDays].sort().join('|')) ?? []

    const repeats = historyPatterns.filter((pattern) => pattern === offPattern).length

    const currentAssignments = getAssignmentsForEmployee(dailySchedules, employee.id)
    const hasRepeatedShift =
      currentAssignments.length > 3 &&
      new Set(currentAssignments.map((assignment) => assignment.shift)).size === 1

    let penalty = repeats * 10
    if (hasRepeatedShift) {
      penalty += 15
    }

    return Math.min(40, penalty)
  })

  const averagePenalty = average(penalties)
  return clamp(100 - averagePenalty, 0, 100)
}

function getAssignmentsForEmployee(dailySchedules: DailySchedule[], employeeId: string): ShiftAssignment[] {
  return dailySchedules.flatMap((day) =>
    day.assignments.filter((assignment) => assignment.employeeId === employeeId),
  )
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

