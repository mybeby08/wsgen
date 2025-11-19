import type { ShiftType } from '@/types'
import type { ShiftCategory } from '@/services/storage/localShiftMetaService'
import { useShiftMetaStore } from '@/store/shiftMetaStore'

function fallbackCategory(shift: ShiftType): ShiftCategory {
  const upper = shift.toUpperCase()
  if (upper.includes('EARLY') || upper.includes('MORNING')) return 'EARLY'
  return 'LATE'
}

export function getShiftCategory(shift: ShiftType): ShiftCategory {
  const { byId } = useShiftMetaStore.getState()
  const record = byId[shift]
  if (record?.category === 'EARLY' || record?.category === 'LATE') {
    return record.category
  }
  return fallbackCategory(shift)
}

export function isOvertimeShiftId(shift: ShiftType): boolean {
  const { byId } = useShiftMetaStore.getState()
  const record = byId[shift]
  return !!record?.isOvertime
}

export function getGenerationShiftPools(): { early: ShiftType[]; late: ShiftType[] } {
  const { metas } = useShiftMetaStore.getState()

  const early = metas
    .filter((meta) => meta.category === 'EARLY' && meta.enabledForGeneration)
    .map((meta) => meta.shiftId as ShiftType)

  const late = metas
    .filter((meta) => meta.category === 'LATE' && meta.enabledForGeneration)
    .map((meta) => meta.shiftId as ShiftType)

  const ensurePool = (pool: ShiftType[], fallback: ShiftType[]): ShiftType[] =>
    pool.length ? pool : fallback

  return {
    // Fallback to legacy defaults if DB is not yet seeded/loaded
    early: ensurePool(early, ['MORNING' as ShiftType]),
    late: ensurePool(late, ['LATE' as ShiftType]),
  }
}
