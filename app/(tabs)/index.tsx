import React from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native'

import { Icon } from '@/components/nativewindui/Icon'
import { Text } from '@/components/nativewindui/Text'
import { DailyScheduleCard } from '@/components/schedule/DailyScheduleCard'
import { SuggestionCard } from '@/components/schedule/SuggestionCard'
import { LandscapeScheduleGrid } from '@/components/schedule/LandscapeScheduleGrid'
import { useScheduleStore } from '@/store/scheduleStore'
import { useShallow } from 'zustand/react/shallow'
import { formatWeekRange } from '@/utils/date'

export default function ScheduleScreen() {
  const {
    schedule,
    employees,
    isLoading,
    isGenerating,
    loadInitialData,
    generateSchedule,
    currentWeekStarting,
    error,
  } = useScheduleStore(
    useShallow((state) => ({
      schedule: state.schedule,
      employees: state.employees,
      isLoading: state.isLoading,
      isGenerating: state.isGenerating,
      loadInitialData: state.loadInitialData,
      generateSchedule: state.generateSchedule,
      currentWeekStarting: state.currentWeekStarting,
      error: state.error,
    })),
  )

  React.useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  const { width, height } = useWindowDimensions()
  const isLandscapeOrientation = width > height

  const [manualGridView, setManualGridView] = React.useState(false)
  const isGridView = isLandscapeOrientation || manualGridView

  const employeeNames = React.useMemo(
    () =>
      employees.reduce<Record<string, string>>((acc, employee) => {
        acc[employee.id] = employee.name
        return acc
      }, {}),
    [employees],
  )

  const employeeOrder = React.useMemo(() => employees.map((employee) => employee.id), [employees])

  const handleGenerate = React.useCallback(() => {
    void generateSchedule()
  }, [generateSchedule])

  if (isLoading && !schedule) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-3">Loading schedule...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => void loadInitialData({ force: true })} />
      }
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text variant="title2" className="font-bold">
            This Week
          </Text>
          <Text color="tertiary">{formatWeekRange(currentWeekStarting)}</Text>
        </View>
        <View className="items-end">
          <Text color="tertiary" className="text-xs uppercase tracking-widest">
            Fairness
          </Text>
          <Text variant="title2" className="font-bold">
            {schedule?.fairnessScore ?? '--'}
          </Text>
        </View>
      </View>

      <View className="mb-6 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold">Auto-generate weekly schedule</Text>
          <Icon name="sparkle" className="text-primary" />
        </View>
        <Text color="tertiary" className="mt-1 text-sm">
          Uses fairness algorithm + Gemini AI suggestions.
        </Text>
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border/80 bg-background px-4 py-2">
            <Text color="tertiary" className="text-xs uppercase tracking-wide">
              Employees ready
            </Text>
            <Text variant="title2">{employees.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border/80 bg-background px-4 py-2">
            <Text color="tertiary" className="text-xs uppercase tracking-wide">
              Status
            </Text>
            <Text variant="title2">{schedule ? 'Generated' : 'Pending'}</Text>
          </View>
        </View>
        <View className="mt-4 rounded-2xl bg-primary px-4 py-3">
          <Text
            className="text-center text-base font-semibold text-white"
            onPress={handleGenerate}
          >
            {isGenerating ? 'Generating...' : 'Generate Schedule'}
          </Text>
        </View>
        {error ? <Text className="mt-2 text-sm text-rose-500">{error}</Text> : null}
      </View>

      {schedule ? (
        <>
          <View className="mb-2 flex-row items-center justify-between gap-4">
            <Text variant="title3" className="font-semibold">
              {isGridView ? 'Weekly Grid' : 'Daily Assignments'}
            </Text>
            {!isLandscapeOrientation && (
              <Pressable
                className="rounded-full border border-border/70 px-3 py-1"
                onPress={() => setManualGridView((prev) => !prev)}
              >
                <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {manualGridView ? 'Show cards' : 'Show grid'}
                </Text>
              </Pressable>
            )}
          </View>
          {isGridView ? (
            <LandscapeScheduleGrid
              schedule={schedule}
              employeeNames={employeeNames}
              employeeOrder={employeeOrder}
            />
          ) : (
            schedule.dailySchedules.map((daily) => (
              <DailyScheduleCard key={daily.date} schedule={daily} employeeNames={employeeNames} />
            ))
          )}
        </>
      ) : (
        <View className="mt-8 items-center rounded-3xl border border-dashed border-border px-6 py-10">
          <Icon name="calendar.badge.plus" className="mb-3 text-4xl text-grey" />
          <Text className="text-center font-semibold">No schedule yet</Text>
          <Text color="tertiary" className="mt-1 text-center">
            Tap “Generate schedule” to create this week’s plan.
          </Text>
        </View>
      )}

      {schedule?.aiSuggestions?.length ? (
        <View className="mt-6">
          <Text variant="title3" className="mb-2 font-semibold">
            AI Suggestions
          </Text>
          <View className="gap-3">
            {schedule.aiSuggestions.map((suggestion, index) => (
              <SuggestionCard key={`${suggestion.title}-${index}`} suggestion={suggestion} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  )
}

