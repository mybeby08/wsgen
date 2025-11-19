import React from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import { Text } from '@/components/nativewindui/Text'
import { EmployeeRow } from '@/components/employee/EmployeeRow'
import { useScheduleStore } from '@/store/scheduleStore'

export default function EmployeesScreen() {
  const { employees, isLoading, loadInitialData, toggleLeaveStatus } = useScheduleStore(
    useShallow((state) => ({
      employees: state.employees,
      isLoading: state.isLoading,
      loadInitialData: state.loadInitialData,
      toggleLeaveStatus: state.toggleLeaveStatus,
    })),
  )

  React.useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => void loadInitialData({ force: true })} />
      }
    >
      <Text variant="title2" className="mb-3 font-bold">
        14 Team Members
      </Text>
      <Text color="tertiary" className="mb-4">
        Tap a person to toggle leave status. Leave changes sync to your local schedule generator.
      </Text>

      {isLoading && !employees.length ? (
        <View className="mt-20 items-center">
          <ActivityIndicator />
          <Text className="mt-2">Loading employees...</Text>
        </View>
      ) : null}

      {employees.map((employee) => (
        <EmployeeRow
          key={employee.id}
          name={employee.name}
          isOnLeave={employee.isOnLeave}
          onToggle={() => void toggleLeaveStatus(employee.id)}
        />
      ))}
    </ScrollView>
  )
}

