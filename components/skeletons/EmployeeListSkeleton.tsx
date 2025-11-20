import React from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

export function EmployeeListSkeleton() {
  const opacity = useSharedValue(0.3)

  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true)
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <View className="flex-1 px-4 py-6">
      {/* Search bar skeleton */}
      <Animated.View style={animatedStyle} className="mb-4 h-12 rounded-2xl bg-muted" />

      {/* Employee rows skeleton */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <Animated.View key={item} style={animatedStyle} className="mb-3 h-16 rounded-2xl bg-muted" />
      ))}
    </View>
  )
}
