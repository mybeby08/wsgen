import React from 'react'
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import { format, parseISO } from 'date-fns'

import { Text } from '@/components/nativewindui/Text'
import { useShiftMetaLookup } from '@/components/schedule/useShiftMetaLookup'
import { useScheduleStore } from '@/store/scheduleStore'
import type { Schedule } from '@/types'

export default function LandscapeGridScreen() {
  const { schedule, employees, isLoading } = useScheduleStore(
    useShallow((state) => ({
      schedule: state.schedule,
      employees: state.employees,
      isLoading: state.isLoading,
    })),
  )

  const employeeNames = React.useMemo(
    () =>
      employees.reduce<Record<string, string>>((acc, employee) => {
        acc[employee.id] = employee.name
        return acc
      }, {}),
    [employees],
  )

  const employeeOrder = React.useMemo(() => employees.map((employee) => employee.id), [employees])

  const { width, height } = useWindowDimensions()
  const isLandscape = width > height

  const days = React.useMemo(
    () =>
      schedule?.dailySchedules
        ? schedule.dailySchedules.slice().sort((a, b) => {
            const left = parseISO(a.date).getTime()
            const right = parseISO(b.date).getTime()
            return left - right
          })
        : [],
    [schedule?.dailySchedules],
  )

  const rows = React.useMemo(() => {
    if (!schedule) return []
    if (employeeOrder.length) return employeeOrder
    const ids = new Set<string>()
    schedule.dailySchedules.forEach((daily) => {
      daily.assignments.forEach((assignment) => ids.add(assignment.employeeId))
    })
    return Array.from(ids)
  }, [employeeOrder, schedule])

  const assignmentsByEmployee = React.useMemo(() => {
    const map = new Map<
      string,
      Record<string, Schedule['dailySchedules'][number]['assignments'][number]>
    >()

    if (!schedule) return map

    schedule.dailySchedules.forEach((daily) => {
      daily.assignments.forEach((assignment) => {
        if (!map.has(assignment.employeeId)) {
          map.set(assignment.employeeId, {})
        }
        map.get(assignment.employeeId)![daily.date] = assignment
      })
    })
    return map
  }, [schedule])

  const { getMetaForShift } = useShiftMetaLookup()

  const getShiftHours = React.useCallback(
    (shiftKey: any): number => {
      const meta = getMetaForShift(shiftKey ?? 'OFF')
      if (!meta.isWorking) return 0

      const parts = meta.time.split(' - ')
      if (parts.length !== 2) return 0

      const [startStr, endStr] = parts
      const [startH, startM] = startStr.split(':').map((v) => parseInt(v, 10))
      const [endH, endM] = endStr.split(':').map((v) => parseInt(v, 10))

      if (
        Number.isNaN(startH) ||
        Number.isNaN(startM) ||
        Number.isNaN(endH) ||
        Number.isNaN(endM)
      ) {
        return 0
      }

      const startMinutes = startH * 60 + startM
      let endMinutes = endH * 60 + endM

      // Remove 1 hour break from closing time, as requested
      endMinutes -= 60

      const durationMinutes = Math.max(0, endMinutes - startMinutes)
      return durationMinutes / 60
    },
    [getMetaForShift],
  )

  const [zoom, setZoom] = React.useState(1)
  const MIN_ZOOM = 0.7
  const MAX_ZOOM = 1

  const handleZoomOut = React.useCallback(() => {
    setZoom((value) => Math.max(value - 0.1, MIN_ZOOM))
  }, [])

  const handleZoomIn = React.useCallback(() => {
    setZoom((value) => Math.min(value + 0.1, MAX_ZOOM))
  }, [])

  const handleResetZoom = React.useCallback(() => {
    setZoom(1)
  }, [])

  const dayCount = days.length || 1
  const horizontalPadding = 32
  const gridWidth = Math.max(width - horizontalPadding, 320)
  const nameColumnWidth = gridWidth * 0.18
  const valueColumnCount = dayCount + 1 // days + total hours
  const dayColumnWidth = (gridWidth - nameColumnWidth) / valueColumnCount

  if (isLoading && !schedule) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-3">Loading schedule...</Text>
      </View>
    )
  }

  if (!schedule) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center font-semibold">No schedule to display</Text>
        <Text color="tertiary" className="mt-2 text-center text-sm">
          Generate a schedule from the main Schedule tab to view the weekly grid.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="mb-2 flex-row items-center justify-between">
        <View>
          <Text variant="title3" className="font-semibold">
            Weekly Grid
          </Text>
          <Text color="tertiary" className="text-[11px]">
            {isLandscape
              ? 'Showing full week in landscape.'
              : 'Rotate device to landscape for best view.'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handleZoomOut}
            className="h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background"
          >
            <Text className="text-xs font-semibold">-</Text>
          </Pressable>
          <Text className="w-10 text-center text-[10px] font-semibold">
            {Math.round(zoom * 100)}%
          </Text>
          <Pressable
            onPress={handleZoomIn}
            className="h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background"
          >
            <Text className="text-xs font-semibold">+</Text>
          </Pressable>
          {zoom !== 1 && (
            <Pressable
              onPress={handleResetZoom}
              className="ml-1 rounded-full border border-border/70 px-2 py-0.5"
            >
              <Text className="text-[9px] font-semibold uppercase tracking-widest">Reset</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="items-center">
        <View style={{ transform: [{ scale: zoom }] }}>
          <View
            className="rounded-3xl border border-border bg-card shadow-sm shadow-black/10"
            style={{ width: gridWidth }}
          >
            <View className="flex-row rounded-t-3xl bg-muted/40">
              <View style={{ width: nameColumnWidth }} className="px-2 py-2">
              <Text className="text-xs uppercase tracking-widest text-tertiary">Employee</Text>
              </View>
              {days.map((day) => {
                const parsed = parseISO(day.date)
                return (
                  <View
                    key={day.date}
                    style={{ width: dayColumnWidth }}
                    className="border-l border-border/40 px-2 py-2"
                  >
                    <Text className="text-[11px] uppercase tracking-widest text-tertiary">
                      {format(parsed, 'EEE')}
                    </Text>
                    <Text className="text-xs font-semibold">{format(parsed, 'MMM d')}</Text>
                  </View>
                )
              })}
              <View
                style={{ width: dayColumnWidth }}
                className="border-l border-border/40 px-2 py-2 items-center justify-center"
              >
                <Text className="text-[11px] uppercase tracking-widest text-tertiary">
                  Hours
                </Text>
              </View>
            </View>

          {rows.map((employeeId, rowIndex) => {
            const employeeName = employeeNames[employeeId] ?? employeeId
            const rowAssignments = assignmentsByEmployee.get(employeeId) ?? {}
            const zebra = rowIndex % 2 === 0 ? 'bg-background/60' : 'bg-card'
            const role = getMetaForShift(rowAssignments[days[0].date]?.shift ?? 'OFF').role

            const weeklyHours = days.reduce((total, day) => {
              const assignment = rowAssignments[day.date]
              return total + getShiftHours(assignment?.shift)
            }, 0)

            return (
              <View
                key={employeeId}
                className={`flex-row border-t border-border/50 ${zebra}`}
              >
                <View style={{ width: nameColumnWidth }} className="px-2 py-2">
                  <Text className="text-xs font-semibold">{employeeName}</Text>
                  <Text color="tertiary" className="text-[10px]">
                    {role}
                  </Text>
                </View>
                {days.map((day) => {
                  const assignment = rowAssignments[day.date]
                  const meta = getMetaForShift(assignment?.shift ?? 'OFF')
                  const isOff = !meta.isWorking

                  return (
                    <View
                      key={`${employeeId}-${day.date}`}
                      style={{ width: dayColumnWidth }}
                      className="border-l border-border/40 px-2 py-1.5 items-center justify-center"
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          isOff
                            ? 'text-emerald-600 dark:text-emerald-300'
                            : 'text-blue-600'
                        }`}
                      >
                        {isOff ? 'Off' : meta.time}
                      </Text>
                    </View>
                  )
                })}
                <View
                  style={{ width: dayColumnWidth }}
                  className="border-l border-border/40 px-2 py-1.5 items-center justify-center"
                >
                  <Text className="text-[11px] font-semibold text-red-600">
                    {weeklyHours}h
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>
      </View>
    </ScrollView>
  )
}
