import React from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { Icon } from '@/components/nativewindui/Icon'
import { Text } from '@/components/nativewindui/Text'
import { ScheduleSkeleton } from '@/components/skeletons/ScheduleSkeleton'
import { DailyScheduleCard } from '@/components/schedule/DailyScheduleCard'
import { EditableDailyScheduleCard } from '@/components/schedule/EditableDailyScheduleCard'
import { SuggestionCard } from '@/components/schedule/SuggestionCard'
import { LandscapeScheduleGrid } from '@/components/schedule/LandscapeScheduleGrid'
import { EditableLandscapeGrid } from '@/components/schedule/EditableLandscapeGrid'
import { WeekSelector } from '@/components/schedule/WeekSelector'
import { FairnessWarningsPanel } from '@/components/schedule/FairnessWarningsPanel'
import { AIInsightsPanel } from '@/components/ai'
import { useScheduleStore } from '@/store/scheduleStore'
import { useShallow } from 'zustand/react/shallow'
import { calculateLiveFairness } from '@/services/algorithm/realtimeFairness'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useShiftMetaStore } from '@/store/shiftMetaStore'
import { useRouter } from 'expo-router'

export default function ScheduleScreen() {
  const router = useRouter()
  const progressWidth = useSharedValue(0)
  const {
    schedule,
    employees,
    isLoading,
    isGenerating,
    generationProgress,
    loadInitialData,
    generateSchedule,
    currentWeekStarting,
    selectedWeekOffset,
    weekSchedules,
    setWeekOffset,
    navigateWeek,
    isEditMode,
    editableSchedule,
    editHistory,
    enterEditMode,
    exitEditMode,
    updateAssignment,
    undoLastEdit,
    error,
    aiInsightsEnabled,
  } = useScheduleStore(
    useShallow((state) => ({
      schedule: state.schedule,
      employees: state.employees,
      isLoading: state.isLoading,
      isGenerating: state.isGenerating,
      generationProgress: state.generationProgress,
      loadInitialData: state.loadInitialData,
      generateSchedule: state.generateSchedule,
      currentWeekStarting: state.currentWeekStarting,
      selectedWeekOffset: state.selectedWeekOffset,
      weekSchedules: state.weekSchedules,
      setWeekOffset: state.setWeekOffset,
      navigateWeek: state.navigateWeek,
      isEditMode: state.isEditMode,
      editableSchedule: state.editableSchedule,
      editHistory: state.editHistory,
      enterEditMode: state.enterEditMode,
      exitEditMode: state.exitEditMode,
      updateAssignment: state.updateAssignment,
      undoLastEdit: state.undoLastEdit,
      error: state.error,
      aiInsightsEnabled: state.aiInsightsEnabled,
    })),
  )
  const { width, height } = useWindowDimensions()
  const isLandscapeOrientation = width > height

  const loadShiftMetas = useShiftMetaStore((state) => state.load)

  React.useEffect(() => {
    void loadShiftMetas()
  }, [loadShiftMetas])

  // Animate progress bar
  React.useEffect(() => {
    progressWidth.value = withSpring(generationProgress, {
      damping: 20,
      stiffness: 90,
    })
  }, [generationProgress])

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }))

  const [manualGridView, setManualGridView] = React.useState(false)
  const isGridView = isLandscapeOrientation || manualGridView

  const employeeNames = React.useMemo(
    () =>
      employees.reduce<Record<string, string>>((acc, employee) => {
        acc[employee.id] = employee.name
        return acc
      }, {}),
    [employees],
  )

  const employeeOrder = React.useMemo(() => employees.map((employee) => employee.id), [employees])

  // Calculate live fairness for editable schedule
  const currentSchedule = isEditMode ? editableSchedule : schedule
  const debouncedSchedule = useDebouncedValue(currentSchedule, 500)

  const fairnessResult = React.useMemo(() => {
    if (!debouncedSchedule || !isEditMode) return null
    return calculateLiveFairness(debouncedSchedule, employeeNames)
  }, [debouncedSchedule, employeeNames, isEditMode])

  const handleGenerate = React.useCallback(() => {
    void generateSchedule()
  }, [generateSchedule])

  const handleUpdateAssignment = React.useCallback(
    (date: string, employeeId: string, newShift: any) => {
      updateAssignment(date, employeeId, newShift)
    },
    [updateAssignment],
  )

  const canGenerateForThisWeek = selectedWeekOffset >= 0
  const isPastWeek = selectedWeekOffset < 0

  if (isLoading && !schedule) {
    return <ScheduleSkeleton />
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => void loadInitialData({ force: true })}
          enabled={!isEditMode}
        />
      }
    >
      {/* Edit Mode Banner */}
      {isEditMode && (
        <View className="mb-4 rounded-2xl border border-primary bg-primary/10 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-primary">
                ✏️ Editing Schedule
              </Text>
              <Text className="text-xs text-primary/70">
                Changes not saved yet
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => void exitEditMode(false)}
                className="rounded-full border border-border/70 px-3 py-1.5"
              >
                <Text className="text-xs font-semibold uppercase tracking-widest">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={undoLastEdit}
                disabled={editHistory.length === 0}
                className={`rounded-full border border-border/70 px-3 py-1.5 ${editHistory.length === 0 ? 'opacity-40' : ''}`}
              >
                <Text className="text-xs font-semibold uppercase tracking-widest">
                  Undo
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void exitEditMode(true)}
                className="rounded-full bg-primary px-3 py-1.5"
              >
                <Text className="text-xs font-semibold uppercase tracking-widest text-white">
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Week Selector */}
      <WeekSelector
        currentOffset={selectedWeekOffset}
        weekSchedules={weekSchedules}
        onSelectWeek={(offset) => void setWeekOffset(offset)}
        onNavigate={(direction) => void navigateWeek(direction)}
      />

      {/* Fairness Badge */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text variant="title3" className="font-semibold">
          {isPastWeek ? 'Past Schedule' : selectedWeekOffset === 0 ? 'This Week' : `${selectedWeekOffset} Week${selectedWeekOffset > 1 ? 's' : ''} Ahead`}
        </Text>
        <View className="items-end">
          <Text color="tertiary" className="text-xs uppercase tracking-widest">
            Fairness
          </Text>
          <Text variant="title2" className="font-bold">
            {currentSchedule?.fairnessScore ?? '--'}
          </Text>
        </View>
      </View>

      {/* Live Fairness Warnings (Edit Mode Only) */}
      {isEditMode && fairnessResult && (
        <FairnessWarningsPanel
          score={fairnessResult.score}
          warnings={fairnessResult.warnings}
        />
      )}

      {/* Generate / Edit Controls */}
      {!isEditMode && (
        <View className="mb-6 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold">
              {currentSchedule ? 'Manage Schedule' : 'Create Schedule'}
            </Text>
            <Icon name="sparkle" className="text-primary" />
          </View>
          <Text color="tertiary" className="mt-1 text-sm">
            {currentSchedule
              ? 'Edit manually or generate a new version'
              : 'Uses fairness algorithm + Gemini AI suggestions'}
          </Text>
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-border/80 bg-background px-4 py-2">
              <Text color="tertiary" className="text-xs uppercase tracking-wide">
                Employees
              </Text>
              <Text variant="title2">{employees.length}</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-border/80 bg-background px-4 py-2">
              <Text color="tertiary" className="text-xs uppercase tracking-wide">
                Status
              </Text>
              <Text variant="title2">{currentSchedule ? (currentSchedule.validated ? 'AI' : 'Manual') : 'None'}</Text>
            </View>
          </View>
          <View className="mt-4 flex-row gap-3">
            {currentSchedule && (
              <Pressable
                onPress={enterEditMode}
                className="flex-1 rounded-2xl border border-primary bg-primary/10 px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-primary">
                  ✏️ Edit Schedule
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleGenerate}
              disabled={!canGenerateForThisWeek || isGenerating}
              className={`relative flex-1 overflow-hidden rounded-2xl px-4 py-3 ${
                canGenerateForThisWeek && !isGenerating
                  ? 'bg-primary'
                  : 'bg-muted opacity-50'
              }`}
            >
              {/* Progress Bar Background */}
              {isGenerating && (
                <Animated.View
                  className="absolute inset-0 bg-white/20"
                  style={animatedProgressStyle}
                />
              )}
              <Text
                className={`text-center text-sm font-semibold ${canGenerateForThisWeek && !isGenerating ? 'text-white' : 'text-tertiary'}`}
              >
                {isGenerating
                  ? `Generating... ${generationProgress}%`
                  : isPastWeek
                    ? 'Past Week'
                    : currentSchedule
                      ? '✨ Regenerate'
                      : '✨ Generate'}
              </Text>
            </Pressable>
          </View>
          {error ? <Text className="mt-2 text-sm text-rose-500">{error}</Text> : null}
        </View>
      )}

      {/* Schedule Display */}
      {currentSchedule ? (
        <>
          <View className="mb-2 flex-row items-center justify-between gap-4">
            <Text variant="title3" className="font-semibold">
              {isGridView ? 'Weekly Grid' : 'Daily Assignments'}
            </Text>
            <View className="flex-row items-center gap-2">
              {!isLandscapeOrientation && !isEditMode && (
                <Pressable
                  className="rounded-full border border-border/70 px-3 py-1"
                  onPress={() => setManualGridView((prev) => !prev)}
                >
                  <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {manualGridView ? 'Show cards' : 'Show grid'}
                  </Text>
                </Pressable>
              )}
              {!isEditMode && (
                <Pressable
                  className="rounded-full border border-border/70 px-3 py-1"
                  onPress={() => router.push('/landscape-grid')}
                >
                  <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Full screen
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          {isGridView ? (
            isEditMode ? (
              <EditableLandscapeGrid
                days={currentSchedule.dailySchedules}
                employeeNames={employeeNames}
                onUpdateAssignment={handleUpdateAssignment}
              />
            ) : (
              <LandscapeScheduleGrid
                schedule={currentSchedule}
                employeeNames={employeeNames}
                employeeOrder={employeeOrder}
              />
            )
          ) : isEditMode ? (
            currentSchedule.dailySchedules.map((daily) => (
              <EditableDailyScheduleCard
                key={daily.date}
                schedule={daily}
                employeeNames={employeeNames}
                onUpdateAssignment={(empId, shift) => handleUpdateAssignment(daily.date, empId, shift)}
              />
            ))
          ) : (
            currentSchedule.dailySchedules.map((daily) => (
              <DailyScheduleCard key={daily.date} schedule={daily} employeeNames={employeeNames} />
            ))
          )}
        </>
      ) : (
        <View className="mt-8 items-center rounded-3xl border border-dashed border-border px-6 py-10">
          <Icon name="calendar.badge.plus" className="mb-3 text-4xl text-grey" />
          <Text className="text-center font-semibold">No schedule yet</Text>
          <Text color="tertiary" className="mt-1 text-center">
            {isPastWeek
              ? 'No schedule found for this past week'
              : `Tap "Generate" to create ${selectedWeekOffset === 0 ? 'this weeks' : 'a future'} plan`}
          </Text>
        </View>
      )}

      {/* AI Suggestions (only in non-edit mode) */}
      {!isEditMode && currentSchedule?.aiSuggestions?.length ? (
        <View className="mt-6">
          <Text variant="title3" className="mb-2 font-semibold">
            AI Suggestions
          </Text>
          <View className="gap-3">
            {currentSchedule.aiSuggestions.map((suggestion, index) => (
              <SuggestionCard key={`${suggestion.title}-${index}`} suggestion={suggestion} />
            ))}
          </View>
        </View>
      ) : null}

      {/* AI Insights Panel */}
      {!isEditMode && currentSchedule && aiInsightsEnabled && (
        <View className="mt-6">
          <AIInsightsPanel 
            schedule={currentSchedule} 
            employees={employees as any}
            defaultExpanded={false}
          />
        </View>
      )}
    </ScrollView>
  )
}
