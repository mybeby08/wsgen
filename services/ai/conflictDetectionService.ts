/**
 * Conflict Detection Service
 * Detects potential scheduling conflicts and issues
 */

import type { Schedule, Employee } from '@/types'
import { ErrorLogger } from '@/lib/errors'

/**
 * Extract first name from "LastName, FirstName" format
 */
function getFirstName(fullName: string): string {
  if (fullName.includes(',')) {
    const parts = fullName.split(',')
    return parts[1]?.trim() || fullName
  }
  return fullName
}

export interface ScheduleConflict {
  type: 'consecutive_days' | 'uneven_distribution' | 'shift_variety' | 'coverage_gap'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  affectedEmployees: string[]
  suggestion: string
}

/**
 * Detect potential conflicts in a schedule
 */
export function detectScheduleConflicts(
  schedule: Schedule,
  employees: Employee[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []

  // Check for consecutive work days
  conflicts.push(...detectConsecutiveDays(schedule))

  // Check for uneven shift distribution
  conflicts.push(...detectUnevenDistribution(schedule))

  // Check for lack of shift variety
  conflicts.push(...detectLackOfVariety(schedule))

  // Check for coverage gaps
  conflicts.push(...detectCoverageGaps(schedule))

  return conflicts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * Detect employees working too many consecutive days
 */
function detectConsecutiveDays(schedule: Schedule): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const employeeWorkDays = new Map<string, Set<string>>()

  // Build map of employee work days
  schedule.dailySchedules.forEach((day) => {
    day.assignments.forEach((assignment) => {
      const name = assignment.employeeName || assignment.employeeId
      if (!employeeWorkDays.has(name)) {
        employeeWorkDays.set(name, new Set())
      }
      employeeWorkDays.get(name)!.add(day.date)
    })
  })

  // Check for 6+ consecutive days
  employeeWorkDays.forEach((days, employeeName) => {
    const firstName = getFirstName(employeeName)
    if (days.size >= 6) {
      conflicts.push({
        type: 'consecutive_days',
        severity: days.size >= 7 ? 'high' : 'medium',
        title: 'Excessive Consecutive Days',
        description: `${firstName} works ${days.size} days this week without a break`,
        affectedEmployees: [firstName],
        suggestion: `Consider giving ${firstName} at least one day off to prevent burnout`,
      })
    }
  })

  return conflicts
}

/**
 * Detect uneven shift distribution
 */
function detectUnevenDistribution(schedule: Schedule): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const employeeShiftCounts = new Map<string, number>()

  // Count shifts per employee
  schedule.dailySchedules.forEach((day) => {
    day.assignments.forEach((assignment) => {
      const name = assignment.employeeName || assignment.employeeId
      const count = employeeShiftCounts.get(name) ?? 0
      employeeShiftCounts.set(name, count + 1)
    })
  })

  const counts = Array.from(employeeShiftCounts.values())
  const max = Math.max(...counts)
  const min = Math.min(...counts)
  const difference = max - min

  if (difference >= 3) {
    const maxEmployees = Array.from(employeeShiftCounts.entries())
      .filter(([_, count]) => count === max)
      .map(([name]) => getFirstName(name))

    const minEmployees = Array.from(employeeShiftCounts.entries())
      .filter(([_, count]) => count === min)
      .map(([name]) => getFirstName(name))

    conflicts.push({
      type: 'uneven_distribution',
      severity: difference >= 4 ? 'high' : 'medium',
      title: 'Uneven Shift Distribution',
      description: `${maxEmployees.join(', ')} has ${max} shifts while ${minEmployees.join(', ')} has only ${min}`,
      affectedEmployees: [...maxEmployees, ...minEmployees],
      suggestion: 'Consider redistributing shifts to improve fairness',
    })
  }

  return conflicts
}

/**
 * Detect employees with no shift variety
 */
function detectLackOfVariety(schedule: Schedule): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const employeeShifts = new Map<string, Set<string>>()

  // Track unique shifts per employee
  schedule.dailySchedules.forEach((day) => {
    day.assignments.forEach((assignment) => {
      const name = assignment.employeeName || assignment.employeeId
      if (!employeeShifts.has(name)) {
        employeeShifts.set(name, new Set())
      }
      employeeShifts.get(name)!.add(assignment.shift)
    })
  })

  // Check for employees with only one shift type (3+ days)
  employeeShifts.forEach((shifts, employeeName) => {
    const firstName = getFirstName(employeeName)
    const employeeDays = schedule.dailySchedules.filter((day) =>
      day.assignments.some((a) => (a.employeeName || a.employeeId) === employeeName)
    ).length

    if (shifts.size === 1 && employeeDays >= 3) {
      conflicts.push({
        type: 'shift_variety',
        severity: 'low',
        title: 'Limited Shift Variety',
        description: `${firstName} works only ${Array.from(shifts)[0]} shifts all week (${employeeDays} days)`,
        affectedEmployees: [firstName],
        suggestion: 'Consider mixing shift types for better experience',
      })
    }
  })

  return conflicts
}

/**
 * Detect days with potential coverage gaps
 */
function detectCoverageGaps(schedule: Schedule): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []

  schedule.dailySchedules.forEach((day) => {
    if (day.assignments.length < 7) {
      conflicts.push({
        type: 'coverage_gap',
        severity: day.assignments.length < 5 ? 'high' : 'medium',
        title: 'Low Coverage',
        description: `${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })} has only ${day.assignments.length} shifts assigned`,
        affectedEmployees: [],
        suggestion: 'Add more shifts or adjust existing assignments',
      })
    }
  })

  return conflicts
}

/**
 * Get a summary count of conflicts by severity
 */
export function getConflictSummary(
  conflicts: ScheduleConflict[]
): Record<'high' | 'medium' | 'low', number> {
  return {
    high: conflicts.filter((c) => c.severity === 'high').length,
    medium: conflicts.filter((c) => c.severity === 'medium').length,
    low: conflicts.filter((c) => c.severity === 'low').length,
  }
}
