import { addDays, formatISO, parseISO } from 'date-fns'

import type { DailySchedule, Employee, Schedule } from '@/types'

import { getScheduleInsights } from '@/services/ai/scheduleInsightsService'

import { calculateFairnessScore } from './fairnessCalculator'
import { assignOffDays } from './offDayAssigner'
import { assignShifts } from './shiftAssigner'

interface GenerateScheduleOptions {
  employees: Employee[]
  weekStarting: string
  scheduleId?: string
  maxAttempts?: number
}

export function generateBaseSchedule(options: GenerateScheduleOptions): Schedule {
  const { employees, weekStarting } = options
  const scheduleId = options.scheduleId ?? `schedule-${weekStarting}`
  const maxAttempts = options.maxAttempts ?? 3

  const availableEmployees = employees.filter((employee) => !employee.isOnLeave)
  if (!availableEmployees.length) {
    throw new Error('No available employees to schedule')
  }

  const weekEnding = formatISO(addDays(parseISO(weekStarting), 6), { representation: 'date' })

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const offDayMap = assignOffDays(availableEmployees, weekStarting, attempt + 1)
    const dailySchedules = assignShifts(availableEmployees, offDayMap, weekStarting)
    const validated = validateCoverage(dailySchedules)
    const fairnessScore = calculateFairnessScore({
      employees: availableEmployees,
      dailySchedules,
      offDayMap,
    })

    if (fairnessScore < 70 && attempt < maxAttempts - 1) {
      continue
    }

    return {
      id: scheduleId,
      weekStarting,
      weekEnding,
      dailySchedules,
      fairnessScore,
      validated,
    }
  }

  throw new Error('Unable to generate a valid schedule after multiple attempts')
}

function validateCoverage(schedules: DailySchedule[]): boolean {
  return schedules.every((schedule) => schedule.assignments.length >= 7)
}

export async function generateScheduleWithAiSuggestions(
  options: GenerateScheduleOptions,
): Promise<Schedule> {
  const schedule = generateBaseSchedule(options)
  const suggestions = await getScheduleInsights(schedule)
  if (suggestions.length) {
    return { ...schedule, aiSuggestions: suggestions }
  }
  return schedule
}

