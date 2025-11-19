import React from 'react'
import { ScrollView, View } from 'react-native'
import { format, parseISO } from 'date-fns'

import type { Schedule } from '@/types'

import { Text } from '@/components/nativewindui/Text'
import { SHIFT_META } from '@/components/schedule/shiftMeta'

interface Props {
  schedule: Schedule
  employeeNames: Record<string, string>
  employeeOrder?: string[]
}

export function LandscapeScheduleGrid({ schedule, employeeNames, employeeOrder }: Props) {
  const days = React.useMemo(
    () =>
      schedule.dailySchedules.slice().sort((a, b) => {
        const left = parseISO(a.date).getTime()
        const right = parseISO(b.date).getTime()
        return left - right
      }),
    [schedule.dailySchedules],
  )

  const rows = React.useMemo(() => {
    if (employeeOrder?.length) return employeeOrder
    const ids = new Set<string>()
    schedule.dailySchedules.forEach((daily) => {
      daily.assignments.forEach((assignment) => ids.add(assignment.employeeId))
    })
    return Array.from(ids)
  }, [employeeOrder, schedule.dailySchedules])

  const assignmentsByEmployee = React.useMemo(() => {
    const map = new Map<string, Record<string, (typeof schedule.dailySchedules)[number]['assignments'][number]>>()
    schedule.dailySchedules.forEach((daily) => {
      daily.assignments.forEach((assignment) => {
        if (!map.has(assignment.employeeId)) {
          map.set(assignment.employeeId, {})
        }
        map.get(assignment.employeeId)![daily.date] = assignment
      })
    })
    return map
  }, [schedule.dailySchedules])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4 }}
    >
      <View className="rounded-3xl border border-border bg-card shadow-sm shadow-black/10">
        <View className="flex-row rounded-t-3xl bg-muted/40">
          <View className="w-40 px-3 py-4">
            <Text className="text-xs uppercase tracking-widest text-tertiary">Employee</Text>
          </View>
          {days.map((day) => {
            const parsed = parseISO(day.date)
            return (
              <View
                key={day.date}
                className="w-32 border-l border-border/40 px-3 py-4"
              >
                <Text className="text-[11px] uppercase tracking-widest text-tertiary">
                  {format(parsed, 'EEE')}
                </Text>
                <Text className="text-base font-semibold">{format(parsed, 'MMM d')}</Text>
              </View>
            )
          })}
        </View>

        {rows.map((employeeId, rowIndex) => {
          const employeeName = employeeNames[employeeId] ?? employeeId
          const rowAssignments = assignmentsByEmployee.get(employeeId) ?? {}
          const zebra = rowIndex % 2 === 0 ? 'bg-background/60' : 'bg-card'

          return (
            <View
              key={employeeId}
              className={`flex-row border-t border-border/50 ${zebra}`}
            >
              <View className="w-40 px-3 py-4">
                <Text className="text-sm font-semibold">{employeeName}</Text>
                <Text color="tertiary" className="text-xs">
                  Staff
                </Text>
              </View>
              {days.map((day) => {
                const assignment = rowAssignments[day.date]
                const meta = SHIFT_META[assignment?.shift ?? 'OFF']
                const isOff = !meta.isWorking
                return (
                  <View
                    key={`${employeeId}-${day.date}`}
                    className="w-32 border-l border-border/40 px-3 py-3"
                  >
                    <Text
                      className={`text-xs uppercase tracking-widest ${isOff ? 'text-emerald-600 dark:text-emerald-300' : 'text-tertiary'}`}
                    >
                      {isOff ? 'Off' : meta.label}
                    </Text>
                    <Text className="text-sm font-semibold">{meta.time}</Text>
                    {assignment?.scannerId ? (
                      <Text className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        Scanner {assignment.scannerId}
                      </Text>
                    ) : (
                      <Text color="tertiary" className="mt-1 text-xs">
                        {meta.note}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

