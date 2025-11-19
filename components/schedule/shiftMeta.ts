import type { ShiftType } from '@/types'

export type ShiftKey = ShiftType | 'OFF'

interface ShiftMeta {
  label: string
  time: string
  role: string
  note: string
  isWorking: boolean
}

export const SHIFT_META: Record<ShiftKey, ShiftMeta> = {
  EARLY_MORNING: {
    label: 'Early Morning',
    time: '06:30 - 15:30',
    role: 'Sixty60 Customer Representative',
    note: '9h shift',
    isWorking: true,
  },
  MORNING: {
    label: 'Morning',
    time: '07:00 - 16:00',
    role: 'Sixty60 Customer Representative',
    note: '9h shift',
    isWorking: true,
  },
  MID_DAY: {
    label: 'Mid-day',
    time: '09:00 - 18:00',
    role: 'Sixty60 Customer Representative',
    note: '9h shift',
    isWorking: true,
  },
  LATE: {
    label: 'Late',
    time: '10:00 - 19:00',
    role: 'Sixty60 Customer Representative',
    note: '9h shift',
    isWorking: true,
  },
  OFF: {
    label: 'Day Off',
    time: '—',
    role: 'Rest Day',
    note: 'Recharge',
    isWorking: false,
  },
}

