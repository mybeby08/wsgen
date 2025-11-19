import { View } from 'react-native'

import type { DailySchedule } from '@/types'

import { Text } from '@/components/nativewindui/Text'
import { formatDay } from '@/utils/date'
import { SHIFT_META } from '@/components/schedule/shiftMeta'

interface Props {
  schedule: DailySchedule
  employeeNames?: Record<string, string>
}

export function DailyScheduleCard({ schedule, employeeNames = {} }: Props) {
  return (
    <View className="mb-4 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-baseline justify-between gap-4">
        <Text variant="title3" className="font-semibold">
          {formatDay(schedule.date)}
        </Text>
        <Text color="tertiary" className="text-xs uppercase tracking-[0.15em]">
          Daily roster
        </Text>
      </View>

      <View className="mt-4 rounded-2xl border border-border/80 bg-background/60">
        <View className="flex-row items-center border-b border-border/60 px-4 py-2">
          <Text className="flex-[2] text-[11px] font-semibold uppercase tracking-widest text-tertiary">
            Employee
          </Text>
          <Text className="flex-[2] text-[11px] font-semibold uppercase tracking-widest text-tertiary">
            Assignment
          </Text>
          <Text className="flex-1 text-right text-[11px] font-semibold uppercase tracking-widest text-tertiary">
            Hours
          </Text>
        </View>

        {schedule.assignments.map((assignment, index) => {
          const meta = SHIFT_META[assignment.shift] ?? SHIFT_META.MID_DAY
          const employee = employeeNames[assignment.employeeId] ?? assignment.employeeId
          const isOff = assignment.shift === 'OFF'

          return (
            <View
              key={`${schedule.date}-${assignment.employeeId}-${assignment.shift}`}
              className={[
                'flex-row items-center px-4 py-3',
                index !== schedule.assignments.length - 1 ? 'border-b border-border/40' : '',
                isOff ? 'bg-muted/20' : 'bg-card',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <View className="flex-[2] pr-3">
                <Text className="text-sm font-semibold">{employee}</Text>
                <View className="mt-1 flex-row flex-wrap items-center gap-2">
                  <Text color="tertiary" className="text-xs">
                    {meta.role}
                  </Text>
                  {assignment.scannerId ? (
                    <Text className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Scanner {assignment.scannerId}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="flex-[2] pr-3">
                <Text className={`text-sm font-semibold ${isOff ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                  {meta.label}
                </Text>
                <Text color="tertiary" className="text-xs capitalize">
                  {assignment.shift.replace('_', ' ').toLowerCase()}
                </Text>
              </View>

              <View className="flex-1 items-end">
                <Text className="text-sm font-semibold">{meta.time}</Text>
                <Text color="tertiary" className="text-xs">
                  {meta.note}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

