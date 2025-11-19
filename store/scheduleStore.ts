import { addDays, addWeeks, formatISO, startOfWeek } from 'date-fns'
import { create } from 'zustand'

import type { Schedule, ShiftType } from '@/types'
import type { EmployeeRecord } from '@/services/storage/localEmployeeService'

import { generateScheduleWithAiSuggestions } from '@/services/algorithm/scheduleGenerator'
import { getAllEmployees, toggleEmployeeLeave } from '@/services/storage/localEmployeeService'
import {
  getRecentSchedules,
  getScheduleByWeek,
  saveSchedule,
  type ScheduleRecord,
} from '@/services/storage/localScheduleService'
import { seedInitialEmployees } from '@/services/storage/seedData'
import { buildHistoryFromSchedule } from '@/services/storage/historyBuilder'

type EditHistoryEntry = {
  date: string
  employeeId: string
  oldShift: ShiftType | 'OFF'
  newShift: ShiftType | 'OFF'
}

type ScheduleState = {
  employees: EmployeeRecord[]
  schedule: Schedule | null
  recentSchedules: Schedule[]
  currentWeekStarting: string
  selectedWeekOffset: number
  weekSchedules: Record<string, Schedule>
  isLoading: boolean
  isGenerating: boolean
  hasHydrated: boolean
  isEditMode: boolean
  editableSchedule: Schedule | null
  editHistory: EditHistoryEntry[]
  error?: string
}

type ScheduleActions = {
  loadInitialData: (options?: { force?: boolean }) => Promise<void>
  generateSchedule: () => Promise<void>
  toggleLeaveStatus: (employeeId: string) => Promise<void>
  refreshRecentSchedules: () => Promise<void>
  setWeekOffset: (offset: number) => Promise<void>
  navigateWeek: (direction: 'prev' | 'next') => Promise<void>
  goToCurrentWeek: () => Promise<void>
  enterEditMode: () => void
  exitEditMode: (save: boolean) => Promise<void>
  updateAssignment: (date: string, employeeId: string, newShift: ShiftType | 'OFF') => void
  swapEmployees: (date: string, emp1Id: string, emp2Id: string) => void
  undoLastEdit: () => void
}

const defaultWeekStarting = formatISO(
  startOfWeek(new Date(), { weekStartsOn: 1 }),
  { representation: 'date' },
)

export const useScheduleStore = create<ScheduleState & ScheduleActions>((set, get) => ({
  employees: [],
  schedule: null,
  recentSchedules: [],
  currentWeekStarting: defaultWeekStarting,
  selectedWeekOffset: 0,
  weekSchedules: {},
  isLoading: false,
  isGenerating: false,
  hasHydrated: false,
  isEditMode: false,
  editableSchedule: null,
  editHistory: [],

  async loadInitialData(options) {
    const { hasHydrated, isLoading, currentWeekStarting } = get()
    if (!options?.force && (hasHydrated || isLoading)) return

    set({ isLoading: true })
    try {
      await seedInitialEmployees()
      const [employees, scheduleRecord, recent] = await Promise.all([
        getAllEmployees(),
        getScheduleByWeek(currentWeekStarting),
        getRecentSchedules(3),
      ])

      set({
        employees,
        schedule: scheduleRecord ? convertRecordToSchedule(scheduleRecord) : null,
        recentSchedules: recent.map(convertRecordToSchedule),
        isLoading: false,
        hasHydrated: true,
        error: undefined,
      })
    } catch (error) {
      console.error('Failed to load initial data', error)
      set({
        isLoading: false,
        hasHydrated: true,
        error: 'Unable to load data. Please try again.',
      })
    }
  },

  async generateSchedule() {
    const { employees, currentWeekStarting } = get()
    if (!employees.length) {
      return
    }

    set({ isGenerating: true, error: undefined })
    try {
      const schedule = await generateScheduleWithAiSuggestions({
        employees: employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          isOnLeave: employee.isOnLeave,
          history: [],
        })),
        weekStarting: currentWeekStarting,
      })

      await saveSchedule({
        scheduleId: schedule.id,
        weekStarting: schedule.weekStarting,
        weekEnding: schedule.weekEnding,
        dailySchedules: schedule.dailySchedules,
        fairnessScore: schedule.fairnessScore,
        validated: schedule.validated,
      })

      // Build history records for stats tracking
      await buildHistoryFromSchedule(schedule)

      set({ schedule, isGenerating: false })
      await get().refreshRecentSchedules()
    } catch (error) {
      console.error('Failed to generate schedule', error)
      set({
        isGenerating: false,
        error: 'Failed to generate schedule. Please retry.',
      })
    }
  },

  async toggleLeaveStatus(employeeId: string) {
    set({ isLoading: true })
    try {
      const updated = await toggleEmployeeLeave(employeeId)
      if (!updated) {
        set({ isLoading: false })
        return
      }

      set((state) => ({
        employees: state.employees.map((employee) =>
          employee.id === updated.id ? updated : employee,
        ),
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to toggle leave status', error)
      set({ isLoading: false, error: 'Could not update leave status' })
    }
  },

  async refreshRecentSchedules() {
    try {
      const recent = await getRecentSchedules(3)
      set({ recentSchedules: recent.map(convertRecordToSchedule) })
    } catch (error) {
      console.error('Failed to load recent schedules', error)
    }
  },

  async setWeekOffset(offset: number) {
    const clampedOffset = Math.max(-8, Math.min(4, offset))
    const today = startOfWeek(new Date(), { weekStartsOn: 1 })
    const targetWeek = addWeeks(today, clampedOffset)
    const weekStarting = formatISO(targetWeek, { representation: 'date' })
    const existing = get().weekSchedules[weekStarting]

    if (existing !== undefined) {
      set({
        selectedWeekOffset: clampedOffset,
        currentWeekStarting: weekStarting,
        schedule: existing,
        isLoading: false,
      })
      return
    }

    set({ selectedWeekOffset: clampedOffset, currentWeekStarting: weekStarting, isLoading: true })

    try {
      const scheduleRecord = await getScheduleByWeek(weekStarting)
      const schedule = scheduleRecord ? convertRecordToSchedule(scheduleRecord) : null

      set((state) => ({
        schedule,
        weekSchedules: {
          ...state.weekSchedules,
          [weekStarting]: schedule!,
        },
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to load week schedule', error)
      set({ isLoading: false })
    }
  },

  async navigateWeek(direction: 'prev' | 'next') {
    const { selectedWeekOffset } = get()
    const newOffset = direction === 'next' ? selectedWeekOffset + 1 : selectedWeekOffset - 1
    await get().setWeekOffset(newOffset)
  },

  async goToCurrentWeek() {
    await get().setWeekOffset(0)
  },

  enterEditMode() {
    const { schedule } = get()
    if (!schedule) return

    set({
      isEditMode: true,
      editableSchedule: JSON.parse(JSON.stringify(schedule)),
      editHistory: [],
    })
  },

  async exitEditMode(save: boolean) {
    if (save) {
      const { editableSchedule } = get()
      if (!editableSchedule) return

      // Validate schedule
      const isValid = editableSchedule.dailySchedules.every((day) => day.assignments.length > 0)
      if (!isValid) {
        set({ error: 'Schedule incomplete - all days must have assignments' })
        return
      }

      try {
        await saveSchedule({
          scheduleId: editableSchedule.id,
          weekStarting: editableSchedule.weekStarting,
          weekEnding: editableSchedule.weekEnding,
          dailySchedules: editableSchedule.dailySchedules,
          fairnessScore: editableSchedule.fairnessScore,
          validated: false, // Manually edited
        })

        await buildHistoryFromSchedule(editableSchedule)

        set({
          schedule: editableSchedule,
          isEditMode: false,
          editableSchedule: null,
          editHistory: [],
        })

        await get().refreshRecentSchedules()
      } catch (error) {
        console.error('Failed to save edited schedule', error)
        set({ error: 'Failed to save schedule' })
      }
    } else {
      set({
        isEditMode: false,
        editableSchedule: null,
        editHistory: [],
      })
    }
  },

  updateAssignment(date: string, employeeId: string, newShift: ShiftType | 'OFF') {
    const { editableSchedule, editHistory } = get()
    if (!editableSchedule) return

    const updatedSchedule = { ...editableSchedule }
    const dayIndex = updatedSchedule.dailySchedules.findIndex((d) => d.date === date)
    if (dayIndex === -1) return

    const day = updatedSchedule.dailySchedules[dayIndex]
    const assignmentIndex = day.assignments.findIndex((a) => a.employeeId === employeeId)
    if (assignmentIndex === -1) return

    const oldShift = day.assignments[assignmentIndex].shift

    // Update assignment
    updatedSchedule.dailySchedules[dayIndex] = {
      ...day,
      assignments: day.assignments.map((a) =>
        a.employeeId === employeeId ? { ...a, shift: newShift } : a,
      ),
    }

    // Record history
    const newHistory: EditHistoryEntry = {
      date,
      employeeId,
      oldShift,
      newShift,
    }

    set({
      editableSchedule: updatedSchedule,
      editHistory: [...editHistory, newHistory],
    })
  },

  swapEmployees(date: string, emp1Id: string, emp2Id: string) {
    const { editableSchedule } = get()
    if (!editableSchedule) return

    const updatedSchedule = { ...editableSchedule }
    const dayIndex = updatedSchedule.dailySchedules.findIndex((d) => d.date === date)
    if (dayIndex === -1) return

    const day = updatedSchedule.dailySchedules[dayIndex]
    const emp1Index = day.assignments.findIndex((a) => a.employeeId === emp1Id)
    const emp2Index = day.assignments.findIndex((a) => a.employeeId === emp2Id)

    if (emp1Index === -1 || emp2Index === -1) return

    // Swap shifts
    const emp1Shift = day.assignments[emp1Index].shift
    const emp2Shift = day.assignments[emp2Index].shift

    updatedSchedule.dailySchedules[dayIndex] = {
      ...day,
      assignments: day.assignments.map((a) => {
        if (a.employeeId === emp1Id) return { ...a, shift: emp2Shift }
        if (a.employeeId === emp2Id) return { ...a, shift: emp1Shift }
        return a
      }),
    }

    set({ editableSchedule: updatedSchedule })
  },

  undoLastEdit() {
    const { editHistory, editableSchedule } = get()
    if (!editHistory.length || !editableSchedule) return

    const lastEdit = editHistory[editHistory.length - 1]
    const updatedSchedule = { ...editableSchedule }

    const dayIndex = updatedSchedule.dailySchedules.findIndex((d) => d.date === lastEdit.date)
    if (dayIndex === -1) return

    const day = updatedSchedule.dailySchedules[dayIndex]
    updatedSchedule.dailySchedules[dayIndex] = {
      ...day,
      assignments: day.assignments.map((a) =>
        a.employeeId === lastEdit.employeeId ? { ...a, shift: lastEdit.oldShift } : a,
      ),
    }

    set({
      editableSchedule: updatedSchedule,
      editHistory: editHistory.slice(0, -1),
    })
  },
}))

function convertRecordToSchedule(record: ScheduleRecord): Schedule {
  return {
    id: record.scheduleId,
    weekStarting: record.weekStarting,
    weekEnding: record.weekEnding,
    dailySchedules: record.dailySchedules as Schedule['dailySchedules'],
    fairnessScore: record.fairnessScore ?? 0,
    validated: record.validated,
  }
}

