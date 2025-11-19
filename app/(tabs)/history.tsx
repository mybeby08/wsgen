import React from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Text } from '@/components/nativewindui/Text'
import { useScheduleStore } from '@/store/scheduleStore'
import { formatWeekRange } from '@/utils/date'

export default function HistoryScreen() {
  const { recentSchedules, refreshRecentSchedules, isLoading } = useScheduleStore(
    useShallow((state) => ({
      recentSchedules: state.recentSchedules,
      refreshRecentSchedules: state.refreshRecentSchedules,
      isLoading: state.isLoading,
    })),
  )

  React.useEffect(() => {
    void refreshRecentSchedules()
  }, [refreshRecentSchedules])

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshRecentSchedules} />}
    >
      <Text variant="title2" className="mb-2 font-bold">
        Recent schedules
      </Text>
      <Text color="tertiary" className="mb-4">
        Track fairness scores and coverage trends over the last few weeks.
      </Text>

      {recentSchedules.length === 0 ? (
        <View className="mt-8 items-center rounded-3xl border border-dashed border-border px-4 py-10">
          <Text className="font-semibold">No history yet</Text>
          <Text color="tertiary" className="mt-1 text-center">
            Generate a few schedules to start building history.
          </Text>
        </View>
      ) : null}

      {recentSchedules.map((schedule) => (
        <View
          key={schedule.id}
          className="mb-4 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm uppercase tracking-wide text-foreground/60">Week</Text>
              <Text className="text-base font-semibold">{formatWeekRange(schedule.weekStarting)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs uppercase tracking-wide text-foreground/60">Fairness</Text>
              <Text className="text-2xl font-bold">{schedule.fairnessScore}</Text>
            </View>
          </View>
          <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-border/80 bg-background px-3 py-2">
            <View>
              <Text className="text-xs uppercase tracking-wide text-foreground/60">Coverage</Text>
              <Text className="font-semibold">
                {schedule.dailySchedules.reduce((total, day) => total + day.assignments.length, 0)} shifts
              </Text>
            </View>
            <Text className="text-xs uppercase tracking-wide text-foreground/60">
              {schedule.validated ? 'Validated' : 'Needs review'}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

