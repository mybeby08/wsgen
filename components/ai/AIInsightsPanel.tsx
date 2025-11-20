/**
 * Combined AI Insights Panel
 * Shows all AI features in one collapsible panel
 */

import React from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import { ScheduleQueryPanel } from './ScheduleQueryPanel'
import { ConflictAlerts } from './ConflictAlerts'
import { ScheduleExplanationCard } from './ScheduleExplanationCard'
import { useScheduleStore } from '@/store/scheduleStore'
import type { Schedule, Employee } from '@/types'

interface Props {
  schedule: Schedule
  employees: Employee[]
  defaultExpanded?: boolean
}

type TabType = 'conflicts' | 'query' | 'explanation'

export function AIInsightsPanel({ schedule, employees, defaultExpanded = false }: Props) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const [activeTab, setActiveTab] = React.useState<TabType>('conflicts')
  const updateAICache = useScheduleStore((state) => state.updateAICache)
  
  // Show cache indicator if data is cached
  const hasCachedData = schedule.aiCache?.timestamp
  const cacheAge = hasCachedData 
    ? Math.floor((Date.now() - new Date(hasCachedData).getTime()) / 1000 / 60)
    : null

  if (!isExpanded) {
    return (
      <Pressable
        onPress={() => setIsExpanded(true)}
        className="flex-row items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4"
      >
        <View className="flex-row items-center gap-2">
          <Icon name="sparkle" size={20} className="text-primary" />
          <Text className="font-semibold text-primary">AI Insights</Text>
        </View>
        <Icon name="chevron.down" size={16} className="text-primary" />
      </Pressable>
    )
  }

  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      {/* Header */}
      <Pressable
        onPress={() => setIsExpanded(false)}
        className="mb-3 flex-row items-center justify-between"
      >
        <View className="flex-1 flex-row items-center gap-2">
          <Icon name="sparkle" size={20} className="text-primary" />
          <Text className="text-lg font-bold">AI Insights</Text>
          {hasCachedData && cacheAge !== null && (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[10px] text-primary">
                {cacheAge < 1 ? 'Just now' : cacheAge < 60 ? `${cacheAge}m ago` : `${Math.floor(cacheAge / 60)}h ago`}
              </Text>
            </View>
          )}
        </View>
        <Icon name="chevron.up" size={16} className="text-tertiary" />
      </Pressable>

      {/* Tabs */}
      <View className="mb-4 flex-row gap-2">
        <Pressable
          onPress={() => setActiveTab('conflicts')}
          className={`flex-1 rounded-lg px-3 py-2 ${
            activeTab === 'conflicts' ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <Text
            className={`text-center text-xs font-semibold ${
              activeTab === 'conflicts' ? 'text-white' : 'text-tertiary'
            }`}
          >
            Issues
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('query')}
          className={`flex-1 rounded-lg px-3 py-2 ${
            activeTab === 'query' ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <Text
            className={`text-center text-xs font-semibold ${
              activeTab === 'query' ? 'text-white' : 'text-tertiary'
            }`}
          >
            Ask AI
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('explanation')}
          className={`flex-1 rounded-lg px-3 py-2 ${
            activeTab === 'explanation' ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <Text
            className={`text-center text-xs font-semibold ${
              activeTab === 'explanation' ? 'text-white' : 'text-tertiary'
            }`}
          >
            Summary
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'conflicts' && (
        <ConflictAlerts 
          schedule={schedule} 
          employees={employees}
          onCacheUpdate={(conflicts) => updateAICache({ conflicts })}
        />
      )}

      {activeTab === 'query' && (
        <ScheduleQueryPanel 
          schedule={schedule}
          onCacheUpdate={(queryResponses) => updateAICache({ queryResponses })}
        />
      )}

      {activeTab === 'explanation' && (
        <ScheduleExplanationCard 
          schedule={schedule} 
          employees={employees}
          onCacheUpdate={(explanation) => updateAICache({ explanation })}
        />
      )}
    </View>
  )
}
