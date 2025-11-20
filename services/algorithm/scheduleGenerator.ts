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
  const maxAttempts = options.maxAttempts ?? 5 // Increased from 3

  const availableEmployees = employees.filter((employee) => !employee.isOnLeave)
  if (!availableEmployees.length) {
    throw new Error('No available employees to schedule')
  }

  const weekEnding = formatISO(addDays(parseISO(weekStarting), 6), { representation: 'date' })

  let bestSchedule: Schedule | null = null
  let bestScore = 0

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Vary the seed to get different off-day patterns
    const seed = attempt + 1 + Math.random() * 0.1
    const offDayMap = assignOffDays(availableEmployees, weekStarting, seed)
    const dailySchedules = assignShifts(availableEmployees, offDayMap, weekStarting)
    const validated = validateCoverage(dailySchedules)
    const fairnessScore = calculateFairnessScore({
      employees: availableEmployees,
      dailySchedules,
      offDayMap,
    })

    const schedule: Schedule = {
      id: scheduleId,
      weekStarting,
      weekEnding,
      dailySchedules,
      fairnessScore,
      validated,
    }

    // Track best schedule found
    if (fairnessScore > bestScore) {
      bestScore = fairnessScore
      bestSchedule = schedule
    }

    // Accept excellent schedules immediately
    if (fairnessScore >= 85 && validated) {
      return schedule
    }

    // Accept good schedules after first attempt
    if (fairnessScore >= 75 && validated && attempt >= 1) {
      return schedule
    }

    // Accept fair schedules after third attempt
    if (fairnessScore >= 70 && validated && attempt >= 2) {
      return schedule
    }
  }

  // Return best schedule found, even if below ideal threshold
  if (bestSchedule) {
    return bestSchedule
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

