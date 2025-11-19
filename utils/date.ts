import { addDays, format, parseISO, isValid } from 'date-fns'

/**
 * Formats a week range from starting date
 */
export function formatWeekRange(starting: string): string {
  if (!starting) return ''
  const start = parseISO(starting)
  if (!isValid(start)) return ''
  const end = addDays(start, 6)
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
}

/**
 * Formats a date string to day format
 */
export function formatDay(date: string): string {
  const parsed = parseISO(date)
  if (!isValid(parsed)) return ''
  return format(parsed, 'EEE, MMM d')
}

/**
 * Safely parses a date string
 */
export function safeParseDateString(dateString: string): Date | null {
  try {
    const date = parseISO(dateString)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}
