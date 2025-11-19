import type { DailySchedule, Employee, ShiftAssignment, ShiftType } from '@/types'

import type { OffDayMap } from './offDayAssigner'
import { getWeekDates } from './weekUtils'
import type { ShiftCategory } from '@/services/storage/localShiftMetaService'
import { getGenerationShiftPools, getShiftCategory } from './shiftCategoryUtils'

interface ShiftRequirement {
  category: ShiftCategory
}

type ShiftStats = Record<string, { early: number; late: number }>

const BASE_REQUIREMENTS: ShiftRequirement[] = [
  { category: 'EARLY' },
  { category: 'EARLY' },
  { category: 'EARLY' },
  { category: 'EARLY' },
  { category: 'LATE' },
  { category: 'LATE' },
  { category: 'LATE' },
  { category: 'LATE' },
]

const LOW_STAFF_REQUIREMENTS: ShiftRequirement[] = [
  { category: 'EARLY' },
  { category: 'EARLY' },
  { category: 'EARLY' },
  { category: 'LATE' },
  { category: 'LATE' },
  { category: 'LATE' },
  { category: 'LATE' },
]

export function assignShifts(
  employees: Employee[],
  offDayMap: OffDayMap,
  weekStarting: string,
): DailySchedule[] {
  const weekDates = getWeekDates(weekStarting)
  const stats = initializeShiftStats(employees)
  const schedules: DailySchedule[] = []
  const { early, late } = getGenerationShiftPools()

  let earlyIndex = 0
  let lateIndex = 0

  for (const date of weekDates) {
    const availableEmployees = employees.filter((employee) => {
      if (employee.isOnLeave) return false
      const offDays = offDayMap.get(employee.id) ?? []
      return !offDays.includes(date)
    })

    const requirements = buildShiftPlan(availableEmployees.length)
    const assignments = fillDailyAssignments(
      date,
      requirements,
      availableEmployees,
      stats,
      {
        early,
        late,
        getNextEarlyIndex: () => {
          const current = earlyIndex
          earlyIndex = (earlyIndex + 1) % Math.max(early.length, 1)
          return current
        },
        getNextLateIndex: () => {
          const current = lateIndex
          lateIndex = (lateIndex + 1) % Math.max(late.length, 1)
          return current
        },
      },
    )
    schedules.push({ date, assignments })
  }

  return schedules
}

function initializeShiftStats(employees: Employee[]): ShiftStats {
  return employees.reduce<ShiftStats>((acc, employee) => {
    const historyShifts = employee.history?.flatMap((entry) => entry.shifts) ?? []
    const { early, late } = historyShifts.reduce(
      (stats, shift) => {
        const category = getShiftCategory(shift.shift as ShiftType)
        if (category === 'EARLY') {
          stats.early += 1
        } else if (category === 'LATE') {
          stats.late += 1
        }
        return stats
      },
      { early: 0, late: 0 },
    )

    acc[employee.id] = { early, late }
    return acc
  }, {})
}

function buildShiftPlan(availableCount: number): ShiftRequirement[] {
  if (availableCount <= 0) return []

  let earlyCount: number
  let lateCount: number

  if (availableCount <= 8) {
    // For small/normal teams, keep strong late coverage:
    // at least 4 LATE (or as many as employees if <4).
    lateCount = Math.min(4, availableCount)
    earlyCount = Math.max(0, availableCount - lateCount)
  } else {
    // For larger teams, roughly balance EARLY and LATE.
    // Give LATE the extra person when odd to slightly
    // favour late coverage.
    lateCount = Math.ceil(availableCount / 2)
    earlyCount = availableCount - lateCount
  }

  const requirements: ShiftRequirement[] = []
  for (let i = 0; i < earlyCount; i += 1) {
    requirements.push({ category: 'EARLY' })
  }
  for (let i = 0; i < lateCount; i += 1) {
    requirements.push({ category: 'LATE' })
  }
  return requirements
}

function fillDailyAssignments(
  date: string,
  requirements: ShiftRequirement[],
  availableEmployees: Employee[],
  stats: ShiftStats,
  shiftPools: {
    early: ShiftType[]
    late: ShiftType[]
    getNextEarlyIndex: () => number
    getNextLateIndex: () => number
  },
): ShiftAssignment[] {
  const assignments: ShiftAssignment[] = []
  const assignedEmployeeIds = new Set<string>()

  for (const requirement of requirements) {
    const pool = requirement.category === 'EARLY' ? shiftPools.early : shiftPools.late
    if (!pool.length) continue

    const index =
      requirement.category === 'EARLY'
        ? shiftPools.getNextEarlyIndex()
        : shiftPools.getNextLateIndex()
    const shiftId = pool[index % pool.length]

    const employee = selectEmployeeForShift(shiftId, availableEmployees, assignedEmployeeIds, stats)
    if (!employee) {
      continue
    }

    assignedEmployeeIds.add(employee.id)
    updateShiftStats(stats, employee.id, shiftId)

    assignments.push({
      employeeId: employee.id,
      shift: shiftId,
      scannerId: (assignments.length % 4) + 1,
    })
  }

  return assignments
}

function selectEmployeeForShift(
  shift: ShiftType,
  candidates: Employee[],
  assigned: Set<string>,
  stats: ShiftStats,
): Employee | undefined {
  const pool = candidates.filter((candidate) => !assigned.has(candidate.id))

  const scored = pool
    .map((employee) => ({
      employee,
      score: getShiftScore(employee.id, shift, stats),
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.employee
}

function getShiftScore(employeeId: string, shift: ShiftType, stats: ShiftStats): number {
  const { early, late } = stats[employeeId] ?? { early: 0, late: 0 }

  const category = getShiftCategory(shift)
  if (category === 'EARLY') {
    return late - early
  }
  if (category === 'LATE') {
    return early - late
  }

  // Default: prefer balanced employees
  return -Math.abs(early - late)
}

function updateShiftStats(stats: ShiftStats, employeeId: string, shift: ShiftType): void {
  const record = stats[employeeId]
  if (!record) return

  const category = getShiftCategory(shift)
  if (category === 'EARLY') {
    record.early += 1
  } else if (category === 'LATE') {
    record.late += 1
  }
}
