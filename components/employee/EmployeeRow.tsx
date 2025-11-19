import React from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'

interface Props {
  employeeId: string
  name: string
  isOnLeave: boolean
  onToggle: () => void
}

export const EmployeeRow = React.memo(function EmployeeRow({ employeeId, name, isOnLeave, onToggle }: Props) {
  const router = useRouter()

  const handlePress = React.useCallback(() => {
    router.push(`/employee/${employeeId}`)
  }, [router, employeeId])

  const handleToggle = React.useCallback((e: React.BaseSyntheticEvent) => {
    e.stopPropagation()
    onToggle()
  }, [onToggle])

  return (
    <Pressable
      onPress={handlePress}
      className="mb-3 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold">{name}</Text>
        <Text color="tertiary" className="text-xs">
          Tap to view history
        </Text>
      </View>
      <Pressable onPress={handleToggle} className="flex-row items-center gap-2 pl-3">
        <Text
          className={`text-xs uppercase tracking-wide ${
            isOnLeave ? 'text-amber-600' : 'text-foreground/60'
          }`}
        >
          {isOnLeave ? 'On Leave' : 'Available'}
        </Text>
        <Icon
          name={isOnLeave ? 'moon.fill' : 'sun.max.fill'}
          className={isOnLeave ? 'text-amber-500' : 'text-emerald-500'}
        />
      </Pressable>
    </Pressable>
  )
})

