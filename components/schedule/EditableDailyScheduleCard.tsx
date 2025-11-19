import React from 'react'
import { Pressable, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import type { DailySchedule, ShiftType } from '@/types'
import { useShiftMetaLookup } from './useShiftMetaLookup'
import { formatDay } from '@/utils/date'
import { ShiftPickerModal } from './ShiftPickerModal'

interface EditableDailyScheduleCardProps {
  schedule: DailySchedule
  employeeNames: Record<string, string>
  onUpdateAssignment: (employeeId: string, newShift: ShiftType | 'OFF') => void
}

export function EditableDailyScheduleCard({
  schedule,
  employeeNames,
  onUpdateAssignment,
}: EditableDailyScheduleCardProps) {
  const [pickerVisible, setPickerVisible] = React.useState(false)
  const [selectedEmployee, setSelectedEmployee] = React.useState<{
    id: string
    name: string
    shift: ShiftType | 'OFF'
  } | null>(null)

  const { getMetaForShift, workingShiftIds } = useShiftMetaLookup()

  const shiftCycle = React.useMemo<Array<ShiftType | 'OFF'>>(
    () => ['OFF', ...workingShiftIds],
    [workingShiftIds],
  )

  const handleTap = (employeeId: string, currentShift: ShiftType | 'OFF') => {
    if (!shiftCycle.length) return
    const currentIndex = Math.max(0, shiftCycle.indexOf(currentShift))
    const nextIndex = (currentIndex + 1) % shiftCycle.length
    const nextShift = shiftCycle[nextIndex]

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onUpdateAssignment(employeeId, nextShift)
  }

  const handleLongPress = (employeeId: string, employeeName: string, currentShift: ShiftType | 'OFF') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSelectedEmployee({ id: employeeId, name: employeeName, shift: currentShift })
    setPickerVisible(true)
  }

  const handlePickerSelect = (newShift: ShiftType | 'OFF') => {
    if (selectedEmployee) {
      onUpdateAssignment(selectedEmployee.id, newShift)
    }
  }

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold">{formatDay(schedule.date)}</Text>
        <View className="flex-row items-center gap-1">
          <Icon name="pencil" size={12} className="text-primary" />
          <Text className="text-xs text-primary">Tap to cycle</Text>
        </View>
      </View>

      <View className="rounded-2xl border border-primary/50 bg-card shadow-sm shadow-black/5">
        <View className="flex-row border-b border-border/50 bg-muted/40 px-4 py-3">
          <Text className="flex-[2] pr-3 text-xs uppercase tracking-widest text-tertiary">
            Employee
          </Text>
          <Text className="flex-[2] pr-3 text-xs uppercase tracking-widest text-tertiary">
            Assignment
          </Text>
          <Text className="flex-1 text-right text-xs uppercase tracking-widest text-tertiary">
            Hours
          </Text>
        </View>

        {schedule.assignments.map((assignment, index) => {
          const employee = employeeNames[assignment.employeeId] || 'Unknown'
          const meta = getMetaForShift(assignment.shift)
          const isOff = !meta.isWorking
          const zebra = index % 2 === 0 ? 'bg-muted/10' : 'bg-card'

          return (
            <Pressable
              key={assignment.employeeId}
              onPress={() => handleTap(assignment.employeeId, assignment.shift)}
              onLongPress={() => handleLongPress(assignment.employeeId, employee, assignment.shift)}
              className={[
                'flex-row border-t border-border/50 px-4 py-3',
                zebra,
                'active:bg-primary/10',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <View className="flex-[2] pr-3">
                <Text className="text-sm font-semibold">{employee}</Text>
                <View className="mt-1 flex-row flex-wrap items-center gap-2">
                  <Text color="tertiary" className="text-xs">
                    {meta.role}
                  </Text>
                  {assignment.scannerId ? (
                    <Text className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Scanner {assignment.scannerId}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="flex-[2] pr-3">
                <Text className={`text-sm font-semibold ${isOff ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                  {meta.label}
                </Text>
                <Text color="tertiary" className="text-xs capitalize">
                  {assignment.shift.replace('_', ' ').toLowerCase()}
                </Text>
              </View>

              <View className="flex-1 items-end">
                <Text className="text-sm font-semibold">{meta.time}</Text>
                <Text color="tertiary" className="text-xs">
                  {meta.note}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {selectedEmployee && (
        <ShiftPickerModal
          visible={pickerVisible}
          employeeName={selectedEmployee.name}
          date={schedule.date}
          currentShift={selectedEmployee.shift}
          onSelect={handlePickerSelect}
          onClose={() => {
            setPickerVisible(false)
            setSelectedEmployee(null)
          }}
        />
      )}
    </View>
  )
}

