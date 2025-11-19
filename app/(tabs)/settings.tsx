import React from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import type { SfSymbols } from 'rn-icon-mapper'
import { hasGeminiApiKey } from '@/services/ai/geminiClient'
import { syncToCloud } from '@/services/sync/syncEngine'
import { useScheduleStore } from '@/store/scheduleStore'

export default function SettingsScreen() {
  const netInfo = useNetInfo()
  const schedule = useScheduleStore((state) => state.schedule)

  const handleSync = React.useCallback(() => {
    void syncToCloud()
      .then(() => Alert.alert('Sync started', 'Background sync has been triggered.'))
      .catch(() => Alert.alert('Sync failed', 'Unable to start sync right now.'))
  }, [])

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text variant="title2" className="mb-3 font-bold">
        App status
      </Text>

      <SettingRow
        icon="wifi"
        title="Connectivity"
        description={netInfo.isConnected ? 'Online' : 'Offline'}
        status={netInfo.isConnected ? 'Good' : 'Offline'}
        statusColor={netInfo.isConnected ? 'text-emerald-500' : 'text-rose-500'}
      />

      <SettingRow
        icon="sparkle"
        title="Gemini AI"
        description={hasGeminiApiKey() ? 'Key detected' : 'Missing API key'}
        status={hasGeminiApiKey() ? 'Enabled' : 'Disabled'}
        statusColor={hasGeminiApiKey() ? 'text-emerald-500' : 'text-rose-500'}
      />

      <SettingRow
        icon="calendar"
        title="Current schedule"
        description={schedule ? 'Ready to share' : 'Pending generation'}
        status={schedule ? 'Available' : 'Missing'}
        statusColor={schedule ? 'text-emerald-500' : 'text-amber-500'}
      />

      <View className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5">
        <Text className="mb-2 text-base font-semibold">Manual Sync</Text>
        <Text color="tertiary">
          Runs the sync engine immediately. Useful after editing employees or schedules offline.
        </Text>
        <Text className="mt-4 rounded-2xl bg-primary px-4 py-3 text-center text-base font-semibold text-white" onPress={handleSync}>
          Run sync now
        </Text>
      </View>
    </ScrollView>
  )
}

interface SettingRowProps {
  icon: SfSymbols
  title: string
  description: string
  status: string
  statusColor: string
}

function SettingRow({ icon, title, description, status, statusColor }: SettingRowProps) {
  return (
    <View className="mb-4 flex-row items-center gap-3 rounded-3xl border border-border bg-card p-4">
      <Icon name={icon} className="text-foreground" />
      <View className="flex-1">
        <Text className="font-semibold">{title}</Text>
        <Text color="tertiary">{description}</Text>
      </View>
      <Text className={`text-xs uppercase tracking-wide ${statusColor}`}>{status}</Text>
    </View>
  )
}

