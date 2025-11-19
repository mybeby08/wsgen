import { Pressable, View } from 'react-native'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'

interface Props {
  name: string
  isOnLeave: boolean
  onToggle: () => void
}

export function EmployeeRow({ name, isOnLeave, onToggle }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      className="mb-3 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
    >
      <Text className="text-base font-semibold">{name}</Text>
      <View className="flex-row items-center gap-2">
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
      </View>
    </Pressable>
  )
}

