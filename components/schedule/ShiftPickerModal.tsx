import React from 'react'
import { Modal, Pressable, View } from 'react-native'
import { format, parseISO } from 'date-fns'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon/Icon'
import type { ShiftType } from '@/types'
import { useShiftMetaLookup } from './useShiftMetaLookup'

interface ShiftPickerModalProps {
  visible: boolean
  employeeName: string
  date: string
  currentShift: ShiftType | 'OFF'
  onSelect: (shift: ShiftType | 'OFF') => void
  onClose: () => void
}

export function ShiftPickerModal({
  visible,
  employeeName,
  date,
  currentShift,
  onSelect,
  onClose,
}: ShiftPickerModalProps) {
  const dateFormatted = date ? format(parseISO(date), 'EEEE, MMM d') : ''

  const { workingShiftIds, getCategoryForShift, getMetaForShift } = useShiftMetaLookup()

  const options = React.useMemo<Array<{ key: ShiftType | 'OFF'; icon: any }>>(
    () => {
      const base: Array<{ key: ShiftType | 'OFF'; icon: any }> = [
        { key: 'OFF', icon: 'moon.zzz.fill' },
      ]

      workingShiftIds.forEach((id) => {
        const category = getCategoryForShift(id as ShiftType)
        const icon = category === 'EARLY' ? 'sun.max.fill' : 'moon.stars.fill'
        base.push({ key: id, icon })
      })

      return base
    },
    [workingShiftIds, getCategoryForShift],
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-end bg-black/50"
        onPress={onClose}
      >
        <Pressable
          className="w-full rounded-t-3xl bg-card p-6 shadow-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text variant="title3" className="font-semibold">
                Assign Shift
              </Text>
              <Text color="tertiary" className="mt-0.5 text-sm">
                {employeeName} • {dateFormatted}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full bg-muted p-2">
              <Icon name="xmark" size={18} />
            </Pressable>
          </View>

          <View className="gap-2">
            {options.map(({ key, icon }) => {
              const meta = getMetaForShift(key)
              const isSelected = key === currentShift
              const isOff = key === 'OFF' || !meta.isWorking

              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    onSelect(key)
                    onClose()
                  }}
                  className={[
                    'flex-row items-center gap-3 rounded-xl border p-4',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30',
                  ].join(' ')}
                >
                  <View
                    className={`rounded-full p-2 ${isOff ? 'bg-emerald-500/20' : 'bg-primary/20'}`}
                  >
                    <Icon
                      name={icon as any}
                      size={20}
                      className={isOff ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-semibold">{meta.label}</Text>
                    <Text color="tertiary" className="text-sm">
                      {meta.time}
                    </Text>
                  </View>

                  {isSelected && (
                    <Icon name="checkmark.circle.fill" size={24} className="text-primary" />
                  )}
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

