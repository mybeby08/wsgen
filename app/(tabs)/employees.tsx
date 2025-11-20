import React from 'react'
import { RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useShallow } from 'zustand/react/shallow'
import { Text } from '@/components/nativewindui/Text'
import { EmployeeRow } from '@/components/employee/EmployeeRow'
import { EmployeeListSkeleton } from '@/components/skeletons/EmployeeListSkeleton'
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

  if (isLoading && employees.length === 0) {
    return <EmployeeListSkeleton />
  }

  return (
    <FlashList
      data={employees}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => void loadInitialData({ force: true })} />
      }
      ListHeaderComponent={
        <>
          <Text variant="title2" className="mb-3 font-bold">
            {employees.length} Team Members
          </Text>
          <Text color="tertiary" className="mb-4">
            Tap a person to toggle leave status. Leave changes sync to your local schedule generator.
          </Text>
        </>
      }
      renderItem={({ item }) => (
        <EmployeeRow
          employeeId={item.id}
          name={item.name}
          isOnLeave={item.isOnLeave}
          onToggle={() => void toggleLeaveStatus(item.id)}
        />
      )}
    />
  )
}

