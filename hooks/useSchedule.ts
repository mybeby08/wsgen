import { useShallow } from 'zustand/react/shallow'

import { useScheduleStore } from '@/store/scheduleStore'

/**
 * Hook to access schedule data and actions
 */
export function useSchedule() {
  return useScheduleStore(
    useShallow((state) => ({
      schedule: state.schedule,
      isLoading: state.isLoading,
      isGenerating: state.isGenerating,
      error: state.error,
      generateSchedule: state.generateSchedule,
      currentWeekStarting: state.currentWeekStarting,
      selectedWeekOffset: state.selectedWeekOffset,
    }))
  )
}

/**
 * Hook to access employee data and actions
 */
export function useEmployees() {
  return useScheduleStore(
    useShallow((state) => ({
      employees: state.employees,
      toggleLeaveStatus: state.toggleLeaveStatus,
      isLoading: state.isLoading,
    }))
  )
}

/**
 * Hook to access recent schedules
 */
export function useRecentSchedules() {
  return useScheduleStore(
    useShallow((state) => ({
      recentSchedules: state.recentSchedules,
      refreshRecentSchedules: state.refreshRecentSchedules,
    }))
  )
}

/**
 * Hook for week navigation
 */
export function useWeekNavigation() {
  return useScheduleStore(
    useShallow((state) => ({
      selectedWeekOffset: state.selectedWeekOffset,
      currentWeekStarting: state.currentWeekStarting,
      setWeekOffset: state.setWeekOffset,
      navigateWeek: state.navigateWeek,
      goToCurrentWeek: state.goToCurrentWeek,
    }))
  )
}

/**
 * Hook for schedule editing
 */
export function useScheduleEdit() {
  return useScheduleStore(
    useShallow((state) => ({
      isEditMode: state.isEditMode,
      editableSchedule: state.editableSchedule,
      editHistory: state.editHistory,
      enterEditMode: state.enterEditMode,
      exitEditMode: state.exitEditMode,
      updateAssignment: state.updateAssignment,
      swapEmployees: state.swapEmployees,
      undoLastEdit: state.undoLastEdit,
    }))
  )
}

/**
 * Hook for app hydration status
 */
export function useAppHydration() {
  return useScheduleStore(
    useShallow((state) => ({
      hasHydrated: state.hasHydrated,
      loadInitialData: state.loadInitialData,
    }))
  )
}
