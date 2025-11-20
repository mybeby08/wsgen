import type { Employee } from '@/types'

import { getWeekDates, isWeekend } from './weekUtils'

export type OffDayMap = Map<string, string[]>

const MIN_ON_DUTY = 7

interface DaySlot {
  date: string
  isWeekend: boolean
  offCount: number
}

export function assignOffDays(
  employees: Employee[],
  weekStarting: string,
  seed = Math.random(),
): OffDayMap {
  const availableEmployees = employees.filter((employee) => !employee.isOnLeave)
  const weekDates = getWeekDates(weekStarting)
  const daySlots = weekDates.map<DaySlot>((date) => ({
    date,
    isWeekend: isWeekend(date),
    offCount: 0,
  }))

  const maxOffPerDay = Math.max(2, availableEmployees.length - MIN_ON_DUTY)

  const assignments: OffDayMap = new Map()
  const prioritized = [...availableEmployees].sort((a, b) => {
    const diff = scoreEmployee(b) - scoreEmployee(a)
    if (diff !== 0) {
      return diff
    }
    // Deterministic tie-breaker using seed
    return seededRandom(seed + a.id.length) - seededRandom(seed + b.id.length)
  })

  for (const employee of prioritized) {
    const preferred = pickOffDays(employee, daySlots, maxOffPerDay)
    assignments.set(employee.id, preferred)
  }

  return assignments
}

function scoreEmployee(employee: Employee): number {
  const history = employee.history ?? []
  const weekendOffs = history.reduce((total, entry) => total + (entry.weekendOffs ?? 0), 0)
  const consecutiveWeekendPenalty = getConsecutiveWeekendPenalty(history)
  const patternPenalty = getPatternPenalty(history)

  const weekendScore = Math.max(0, 12 - weekendOffs * 2)
  return weekendScore - consecutiveWeekendPenalty - patternPenalty
}

function getConsecutiveWeekendPenalty(history: Employee['history']): number {
  if (!history?.length) {
    return 0
  }

  let streak = 0
  let maxStreak = 0

  const sorted = [...history].sort(
    (a, b) => new Date(a.weekEnding).getTime() - new Date(b.weekEnding).getTime(),
  )

  for (const entry of sorted) {
    if (entry.weekendOffs > 0) {
      streak += 1
      maxStreak = Math.max(maxStreak, streak)
    } else {
      streak = 0
    }
  }
  return Math.max(0, (maxStreak - 2) * 2)
}

function getPatternPenalty(history: Employee['history']): number {
  if (!history?.length) {
    return 0
  }

  const patterns = new Map<string, number>()
  for (const entry of history) {
    const normalized = [...entry.offDays].sort().join('|')
    const count = patterns.get(normalized) ?? 0
    patterns.set(normalized, count + 1)
  }

  const maxPatternRepeat = Math.max(...patterns.values())
  return Math.max(0, (maxPatternRepeat - 2) * 1.5)
}

function pickOffDays(employee: Employee, daySlots: DaySlot[], limitPerDay: number): string[] {
  // Check for blocked dates in preferences
  const blockedDates = employee.preferences?.blockedDates ?? []
  const hasBlockedDates = daySlots.some((slot) => blockedDates.includes(slot.date))
  
  if (hasBlockedDates) {
    // If employee has blocked dates, prioritize those for off days
    const blockedSlots = daySlots.filter((slot) => blockedDates.includes(slot.date))
    if (blockedSlots.length >= 2) {
      const dates = blockedSlots.slice(0, 2).map((slot) => slot.date)
      assignPair(dates, daySlots)
      return dates
    } else if (blockedSlots.length === 1) {
      // One blocked date, pair with weekend or adjacent day
      const blockedDate = blockedSlots[0].date
      const otherDate = findBestPairForDate(blockedDate, daySlots, limitPerDay)
      if (otherDate) {
        assignPair([blockedDate, otherDate], daySlots)
        return [blockedDate, otherDate]
      }
    }
  }
  
  const needsWeekend = needsWeekendOff(employee)
  const preferredDays = employee.preferences?.preferredOffDays ?? []
  const candidatePairs = buildCandidatePairs(daySlots, needsWeekend, preferredDays)

  for (const pair of candidatePairs) {
    if (canAssignPair(pair, daySlots, limitPerDay)) {
      assignPair(pair, daySlots)
      return pair
    }
  }

  return assignHighestCapacityDays(daySlots, limitPerDay)
}

function needsWeekendOff(employee: Employee): boolean {
  const history = employee.history ?? []
  if (!history.length) {
    return true
  }

  const recentEntries = history.slice(0, 6)
  const weekendCount = recentEntries.reduce((total, entry) => total + (entry.weekendOffs ?? 0), 0)
  return weekendCount < 2
}

function buildCandidatePairs(daySlots: DaySlot[], prioritizeWeekend: boolean, preferredDays: number[] = []): string[][] {
  const pairs: string[][] = []
  const weekendDates = daySlots.filter((day) => day.isWeekend).map((day) => day.date)
  
  // Prioritize preferred day of week if specified
  if (preferredDays.length > 0) {
    const preferredSlots = daySlots.filter((slot) => {
      const dayOfWeek = new Date(slot.date).getDay()
      return preferredDays.includes(dayOfWeek)
    })
    
    if (preferredSlots.length >= 2) {
      pairs.push([preferredSlots[0].date, preferredSlots[1].date])
    }
  }

  if (prioritizeWeekend && weekendDates.length === 2) {
    pairs.push(weekendDates)
  }

  for (let i = 0; i < daySlots.length - 1; i += 1) {
    const first = daySlots[i]
    const second = daySlots[i + 1]
    pairs.push([first.date, second.date])
  }

  // Add spaced combinations for fallback variety
  pairs.push([daySlots[1].date, daySlots[4].date])
  pairs.push([daySlots[0].date, daySlots[3].date])

  return pairs
}

function canAssignPair(pair: string[], daySlots: DaySlot[], limitPerDay: number): boolean {
  return pair.every((date) => {
    const slot = daySlots.find((day) => day.date === date)
    return slot ? slot.offCount < limitPerDay : false
  })
}

function assignPair(pair: string[], daySlots: DaySlot[]): void {
  for (const date of pair) {
    const slot = daySlots.find((day) => day.date === date)
    if (slot) {
      slot.offCount += 1
    }
  }
}

function assignHighestCapacityDays(daySlots: DaySlot[], limitPerDay: number): string[] {
  const ordered = [...daySlots].sort((a, b) => {
    const remainingA = limitPerDay - a.offCount
    const remainingB = limitPerDay - b.offCount
    if (remainingA === remainingB) {
      return Number(a.isWeekend) - Number(b.isWeekend)
    }
    return remainingB - remainingA
  })
  const chosen = ordered.slice(0, 2).map((slot) => slot.date)
  assignPair(chosen, daySlots)
  return chosen
}

function findBestPairForDate(targetDate: string, daySlots: DaySlot[], limitPerDay: number): string | null {
  const targetIndex = daySlots.findIndex((slot) => slot.date === targetDate)
  if (targetIndex === -1) return null
  
  // Try adjacent days first
  if (targetIndex > 0 && daySlots[targetIndex - 1].offCount < limitPerDay) {
    return daySlots[targetIndex - 1].date
  }
  if (targetIndex < daySlots.length - 1 && daySlots[targetIndex + 1].offCount < limitPerDay) {
    return daySlots[targetIndex + 1].date
  }
  
  // Try weekend days
  const weekendSlot = daySlots.find((slot) => slot.isWeekend && slot.offCount < limitPerDay && slot.date !== targetDate)
  if (weekendSlot) return weekendSlot.date
  
  // Fallback to any available day
  const availableSlot = daySlots.find((slot) => slot.offCount < limitPerDay && slot.date !== targetDate)
  return availableSlot?.date ?? null
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

