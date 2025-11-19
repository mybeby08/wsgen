import React from 'react'

import type { ShiftType } from '@/types'
import { useShiftMetaStore } from '@/store/shiftMetaStore'
import type { ShiftCategory, ShiftMetaRecord } from '@/services/storage/localShiftMetaService'

interface ViewShiftMeta {
  label: string
  time: string
  role: string
  note: string
  isWorking: boolean
}

const OFF_META: ViewShiftMeta = {
  label: 'Day Off',
  time: '',
  role: 'Rest Day',
  note: 'Recharge',
  isWorking: false,
}

function buildViewMetaFromRecord(record: ShiftMetaRecord): ViewShiftMeta {
  const time = `${record.startTime} - ${record.endTime}`
  return {
    label: record.label,
    time,
    role: record.role ?? '',
    note: record.note ?? '',
    isWorking: true,
  }
}

function getFallbackCategory(shiftId: string): ShiftCategory {
  const upper = shiftId.toUpperCase()
  if (upper.includes('EARLY') || upper.includes('MORNING')) return 'EARLY'
  return 'LATE'
}

export function useShiftMetaLookup() {
  const metas = useShiftMetaStore((state) => state.metas)
  const byId = useShiftMetaStore((state) => state.byId)
  const isLoading = useShiftMetaStore((state) => state.isLoading)

  const getMetaForShift = React.useCallback(
    (shift: ShiftType | 'OFF'): ViewShiftMeta => {
      if (!shift || shift === 'OFF') {
        return OFF_META
      }

      const record = byId[shift]
      if (!record) {
        return {
          label: shift,
          time: '',
          role: '',
          note: '',
          isWorking: true,
        }
      }

      return buildViewMetaFromRecord(record)
    },
    [byId],
  )

  const getCategoryForShift = React.useCallback(
    (shift: ShiftType): ShiftCategory => {
      const record = byId[shift]
      if (record?.category === 'EARLY' || record?.category === 'LATE') {
        return record.category
      }
      return getFallbackCategory(shift)
    },
    [byId],
  )

  const isOvertimeShift = React.useCallback(
    (shift: ShiftType): boolean => {
      const record = byId[shift]
      return !!record?.isOvertime
    },
    [byId],
  )

  const workingShiftIds = React.useMemo<string[]>(
    () => metas.map((meta) => meta.shiftId),
    [metas],
  )

  return {
    getMetaForShift,
    getCategoryForShift,
    isOvertimeShift,
    workingShiftIds,
    isLoading,
  }
}
