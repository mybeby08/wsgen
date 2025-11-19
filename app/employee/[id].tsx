import React from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import { getEmployeeStats } from '@/services/storage/employeeStatsService'
import type { EmployeeStats } from '@/services/storage/employeeStatsService'
import { useScheduleStore } from '@/store/scheduleStore'

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const employees = useScheduleStore((state) => state.employees)
  const employee = employees.find((e) => e.id === id)

  const [stats, setStats] = React.useState<EmployeeStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!id) return
    setIsLoading(true)
    getEmployeeStats(id)
      .then(setStats)
      .catch((error) => {
        console.error('Failed to load employee stats', error)
        setStats(null)
      })
      .finally(() => setIsLoading(false))
  }, [id])

  if (!employee) {
    return (
      <>
        <Stack.Screen options={{ title: 'Employee Not Found' }} />
        <View className="flex-1 items-center justify-center p-6">
          <Icon name="person.fill.xmark" className="mb-3 text-4xl text-rose-500" />
          <Text className="text-center font-semibold">Employee not found</Text>
          <Text color="tertiary" className="mt-1 text-center">
            Unable to locate this employee in your roster.
          </Text>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: employee.name }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header Card */}
        <View className="mb-4 rounded-3xl border border-border bg-card p-5 shadow-sm shadow-black/5">
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon name="person.fill" className="text-2xl text-primary" />
            </View>
            <View className="flex-1">
              <Text variant="title3" className="font-bold">
                {employee.name}
              </Text>
              <View className="mt-1 flex-row items-center gap-2">
                <Icon
                  name={employee.isOnLeave ? 'moon.fill' : 'checkmark.circle.fill'}
                  className={employee.isOnLeave ? 'text-amber-500' : 'text-emerald-500'}
                />
                <Text color="tertiary" className="text-sm">
                  {employee.isOnLeave ? 'Currently on leave' : 'Available for shifts'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator />
            <Text className="mt-2">Loading statistics...</Text>
          </View>
        ) : !stats ? (
          <View className="mt-8 items-center rounded-3xl border border-dashed border-border px-6 py-10">
            <Icon name="chart.bar.xaxis" className="mb-3 text-4xl text-grey" />
            <Text className="text-center font-semibold">No history yet</Text>
            <Text color="tertiary" className="mt-1 text-center">
              This employee hasn't been scheduled in the last 6 weeks.
            </Text>
          </View>
        ) : (
          <>
            {/* Quick Stats Grid */}
            <Text variant="title3" className="mb-3 font-semibold">
              Last 6 Weeks
            </Text>
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-border bg-card p-4">
                <Text color="tertiary" className="text-xs uppercase tracking-wide">
                  Total shifts
                </Text>
                <Text variant="title1" className="mt-1 font-bold">
                  {stats.totalShifts}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-border bg-card p-4">
                <Text color="tertiary" className="text-xs uppercase tracking-wide">
                  Off days
                </Text>
                <Text variant="title1" className="mt-1 font-bold">
                  {stats.totalOffDays}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-border bg-card p-4">
                <Text color="tertiary" className="text-xs uppercase tracking-wide">
                  Weekends off
                </Text>
                <Text variant="title1" className="mt-1 font-bold">
                  {stats.totalWeekendOffs}
                </Text>
              </View>
            </View>

            {/* Shift Breakdown */}
            <Text variant="title3" className="mb-3 font-semibold">
              Shift Breakdown
            </Text>
            <View className="mb-4 rounded-3xl border border-border bg-card p-4">
              <ShiftRow label="Early Morning" time="06:30 - 15:30" count={stats.earlyMorning} />
              <ShiftRow label="Morning" time="07:00 - 16:00" count={stats.morning} />
              <ShiftRow label="Mid-day" time="09:00 - 18:00" count={stats.midDay} />
              <ShiftRow label="Late" time="10:00 - 19:00" count={stats.late} />
            </View>

            {/* Balance Indicator */}
            <Text variant="title3" className="mb-3 font-semibold">
              Early vs Late Balance
            </Text>
            <View className="mb-4 rounded-3xl border border-border bg-card p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-semibold">Early shifts</Text>
                  <Text color="tertiary" className="text-xs">
                    06:30 & 07:00 starts
                  </Text>
                </View>
                <Text variant="title2" className="font-bold text-blue-600 dark:text-blue-400">
                  {stats.earlyShifts}
                </Text>
              </View>
              <View className="mb-3 h-3 overflow-hidden rounded-full bg-muted">
                <View
                  className="h-full bg-blue-500"
                  style={{
                    width: `${stats.totalShifts > 0 ? (stats.earlyShifts / stats.totalShifts) * 100 : 0}%`,
                  }}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-semibold">Late shifts</Text>
                  <Text color="tertiary" className="text-xs">
                    09:00 & 10:00 starts
                  </Text>
                </View>
                <Text variant="title2" className="font-bold text-amber-600 dark:text-amber-400">
                  {stats.lateShifts}
                </Text>
              </View>
              <View className="h-3 overflow-hidden rounded-full bg-muted">
                <View
                  className="h-full bg-amber-500"
                  style={{
                    width: `${stats.totalShifts > 0 ? (stats.lateShifts / stats.totalShifts) * 100 : 0}%`,
                  }}
                />
              </View>
            </View>

            {/* Weekend Pattern */}
            <Text variant="title3" className="mb-3 font-semibold">
              Weekend Pattern
            </Text>
            <View className="rounded-3xl border border-border bg-card p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-semibold">Weekend offs in last 6 weeks</Text>
                  <Text color="tertiary" className="text-xs">
                    Saturday or Sunday off
                  </Text>
                </View>
                <Text variant="title1" className="font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalWeekendOffs}
                </Text>
              </View>
              {stats.totalWeekendOffs === 0 ? (
                <View className="rounded-2xl bg-rose-50 px-3 py-2 dark:bg-rose-950/30">
                  <Text className="text-xs text-rose-700 dark:text-rose-300">
                    ⚠️ No weekend offs recently—high priority for next schedule
                  </Text>
                </View>
              ) : stats.totalWeekendOffs >= 4 ? (
                <View className="rounded-2xl bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                  <Text className="text-xs text-amber-700 dark:text-amber-300">
                    ⚡ Many recent weekend offs—may work more weekends soon
                  </Text>
                </View>
              ) : (
                <View className="rounded-2xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                  <Text className="text-xs text-emerald-700 dark:text-emerald-300">
                    ✓ Balanced weekend pattern
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  )
}

interface ShiftRowProps {
  label: string
  time: string
  count: number
}

function ShiftRow({ label, time, count }: ShiftRowProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between last:mb-0">
      <View className="flex-1">
        <Text className="text-sm font-semibold">{label}</Text>
        <Text color="tertiary" className="text-xs">
          {time}
        </Text>
      </View>
      <View className="rounded-full bg-primary/10 px-3 py-1">
        <Text className="text-sm font-semibold text-primary">{count}</Text>
      </View>
    </View>
  )
}

