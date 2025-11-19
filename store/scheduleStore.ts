import { addDays, formatISO, startOfWeek } from 'date-fns'
import { create } from 'zustand'

import type { Schedule } from '@/types'
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

type ScheduleState = {
  employees: EmployeeRecord[]
  schedule: Schedule | null
  recentSchedules: Schedule[]
  currentWeekStarting: string
  isLoading: boolean
  isGenerating: boolean
  hasHydrated: boolean
  error?: string
}

type ScheduleActions = {
  loadInitialData: (options?: { force?: boolean }) => Promise<void>
  generateSchedule: () => Promise<void>
  toggleLeaveStatus: (employeeId: string) => Promise<void>
  refreshRecentSchedules: () => Promise<void>
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
  isLoading: false,
  isGenerating: false,
  hasHydrated: false,

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

