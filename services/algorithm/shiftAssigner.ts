import type { DailySchedule, Employee, ShiftAssignment, ShiftType } from '@/types'

import type { OffDayMap } from './offDayAssigner'
import { getWeekDates } from './weekUtils'

const EARLY_SHIFTS: ShiftType[] = ['EARLY_MORNING', 'MORNING']
const LATE_SHIFTS: ShiftType[] = ['MID_DAY', 'LATE']

interface ShiftRequirement {
  shift: ShiftType
}

type ShiftStats = Record<string, { early: number; late: number }>

const BASE_REQUIREMENTS: ShiftRequirement[] = [
  { shift: 'EARLY_MORNING' },
  { shift: 'EARLY_MORNING' },
  { shift: 'MORNING' },
  { shift: 'MORNING' },
  { shift: 'MID_DAY' },
  { shift: 'MID_DAY' },
  { shift: 'LATE' },
  { shift: 'LATE' },
]

const LOW_STAFF_REQUIREMENTS: ShiftRequirement[] = [
  { shift: 'EARLY_MORNING' },
  { shift: 'EARLY_MORNING' },
  { shift: 'EARLY_MORNING' },
  { shift: 'MID_DAY' },
  { shift: 'LATE' },
  { shift: 'LATE' },
  { shift: 'LATE' },
]

export function assignShifts(
  employees: Employee[],
  offDayMap: OffDayMap,
  weekStarting: string,
): DailySchedule[] {
  const weekDates = getWeekDates(weekStarting)
  const stats = initializeShiftStats(employees)
  const schedules: DailySchedule[] = []

  for (const date of weekDates) {
    const availableEmployees = employees.filter((employee) => {
      if (employee.isOnLeave) return false
      const offDays = offDayMap.get(employee.id) ?? []
      return !offDays.includes(date)
    })

    const requirements = buildShiftPlan(availableEmployees.length)
    const assignments = fillDailyAssignments(date, requirements, availableEmployees, stats)
    schedules.push({ date, assignments })
  }

  return schedules
}

function initializeShiftStats(employees: Employee[]): ShiftStats {
  return employees.reduce<ShiftStats>((acc, employee) => {
    const historyShifts = employee.history?.flatMap((entry) => entry.shifts) ?? []
    const early = historyShifts.filter((shift) => EARLY_SHIFTS.includes(shift.shift as ShiftType)).length
    const late = historyShifts.filter((shift) => LATE_SHIFTS.includes(shift.shift as ShiftType)).length

    acc[employee.id] = { early, late }
    return acc
  }, {})
}

function buildShiftPlan(availableCount: number): ShiftRequirement[] {
  if (availableCount <= 7) {
    return LOW_STAFF_REQUIREMENTS
  }

  const plan = [...BASE_REQUIREMENTS]
  // If more staff is available, add extra mid-day coverage.
  for (let extra = plan.length; extra < availableCount; extra += 1) {
    plan.push({ shift: 'MID_DAY' })
  }
  return plan
}

function fillDailyAssignments(
  date: string,
  requirements: ShiftRequirement[],
  availableEmployees: Employee[],
  stats: ShiftStats,
): ShiftAssignment[] {
  const assignments: ShiftAssignment[] = []
  const assignedEmployeeIds = new Set<string>()

  for (const requirement of requirements) {
    const employee = selectEmployeeForShift(requirement.shift, availableEmployees, assignedEmployeeIds, stats)
    if (!employee) {
      continue
    }

    assignedEmployeeIds.add(employee.id)
    updateShiftStats(stats, employee.id, requirement.shift)

    assignments.push({
      employeeId: employee.id,
      shift: requirement.shift,
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

  if (EARLY_SHIFTS.includes(shift)) {
    return late - early
  }

  if (LATE_SHIFTS.includes(shift)) {
    return early - late
  }

  // Mid-day shifts prefer overall balance
  return -Math.abs(early - late)
}

function updateShiftStats(stats: ShiftStats, employeeId: string, shift: ShiftType): void {
  const record = stats[employeeId]
  if (!record) return

  if (EARLY_SHIFTS.includes(shift)) {
    record.early += 1
  } else if (LATE_SHIFTS.includes(shift)) {
    record.late += 1
  } else {
    // Treat mid-day as late for balance purposes
    record.late += 1
  }
}

