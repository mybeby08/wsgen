import React from 'react'
import { ActivityIndicator, RefreshControl, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useShallow } from 'zustand/react/shallow'
import { Text } from '@/components/nativewindui/Text'
import { EmployeeRow } from '@/components/employee/EmployeeRow'
import { syncDatabase } from '@/services/storage/localDatabase'
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

  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Sync database first to get latest data from remote
      await syncDatabase()
      // Then reload local data
      await loadInitialData({ force: true })
    } catch (error) {
      console.warn('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [loadInitialData])

  return (
    <FlashList
      data={employees}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing || isLoading} onRefresh={handleRefresh} />
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
      ListEmptyComponent={
        isLoading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator />
            <Text className="mt-2">Loading employees...</Text>
          </View>
        ) : null
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

