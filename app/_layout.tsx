import '@/global.css'

import React from 'react'

import { ThemeProvider as NavThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import LottieView from 'lottie-react-native'
import { useShallow } from 'zustand/react/shallow'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Text } from '@/components/nativewindui/Text'
import { ThemeToggle } from '@/components/nativewindui/ThemeToggle'
import { useColorScheme } from '@/lib/useColorScheme'
import { useAppHydration } from '@/hooks/useSchedule'
import { useScheduleStore } from '@/store/scheduleStore'
import { NAV_THEME } from '@/theme'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme } = useColorScheme()
  const { hasHydrated, loadInitialData } = useAppHydration()
  const { isLoading, error } = useScheduleStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      error: state.error,
    }))
  )

  React.useEffect(() => {
    loadInitialData().catch((err) => {
      console.error('Failed to load initial data:', err)
    })
  }, [loadInitialData])

  const showSplash = !hasHydrated

  return (
    <ErrorBoundary>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavThemeProvider value={NAV_THEME[colorScheme]}>
          {showSplash ? (
            <View className="absolute inset-0 items-center justify-center bg-background">
              <View className="items-center gap-4 px-10">
                <View className="h-40 w-40">
                  <LottieView
                    source={require('../assets/loading.json')}
                    autoPlay
                    loop
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
                <Text variant="title2" className="mt-4 font-bold">
                  Work Schedule Generator
                </Text>
                <Text color="tertiary" className="mt-1 text-center">
                  Preparing your schedules...
                </Text>
                {isLoading && <ActivityIndicator className="mt-4" />}
                {error ? (
                  <Text color="secondary" className="mt-2 text-center text-red-500">
                    {error}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={MODAL_OPTIONS} />
              <Stack.Screen
                name="landscape-grid"
                options={{
                  title: 'Weekly Grid',
                  headerRight: () => <ThemeToggle />,
                }}
              />
              <Stack.Screen
                name="employee/[id]"
                options={{
                  presentation: 'card',
                  headerBackTitle: 'Employees',
                  headerRight: () => <ThemeToggle />,
                }}
              />
            </Stack>
          )}
        </NavThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}

const MODAL_OPTIONS = {
  presentation: 'modal',
  animation: 'fade_from_bottom',
  title: 'Settings',
  headerRight: () => <ThemeToggle />,
} as const
