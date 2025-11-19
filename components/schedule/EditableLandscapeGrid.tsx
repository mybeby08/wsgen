import React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { format, parseISO } from 'date-fns'
import * as Haptics from 'expo-haptics'

import { Text } from '@/components/nativewindui/Text'
import type { DailySchedule, ShiftType } from '@/types'
import { useShiftMetaLookup } from './useShiftMetaLookup'
import { ShiftPickerModal } from './ShiftPickerModal'

interface EditableLandscapeGridProps {
  days: DailySchedule[]
  employeeNames: Record<string, string>
  onUpdateAssignment: (date: string, employeeId: string, newShift: ShiftType | 'OFF') => void
}

export function EditableLandscapeGrid({
  days,
  employeeNames,
  onUpdateAssignment,
}: EditableLandscapeGridProps) {
  const [pickerVisible, setPickerVisible] = React.useState(false)
  const [selectedCell, setSelectedCell] = React.useState<{
    employeeId: string
    employeeName: string
    date: string
    shift: ShiftType | 'OFF'
  } | null>(null)

  const { getMetaForShift, workingShiftIds } = useShiftMetaLookup()

  const shiftCycle = React.useMemo<Array<ShiftType | 'OFF'>>(
    () => ['OFF', ...workingShiftIds],
    [workingShiftIds],
  )

  const employeeIds = Object.keys(employeeNames)

  const handleTap = (date: string, employeeId: string, currentShift: ShiftType | 'OFF') => {
    if (!shiftCycle.length) return
    const currentIndex = Math.max(0, shiftCycle.indexOf(currentShift))
    const nextIndex = (currentIndex + 1) % shiftCycle.length
    const nextShift = shiftCycle[nextIndex]

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onUpdateAssignment(date, employeeId, nextShift)
  }

  const handleLongPress = (
    date: string,
    employeeId: string,
    employeeName: string,
    currentShift: ShiftType | 'OFF',
  ) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSelectedCell({ employeeId, employeeName, date, shift: currentShift })
    setPickerVisible(true)
  }

  const handlePickerSelect = (newShift: ShiftType | 'OFF') => {
    if (selectedCell) {
      onUpdateAssignment(selectedCell.date, selectedCell.employeeId, newShift)
    }
  }

  return (
    <>
      <View className="mb-2 flex-row items-center gap-1">
        <Text className="text-xs text-primary">✏️ Tap cells to cycle shifts</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="rounded-3xl border border-primary/50 bg-card shadow-sm shadow-black/10">
          <View className="flex-row rounded-t-3xl bg-muted/40">
            <View className="w-40 px-3 py-4">
              <Text className="text-xs uppercase tracking-widest text-tertiary">Employee</Text>
            </View>
            {days.map((day) => {
              const parsed = parseISO(day.date)
              return (
                <View
                  key={day.date}
                  className="w-32 border-l border-border/40 px-3 py-4"
                >
                  <Text className="text-[11px] uppercase tracking-widest text-tertiary">
                    {format(parsed, 'EEE')}
                  </Text>
                  <Text className="text-base font-semibold">{format(parsed, 'MMM d')}</Text>
                </View>
              )
            })}
          </View>

          {employeeIds.map((employeeId, employeeIndex) => {
            const employeeName = employeeNames[employeeId]
            const zebra = employeeIndex % 2 === 0 ? 'bg-muted/10' : 'bg-card'

            const rowAssignments = days.reduce<
              Record<string, { shift: ShiftType | 'OFF'; scannerId?: number }>
            >((acc, day) => {
              const assignment = day.assignments.find((a) => a.employeeId === employeeId)
              if (assignment) {
                acc[day.date] = {
                  shift: assignment.shift,
                  scannerId: assignment.scannerId,
                }
              }
              return acc
            }, {})

            return (
              <View
                key={employeeId}
                className={`flex-row border-t border-border/50 ${zebra}`}
              >
                <View className="w-40 px-3 py-4">
                  <Text className="text-sm font-semibold">{employeeName}</Text>
                  <Text color="tertiary" className="text-xs">
                    Staff
                  </Text>
                </View>
                {days.map((day) => {
                  const assignment = rowAssignments[day.date]
                  const meta = getMetaForShift(assignment?.shift ?? 'OFF')
                  const isOff = !meta.isWorking
                  return (
                    <Pressable
                      key={`${employeeId}-${day.date}`}
                      onPress={() => handleTap(day.date, employeeId, assignment?.shift ?? 'OFF')}
                      onLongPress={() =>
                        handleLongPress(day.date, employeeId, employeeName, assignment?.shift ?? 'OFF')
                      }
                      className="w-32 border-l border-border/40 px-3 py-3 active:bg-primary/10"
                    >
                      <Text
                        className={`text-xs uppercase tracking-widest ${isOff ? 'text-emerald-600 dark:text-emerald-300' : 'text-tertiary'}`}
                      >
                        {isOff ? 'Off' : meta.label}
                      </Text>
                      <Text className="text-sm font-semibold">{meta.time}</Text>
                      {assignment?.scannerId ? (
                        <Text className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          Scanner {assignment.scannerId}
                        </Text>
                      ) : (
                        <Text color="tertiary" className="mt-1 text-xs">
                          {meta.note}
                        </Text>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {selectedCell && (
        <ShiftPickerModal
          visible={pickerVisible}
          employeeName={selectedCell.employeeName}
          date={selectedCell.date}
          currentShift={selectedCell.shift}
          onSelect={handlePickerSelect}
          onClose={() => {
            setPickerVisible(false)
            setSelectedCell(null)
          }}
        />
      )}
    </>
  )
}

