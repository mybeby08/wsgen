import React from 'react'
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { addDays, addWeeks, format, formatISO, startOfWeek } from 'date-fns'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import type { Schedule } from '@/types'

interface WeekSelectorProps {
  currentOffset: number
  weekSchedules: Record<string, Schedule>
  onSelectWeek: (offset: number) => void
  onNavigate: (direction: 'prev' | 'next') => void
}

interface WeekCardData {
  offset: number
  weekStarting: string
  label: string
  dateRange: string
  status: 'scheduled' | 'draft' | 'empty'
  fairnessScore?: number
}

export function WeekSelector({ currentOffset, weekSchedules, onSelectWeek, onNavigate }: WeekSelectorProps) {
  const { width } = useWindowDimensions()
  const today = startOfWeek(new Date(), { weekStartsOn: 1 })
  
  // Calculate card width based on screen size
  const cardWidth = React.useMemo(() => {
    const screenPadding = 32 // 16px on each side
    const gap = 12
    const availableWidth = width - screenPadding
    const cardWidth = (availableWidth - gap * 4) / 5 // 5 cards with 4 gaps
    return Math.max(120, Math.min(160, cardWidth)) // Min 120px, max 160px
  }, [width])

  const weeks: WeekCardData[] = React.useMemo(() => {
    // Always show current week (0) + 4 weeks ahead (1, 2, 3, 4)
    return Array.from({ length: 5 }, (_, i) => {
      const offset = i // Always start from 0 (current week)
      const clampedOffset = Math.max(0, Math.min(4, offset)) // Only show 0-4 (current + 4 ahead)
      const weekStart = addWeeks(today, clampedOffset)
      const weekEnd = addDays(weekStart, 6)
      const weekStarting = formatISO(weekStart, { representation: 'date' })

      const schedule = weekSchedules[weekStarting]
      const status: 'scheduled' | 'draft' | 'empty' = schedule
        ? schedule.validated
          ? 'scheduled'
          : 'draft'
        : 'empty'

      let label = 'Week'
      if (clampedOffset === 0) label = 'This Week'
      else if (clampedOffset === 1) label = 'Next Week'
      else if (clampedOffset > 1) label = `+${clampedOffset} Weeks`
      else if (clampedOffset === -1) label = 'Last Week'
      else label = `${Math.abs(clampedOffset)} Weeks Ago`

      // Include year if weekEnd is in a different year
      const weekStartYear = weekStart.getFullYear()
      const weekEndYear = weekEnd.getFullYear()
      const dateRange =
        weekStartYear === weekEndYear
          ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
          : `${format(weekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`

      return {
        offset: clampedOffset,
        weekStarting,
        label,
        dateRange,
        status,
        fairnessScore: schedule?.fairnessScore,
      }
    })
  }, [currentOffset, weekSchedules, today])

  // Navigation buttons disabled since we always show current + 4 ahead
  const canGoPrev = false
  const canGoNext = false

  return (
    <View className="mb-4">
      <View className="flex-row items-center gap-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
          className="flex-1"
        >
          {weeks.map((week) => {
            const isSelected = week.offset === currentOffset
            const statusIcon =
              week.status === 'scheduled'
                ? 'checkmark.circle.fill'
                : week.status === 'draft'
                  ? 'pencil.circle.fill'
                  : 'plus.circle'

            const statusColor =
              week.status === 'scheduled'
                ? 'text-green-600 dark:text-green-400'
                : week.status === 'draft'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-tertiary'

            return (
              <Pressable
                key={week.offset}
                onPress={() => onSelectWeek(week.offset)}
                style={{ width: cardWidth }}
                className={[
                  'rounded-2xl border p-3',
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card',
                ].join(' ')}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-xs font-semibold uppercase tracking-widest ${isSelected ? 'text-primary' : 'text-tertiary'}`}
                  >
                    {week.label}
                  </Text>
                  <Icon name={statusIcon} size={14} className={statusColor} />
                </View>

                <Text className="mt-2 text-sm font-semibold">{week.dateRange}</Text>

                {week.fairnessScore !== undefined && (
                  <View className="mt-1 flex-row items-center gap-1">
                    <Icon name="star.fill" size={10} className="text-amber-500" />
                    <Text className="text-xs text-tertiary">{week.fairnessScore}/100</Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

