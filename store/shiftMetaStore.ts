import { create } from 'zustand'

import type { ShiftMetaRecord, ShiftCategory } from '@/services/storage/localShiftMetaService'
import {
  deleteShiftMeta,
  getAllShiftMetas,
  upsertShiftMeta,
  seedInitialShiftMetas,
} from '@/services/storage/localShiftMetaService'

interface ShiftMetaState {
  metas: ShiftMetaRecord[]
  byId: Record<string, ShiftMetaRecord>
  isLoading: boolean
  error?: string
}

interface ShiftMetaActions {
  load: () => Promise<void>
  add: (input: {
    shiftId: string
    label: string
    startTime: string
    endTime: string
    category: ShiftCategory
    enabledForGeneration?: boolean
    isOvertime?: boolean
    role?: string | null
    note?: string | null
    displayOrder?: number
  }) => Promise<void>
  update: (
    shiftId: string,
    updates: Partial<Omit<ShiftMetaRecord, 'shiftId' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<void>
  remove: (shiftId: string) => Promise<void>
}

export const useShiftMetaStore = create<ShiftMetaState & ShiftMetaActions>((set, get) => ({
  metas: [],
  byId: {},
  isLoading: false,

  async load() {
    set({ isLoading: true, error: undefined })
    try {
      await seedInitialShiftMetas()
      const metas = await getAllShiftMetas()
      const byId = metas.reduce<Record<string, ShiftMetaRecord>>((acc, meta) => {
        acc[meta.shiftId] = meta
        return acc
      }, {})
      set({ metas, byId, isLoading: false })
    } catch (error) {
      console.error('Failed to load shift metas', error)
      set({ isLoading: false, error: 'Unable to load shift settings' })
    }
  },

  async add(input) {
    const enabledForGeneration = input.enabledForGeneration ?? true
    const isOvertime = input.isOvertime ?? false

    await upsertShiftMeta({
      shiftId: input.shiftId,
      label: input.label,
      startTime: input.startTime,
      endTime: input.endTime,
      category: input.category,
      enabledForGeneration,
      isOvertime,
      role: input.role ?? null,
      note: input.note ?? null,
      displayOrder: input.displayOrder,
    })

    await get().load()
  },

  async update(shiftId, updates) {
    const existing = get().byId[shiftId]
    if (!existing) return

    await upsertShiftMeta({
      shiftId,
      label: updates.label ?? existing.label,
      startTime: updates.startTime ?? existing.startTime,
      endTime: updates.endTime ?? existing.endTime,
      category: updates.category ?? existing.category,
      enabledForGeneration:
        updates.enabledForGeneration ?? existing.enabledForGeneration,
      isOvertime: updates.isOvertime ?? existing.isOvertime,
      role: updates.role ?? existing.role,
      note: updates.note ?? existing.note,
      displayOrder: updates.displayOrder ?? existing.displayOrder,
    })

    await get().load()
  },

  async remove(shiftId) {
    await deleteShiftMeta(shiftId)
    await get().load()
  },
}))
