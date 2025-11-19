import { addDays, formatISO, getDay, isSaturday, isSunday, parseISO } from 'date-fns'

export function getWeekDates(weekStarting: string): string[] {
  const start = parseISO(weekStarting)
  return Array.from({ length: 7 }, (_, index) =>
    formatISO(addDays(start, index), { representation: 'date' }),
  )
}

export function normalizeDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return formatISO(parsed, { representation: 'date' })
}

export function isWeekend(date: string | Date): boolean {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return isSaturday(parsed) || isSunday(parsed)
}

export function getWeekdayIndex(date: string | Date): number {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return getDay(parsed)
}

