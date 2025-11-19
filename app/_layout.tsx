import '@/global.css'

import React from 'react'

import { ThemeProvider as NavThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { ThemeToggle } from '@/components/nativewindui/ThemeToggle'
import { useColorScheme } from '@/lib/useColorScheme'
import { seedInitialEmployees } from '@/services/storage/seedData'
import { NAV_THEME } from '@/theme'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme } = useColorScheme()

  React.useEffect(() => {
    void seedInitialEmployees().catch((error) => {
      console.error('Failed to seed initial employees', error)
    })
  }, [])

  return (
    <>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavThemeProvider value={NAV_THEME[colorScheme]}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={MODAL_OPTIONS} />
          </Stack>
        </NavThemeProvider>
      </GestureHandlerRootView>
    </>
  )
}

const MODAL_OPTIONS = {
  presentation: 'modal',
  animation: 'fade_from_bottom',
  title: 'Settings',
  headerRight: () => <ThemeToggle />,
} as const
