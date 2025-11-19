import { addDays, format, parseISO } from 'date-fns'

export function formatWeekRange(starting: string): string {
  if (!starting) return ''
  const start = parseISO(starting)
  const end = addDays(start, 6)
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
}

export function formatDay(date: string): string {
  const parsed = parseISO(date)
  return format(parsed, 'EEE, MMM d')
}

