import React from 'react'
import { Pressable, View, ActivityIndicator } from 'react-native'
import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import { explainSchedule } from '@/services/ai'
import type { Schedule, Employee } from '@/types'

interface Props {
  schedule: Schedule
  employees: Employee[]
  onCacheUpdate?: (explanation: any) => void
}

export function ScheduleExplanationCard({ schedule, employees, onCacheUpdate }: Props) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [explanation, setExplanation] = React.useState<{
    summary: string
    keyPoints: string[]
    employeeNotes: Record<string, string>
  } | null>(null)

  const handleLoadExplanation = React.useCallback(async () => {
    if (explanation) {
      setIsExpanded(!isExpanded)
      return
    }

    // Check cache first
    if (schedule.aiCache?.explanation) {
      setExplanation(schedule.aiCache.explanation)
      setIsExpanded(true)
      return
    }

    setIsLoading(true)
    try {
      const result = await explainSchedule(schedule, employees)
      if (result) {
        setExplanation(result)
        setIsExpanded(true)
        
        // Cache the explanation
        if (onCacheUpdate) {
          onCacheUpdate(result)
        }
      }
    } catch (error) {
      console.error('Failed to load explanation', error)
    } finally {
      setIsLoading(false)
    }
  }, [schedule, employees, explanation, isExpanded, onCacheUpdate])

  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <Pressable onPress={handleLoadExplanation} className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Icon name="doc" size={18} className="text-primary" />
          <Text className="font-semibold">Schedule Summary</Text>
        </View>
        
        {isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Icon
            name={isExpanded ? 'chevron.up' : 'chevron.down'}
            size={16}
            className="text-tertiary"
          />
        )}
      </Pressable>

      {isExpanded && explanation && (
        <View className="mt-3 gap-3">
          {/* Summary */}
          <View className="rounded-xl bg-primary/5 p-3">
            <Text className="text-sm leading-5">{explanation.summary}</Text>
          </View>

          {/* Key Points */}
          {explanation.keyPoints.length > 0 && (
            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Key Points
              </Text>
              <View className="gap-2">
                {explanation.keyPoints.map((point, index) => (
                  <View key={index} className="flex-row items-start gap-2">
                    <Icon name="checkmark.circle" size={14} className="mt-0.5 text-green-600" />
                    <Text className="flex-1 text-sm">{point}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Employee Notes */}
          {Object.keys(explanation.employeeNotes).length > 0 && (
            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Employee Notes
              </Text>
              <View className="gap-2">
                {Object.entries(explanation.employeeNotes).map(([name, note]) => (
                  <View key={name} className="rounded-lg border border-border bg-background p-2">
                    <Text className="text-xs font-semibold">{name}</Text>
                    <Text className="mt-0.5 text-xs text-tertiary">{note}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
