import React from 'react'
import { Pressable, View } from 'react-native'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import type { FairnessWarning } from '@/services/algorithm/realtimeFairness'

interface FairnessWarningsPanelProps {
  score: number
  warnings: FairnessWarning[]
  isCalculating?: boolean
}

export function FairnessWarningsPanel({ score, warnings, isCalculating }: FairnessWarningsPanelProps) {
  const [expanded, setExpanded] = React.useState(false)

  const scoreColor =
    score >= 80
      ? 'text-green-600 dark:text-green-400'
      : score >= 60
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

  const scoreIcon = score >= 80 ? 'checkmark.circle.fill' : score >= 60 ? 'exclamationmark.circle.fill' : 'xmark.circle.fill'

  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Needs Attention'

  const severityConfig = {
    HIGH: {
      color: 'border-l-red-500 bg-red-50 dark:bg-red-950/30',
      icon: 'exclamationmark.triangle.fill',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    MEDIUM: {
      color: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30',
      icon: 'exclamationmark.circle.fill',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    LOW: {
      color: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
      icon: 'info.circle.fill',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  }

  return (
    <View className="mb-4 rounded-2xl border border-border bg-card shadow-sm shadow-black/5">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-1 flex-row items-center gap-3">
          <Icon name={scoreIcon} size={24} className={scoreColor} />
          <View>
            <Text className="text-sm font-semibold">Fairness Score: {score}/100</Text>
            <Text color="tertiary" className="text-xs">
              {scoreLabel} • {warnings.length} {warnings.length === 1 ? 'issue' : 'issues'}
            </Text>
          </View>
        </View>

        <Icon
          name={expanded ? 'chevron.up' : 'chevron.down'}
          size={20}
          className="text-tertiary"
        />
      </Pressable>

      {expanded && (
        <View className="border-t border-border px-4 pb-4">
          {warnings.length > 0 ? (
            <View className="mt-4 gap-3">
              {warnings.map((warning, index) => {
                const config = severityConfig[warning.severity]
                return (
                  <View
                    key={index}
                    className={`rounded-lg border-l-4 p-3 ${config.color}`}
                  >
                    <View className="flex-row items-start gap-2">
                      <Icon name={config.icon} size={16} className={`mt-0.5 ${config.iconColor}`} />
                      <View className="flex-1">
                        <Text className="text-sm font-semibold">{warning.title}</Text>
                        <Text className="mt-1 text-sm text-tertiary">{warning.description}</Text>
                        {warning.affectedEmployees.length > 0 && (
                          <Text className="mt-1 text-xs text-tertiary">
                            Affected: {warning.affectedEmployees.join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <View className="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
              <View className="flex-row items-center gap-2">
                <Icon
                  name="checkmark.circle.fill"
                  size={16}
                  className="text-green-600 dark:text-green-400"
                />
                <Text className="text-sm text-green-700 dark:text-green-300">
                  No fairness issues detected
                </Text>
              </View>
            </View>
          )}

          <View className="mt-4 rounded-lg bg-muted/30 p-3">
            <View className="flex-row items-start gap-2">
              <Icon name="info.circle" size={14} className="mt-0.5 text-tertiary" />
              <Text className="flex-1 text-xs text-tertiary">
                These are suggestions only. You can save the schedule regardless of warnings.
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

