import React from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import { detectScheduleConflicts, getConflictSummary } from '@/services/ai'
import type { Schedule, Employee } from '@/types'
import type { ScheduleConflict } from '@/services/ai/conflictDetectionService'

interface Props {
  schedule: Schedule
  employees: Employee[]
  onDismiss?: (conflict: ScheduleConflict) => void
  onCacheUpdate?: (conflicts: ScheduleConflict[]) => void
}

const SEVERITY_CONFIG = {
  high: {
    icon: 'xmark.circle' as const,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  medium: {
    icon: 'exclamationmark' as const,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  low: {
    icon: 'info' as const,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
}

export function ConflictAlerts({ schedule, employees, onDismiss, onCacheUpdate }: Props) {
  const conflicts = React.useMemo(
    () => {
      // Try to use cached conflicts first
      if (schedule.aiCache?.conflicts) {
        return schedule.aiCache.conflicts as ScheduleConflict[]
      }
      return detectScheduleConflicts(schedule, employees)
    },
    [schedule, employees]
  )

  // Cache conflicts when detected
  React.useEffect(() => {
    if (conflicts.length > 0 && onCacheUpdate && !schedule.aiCache?.conflicts) {
      onCacheUpdate(conflicts)
    }
  }, [conflicts, onCacheUpdate, schedule.aiCache])

  const summary = React.useMemo(() => getConflictSummary(conflicts), [conflicts])

  const [expandedConflicts, setExpandedConflicts] = React.useState<Set<number>>(new Set())

  const toggleConflict = (index: number) => {
    setExpandedConflicts((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  if (conflicts.length === 0) {
    return (
      <View className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <View className="flex-row items-center gap-2">
          <Icon name="checkmark.circle.fill" size={20} className="text-green-600" />
          <Text className="font-semibold text-green-700">No Issues Detected</Text>
        </View>
        <Text className="mt-1 text-sm text-green-600">
          This schedule looks good with no conflicts or concerns.
        </Text>
      </View>
    )
  }

  return (
    <View className="gap-3">
      {/* Summary Badge */}
      <View className="flex-row items-center gap-2">
        <Text className="font-semibold">Schedule Issues</Text>
        {summary.high > 0 && (
          <View className="rounded-full bg-red-100 px-2 py-0.5">
            <Text className="text-xs font-semibold text-red-600">
              {summary.high} High
            </Text>
          </View>
        )}
        {summary.medium > 0 && (
          <View className="rounded-full bg-amber-100 px-2 py-0.5">
            <Text className="text-xs font-semibold text-amber-600">
              {summary.medium} Medium
            </Text>
          </View>
        )}
        {summary.low > 0 && (
          <View className="rounded-full bg-blue-100 px-2 py-0.5">
            <Text className="text-xs font-semibold text-blue-600">
              {summary.low} Low
            </Text>
          </View>
        )}
      </View>

      {/* Conflict Cards */}
      {conflicts.map((conflict, index) => {
        const config = SEVERITY_CONFIG[conflict.severity]
        const isExpanded = expandedConflicts.has(index)

        return (
          <Pressable
            key={index}
            onPress={() => toggleConflict(index)}
            className={`rounded-2xl border ${config.borderColor} ${config.bgColor} p-3`}
          >
            <View className="flex-row items-start gap-3">
              <Icon name={config.icon} size={18} className={config.color} />
              
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className={`font-semibold ${config.color}`}>
                    {conflict.title}
                  </Text>
                  <Icon
                    name={isExpanded ? 'chevron.up' : 'chevron.down'}
                    size={14}
                    className={config.color}
                  />
                </View>

                <Text className={`mt-1 text-sm ${config.color.replace('600', '700')}`}>
                  {conflict.description}
                </Text>

                {isExpanded && (
                  <>
                    {conflict.affectedEmployees.length > 0 && (
                      <View className="mt-2">
                        <Text className={`text-xs font-semibold ${config.color}`}>
                          Affected:
                        </Text>
                        <Text className={`text-xs ${config.color.replace('600', '600')}`}>
                          {conflict.affectedEmployees.join(', ')}
                        </Text>
                      </View>
                    )}

                    <View className="mt-2 rounded-lg bg-white/50 p-2">
                      <View className="flex-row items-start gap-1">
                        <Icon name="lightbulb" size={12} className={config.color} />
                        <Text className={`flex-1 text-xs ${config.color}`}>
                          {conflict.suggestion}
                        </Text>
                      </View>
                    </View>

                    {onDismiss && (
                      <Pressable
                        onPress={() => onDismiss(conflict)}
                        className="mt-2 self-start rounded-lg bg-white px-3 py-1"
                      >
                        <Text className={`text-xs font-semibold ${config.color}`}>
                          Dismiss
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
