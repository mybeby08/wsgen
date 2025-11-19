import React from 'react'
import { Tabs } from 'expo-router'

import { Icon } from '@/components/nativewindui/Icon'
import { useColorScheme } from '@/lib/useColorScheme'

export default function TabsLayout() {
  const { colors } = useColorScheme()

  const screenOptions = React.useMemo(() => ({
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.grey,
    tabBarStyle: {
      backgroundColor: colors.background,
    },
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerTintColor: colors.foreground,
  }), [colors])

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Icon name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ color, size }) => <Icon name="person.2" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Icon name="clock" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Icon name="gearshape" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}

