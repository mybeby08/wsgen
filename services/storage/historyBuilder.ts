import { addDays, getDay, parseISO } from 'date-fns'
import type { Schedule, ShiftAssignment } from '@/types'
import { saveHistoryRecord } from './localHistoryService'

/**
 * Builds and saves history records for all employees from a generated schedule.
 * This populates the 6-week rolling history used for statistics and fairness calculations.
 */
export async function buildHistoryFromSchedule(schedule: Schedule): Promise<void> {
  const employeeMap = new Map<string, { shifts: ShiftAssignment[]; offDays: string[]; weekendOffs: number }>()

  // Aggregate shifts and off days per employee
  schedule.dailySchedules.forEach((daily) => {
    daily.assignments.forEach((assignment) => {
      if (!employeeMap.has(assignment.employeeId)) {
        employeeMap.set(assignment.employeeId, { shifts: [], offDays: [], weekendOffs: 0 })
      }

      const record = employeeMap.get(assignment.employeeId)!

      if (assignment.shift === 'OFF') {
        record.offDays.push(daily.date)
        const dayOfWeek = getDay(parseISO(daily.date))
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          record.weekendOffs += 1
        }
      } else {
        record.shifts.push(assignment)
      }
    })
  })

  // Save history records for each employee
  const promises = Array.from(employeeMap.entries()).map(([employeeId, data]) =>
    saveHistoryRecord({
      historyId: `${schedule.id}-${employeeId}`,
      employeeId,
      weekEnding: schedule.weekEnding,
      shifts: data.shifts,
      offDays: data.offDays,
      weekendOffs: data.weekendOffs,
    }),
  )

  await Promise.all(promises)
}

