import React from 'react'
import { Pressable, TextInput, View, ActivityIndicator, ScrollView } from 'react-native'
import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import { askScheduleQuestion, getSuggestedQuestions } from '@/services/ai'
import type { Schedule } from '@/types'

interface Props {
  schedule: Schedule
  onCacheUpdate?: (queryResponses: Record<string, any>) => void
}

export function ScheduleQueryPanel({ schedule, onCacheUpdate }: Props) {
  const [query, setQuery] = React.useState('')
  const [answer, setAnswer] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [confidence, setConfidence] = React.useState<number | null>(null)

  const suggestedQuestions = React.useMemo(
    () => getSuggestedQuestions(schedule),
    [schedule]
  )

  const handleAskQuestion = React.useCallback(
    async (question: string) => {
      if (!question.trim()) return

      setIsLoading(true)
      setAnswer(null)
      setConfidence(null)

      try {
        // Check cache first
        const cachedResponse = schedule.aiCache?.queryResponses?.[question]
        if (cachedResponse) {
          setAnswer(cachedResponse.answer)
          setConfidence(cachedResponse.confidence)
          setIsLoading(false)
          return
        }

        const result = await askScheduleQuestion(question, schedule)
        if (result) {
          setAnswer(result.answer)
          setConfidence(result.confidence)
          
          // Cache the response
          if (onCacheUpdate) {
            onCacheUpdate({
              ...schedule.aiCache?.queryResponses,
              [question]: { answer: result.answer, confidence: result.confidence }
            })
          }
        } else {
          setAnswer('AI feature not available. Please check your API key configuration.')
        }
      } catch (error) {
        setAnswer('Failed to process your question. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [schedule]
  )

  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <Icon name="sparkle" size={18} className="text-primary" />
        <Text className="font-semibold">Ask AI About This Schedule</Text>
      </View>

      {/* Input Area */}
      <View className="mb-3">
        <View className="flex-row items-center gap-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="e.g., Who works the most days?"
            placeholderTextColor="#999"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-foreground"
            onSubmitEditing={() => handleAskQuestion(query)}
          />
          <Pressable
            onPress={() => handleAskQuestion(query)}
            disabled={isLoading || !query.trim()}
            className="rounded-xl bg-primary px-4 py-3 disabled:opacity-50"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="arrow.up" size={18} className="text-white" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Suggested Questions */}
      {!answer && !isLoading && (
        <View className="mb-3">
          <Text color="tertiary" className="mb-2 text-xs">
            Try asking:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {suggestedQuestions.map((q, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    setQuery(q)
                    handleAskQuestion(q)
                  }}
                  className="rounded-full border border-border bg-background px-3 py-1.5"
                >
                  <Text className="text-xs">{q}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Answer Display */}
      {answer && (
        <View className="rounded-xl bg-primary/10 p-3">
          <View className="mb-1 flex-row items-center gap-2">
            <Icon name="lightbulb" size={14} className="text-primary" />
            <Text className="text-xs font-semibold text-primary">Answer</Text>
            {confidence !== null && (
              <Text className="text-xs text-primary/70">
                ({Math.round(confidence * 100)}% confident)
              </Text>
            )}
          </View>
          <Text className="text-sm">{answer}</Text>
        </View>
      )}
    </View>
  )
}
