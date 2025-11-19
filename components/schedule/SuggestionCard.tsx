import { View } from 'react-native'

import type { AISuggestion } from '@/types'

import { Text } from '@/components/nativewindui/Text'

interface Props {
  suggestion: AISuggestion
}

const IMPACT_COLOR: Record<AISuggestion['impact'], string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-rose-100 text-rose-700',
}

export function SuggestionCard({ suggestion }: Props) {
  const badgeClass = IMPACT_COLOR[suggestion.impact]

  return (
    <View className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-semibold">{suggestion.title}</Text>
        <Text className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {suggestion.impact}
        </Text>
      </View>
      <Text color="tertiary">{suggestion.description}</Text>
    </View>
  )
}

