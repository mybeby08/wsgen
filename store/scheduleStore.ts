import { addWeeks, formatISO, startOfWeek } from 'date-fns'
import { create } from 'zustand'

import type { Schedule, ShiftType } from '@/types'
import type { EmployeeRecord } from '@/services/storage/localEmployeeService'

import { APP_CONFIG } from '@/constants/config'
import { ErrorLogger, getUserMessage } from '@/lib/errors'
import { validateWeekOffset } from '@/utils/validation'
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
  generationProgress: number
  hasHydrated: boolean
  isEditMode: boolean
  editableSchedule: Schedule | null
  editHistory: EditHistoryEntry[]
  aiInsightsEnabled: boolean
  error?: string
}

type ScheduleActions = {
  loadInitialData: (options?: { force?: boolean }) => Promise<void>
  generateSchedule: () => Promise<void>
  toggleLeaveStatus: (employeeId: string) => Promise<void>
  refreshRecentSchedules: () => Promise<void>
  setWeekOffset: (offset: number) => Promise<void>
  toggleAIInsights: (enabled: boolean) => void
  updateAICache: (cacheData: Partial<Schedule['aiCache']>) => Promise<void>
  navigateWeek: (direction: 'prev' | 'next') => Promise<void>
  goToCurrentWeek: () => Promise<void>
  enterEditMode: () => void
  exitEditMode: (save: boolean) => Promise<void>
  updateAssignment: (date: string, employeeId: string, newShift: ShiftType | 'OFF') => void
  swapEmployees: (date: string, emp1Id: string, emp2Id: string) => void
  undoLastEdit: () => void
}

const defaultWeekStarting = formatISO(
  startOfWeek(new Date(), { weekStartsOn: APP_CONFIG.SCHEDULE.WEEK_STARTS_ON }),
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
  generationProgress: 0,
  hasHydrated: false,
  isEditMode: false,
  editableSchedule: null,
  editHistory: [],
  aiInsightsEnabled: true,

  async loadInitialData(options) {
    const { hasHydrated, isLoading, currentWeekStarting } = get()
    if (!options?.force && (hasHydrated || isLoading)) return

    set({ isLoading: true })
    try {
      await seedInitialEmployees()
      const [employees, scheduleRecord, recent] = await Promise.all([
        getAllEmployees(),
        getScheduleByWeek(currentWeekStarting),
        getRecentSchedules(APP_CONFIG.SCHEDULE.RECENT_SCHEDULES_LIMIT),
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
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to load initial data'), {
        action: 'loadInitialData',
      })
      set({
        isLoading: false,
        hasHydrated: true,
        error: getUserMessage(error),
      })
    }
  },

  async generateSchedule() {
    const { employees, currentWeekStarting } = get()
    if (!employees.length) {
      return
    }

    set({ isGenerating: true, generationProgress: 0, error: undefined })
    try {
      // Step 1: Preparing (0-20%)
      set({ generationProgress: 10 })
      await new Promise((resolve) => setTimeout(resolve, 200))
      
      set({ generationProgress: 20 })
      
      // Step 2: Generating base schedule (20-60%)
      set({ generationProgress: 30 })
      const schedule = await generateScheduleWithAiSuggestions({
        employees: employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          isOnLeave: employee.isOnLeave,
          history: [],
        })),
        weekStarting: currentWeekStarting,
      })
      set({ generationProgress: 60 })

      // Step 3: Saving schedule (60-80%)
      set({ generationProgress: 70 })
      await saveSchedule({
        scheduleId: schedule.id,
        weekStarting: schedule.weekStarting,
        weekEnding: schedule.weekEnding,
        dailySchedules: schedule.dailySchedules,
        fairnessScore: schedule.fairnessScore,
        validated: schedule.validated,
      })
      set({ generationProgress: 80 })

      // Step 4: Building history (80-95%)
      set({ generationProgress: 85 })
      await buildHistoryFromSchedule(schedule)
      set({ generationProgress: 95 })

      // Step 5: Finalizing (95-100%)
      await get().refreshRecentSchedules()
      set({ generationProgress: 100 })
      
      // Small delay to show 100% before hiding
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      set({ schedule, isGenerating: false, generationProgress: 0 })
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to generate schedule'), {
        action: 'generateSchedule',
      })
      set({
        isGenerating: false,
        generationProgress: 0,
        error: getUserMessage(error),
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
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to toggle leave'), {
        action: 'toggleLeaveStatus',
        employeeId,
      })
      set({ isLoading: false, error: getUserMessage(error) })
    }
  },

  async refreshRecentSchedules() {
    try {
      const recent = await getRecentSchedules(APP_CONFIG.SCHEDULE.RECENT_SCHEDULES_LIMIT)
      set({ recentSchedules: recent.map(convertRecordToSchedule) })
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to load recent schedules'), {
        action: 'refreshRecentSchedules',
      })
    }
  },

  async setWeekOffset(offset: number) {
    const clampedOffset = validateWeekOffset(
      offset,
      APP_CONFIG.SCHEDULE.MAX_WEEK_OFFSET_PAST,
      APP_CONFIG.SCHEDULE.MAX_WEEK_OFFSET_FUTURE
    )
    const today = startOfWeek(new Date(), { weekStartsOn: APP_CONFIG.SCHEDULE.WEEK_STARTS_ON })
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
      ErrorLogger.log(error instanceof Error ? error : new Error('Failed to load week schedule'), {
        action: 'setWeekOffset',
        weekStarting,
      })
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
        ErrorLogger.log(error instanceof Error ? error : new Error('Failed to save edited schedule'), {
          action: 'exitEditMode',
        })
        set({ error: getUserMessage(error) })
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

  toggleAIInsights(enabled) {
    set({ aiInsightsEnabled: enabled })
  },

  async updateAICache(cacheData) {
    const { schedule, weekSchedules, selectedWeekOffset, currentWeekStarting } = get()
    if (!schedule) return

    const updatedCache = {
      ...schedule.aiCache,
      ...cacheData,
      timestamp: new Date().toISOString(),
    }

    const updatedSchedule = {
      ...schedule,
      aiCache: updatedCache,
    }

    // Save to database
    await saveSchedule({
      scheduleId: schedule.id,
      weekStarting: schedule.weekStarting,
      weekEnding: schedule.weekEnding,
      dailySchedules: schedule.dailySchedules,
      fairnessScore: schedule.fairnessScore,
      validated: schedule.validated,
      aiCache: updatedCache,
    })

    // Update state
    set({
      schedule: updatedSchedule,
      weekSchedules: {
        ...weekSchedules,
        [schedule.weekStarting]: updatedSchedule,
      },
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
    aiCache: record.aiCache,
  }
}

