import React from 'react'
import { Alert, ScrollView, View, Pressable, Switch } from 'react-native'
import { useNetworkState } from 'expo-network'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import type { SfSymbols } from 'rn-icon-mapper'
import { hasGeminiApiKey } from '@/services/ai/geminiClient'
import { useScheduleStore } from '@/store/scheduleStore'
import { useShiftMetaStore } from '@/store/shiftMetaStore'
import { ShiftFormModal } from '@/components/settings/ShiftFormModal'
import type { ShiftCategory } from '@/services/storage/localShiftMetaService'

export default function SettingsScreen() {
  const networkState = useNetworkState()
  const schedule = useScheduleStore((state) => state.schedule)
  const aiInsightsEnabled = useScheduleStore((state) => state.aiInsightsEnabled)
  const toggleAIInsights = useScheduleStore((state) => state.toggleAIInsights)

	const shiftMetas = useShiftMetaStore((state) => state.metas)
	const shiftMetaLoading = useShiftMetaStore((state) => state.isLoading)
	const shiftMetaError = useShiftMetaStore((state) => state.error)
	const loadShiftMetas = useShiftMetaStore((state) => state.load)
	const addShiftMeta = useShiftMetaStore((state) => state.add)
	const updateShiftMeta = useShiftMetaStore((state) => state.update)
	const removeShiftMeta = useShiftMetaStore((state) => state.remove)
	const reorderShiftMeta = useShiftMetaStore((state) => state.reorder)

	const [isEditingShift, setIsEditingShift] = React.useState(false)
	const [editingId, setEditingId] = React.useState<string | null>(null)
	const [formValues, setFormValues] = React.useState({
		shiftId: '',
		label: '',
		startTime: '07:00',
		endTime: '16:00',
		category: 'EARLY' as ShiftCategory,
		enabledForGeneration: true,
		isOvertime: false,
		role: 'Sixty60 Customer Representative',
		note: '',
	})

	React.useEffect(() => {
		if (!shiftMetas.length && !shiftMetaLoading) {
			void loadShiftMetas()
		}
	}, [shiftMetas.length, shiftMetaLoading, loadShiftMetas])

	const openCreateForm = React.useCallback(() => {
		setEditingId(null)
		setFormValues({
			shiftId: '',
			label: '',
			startTime: '07:00',
			endTime: '16:00',
			category: 'EARLY',
			enabledForGeneration: true,
			isOvertime: false,
			role: 'Sixty60 Customer Representative',
			note: '',
		})
		setIsEditingShift(true)
	}, [])

	const openEditForm = React.useCallback(
		(shiftId: string) => {
			const meta = shiftMetas.find((m) => m.shiftId === shiftId)
			if (!meta) return

			setEditingId(shiftId)
			setFormValues({
				shiftId: meta.shiftId,
				label: meta.label,
				startTime: meta.startTime,
				endTime: meta.endTime,
				category: meta.category,
				enabledForGeneration: meta.enabledForGeneration,
				isOvertime: meta.isOvertime,
				role: meta.role ?? '',
				note: meta.note ?? '',
			})
			setIsEditingShift(true)
		},
		[shiftMetas],
	)

	const handleSaveShift = React.useCallback(
		async (data: {
			shiftId: string
			label: string
			startTime: string
			endTime: string
			category: ShiftCategory
			enabledForGeneration: boolean
			isOvertime: boolean
			role: string | null
			note: string | null
		}) => {
			if (editingId) {
				await updateShiftMeta(editingId, {
					label: data.label,
					startTime: data.startTime,
					endTime: data.endTime,
					category: data.category,
					enabledForGeneration: data.enabledForGeneration,
					isOvertime: data.isOvertime,
					role: data.role,
					note: data.note,
				})
			} else {
				await addShiftMeta({
					shiftId: data.shiftId,
					label: data.label,
					startTime: data.startTime,
					endTime: data.endTime,
					category: data.category,
					enabledForGeneration: data.enabledForGeneration,
					isOvertime: data.isOvertime,
					role: data.role,
					note: data.note,
				})
			}
			setIsEditingShift(false)
			Alert.alert('Success', `Shift ${editingId ? 'updated' : 'created'} successfully!`)
		},
		[editingId, addShiftMeta, updateShiftMeta],
	)

	const handleDeleteShift = React.useCallback(
		(shiftId: string) => {
			const shift = shiftMetas.find((m) => m.shiftId === shiftId)
			if (!shift) return

			const remainingInCategory = shiftMetas.filter(
				(m) => m.category === shift.category && m.shiftId !== shiftId,
			)

			const message = remainingInCategory.length === 0
				? `This is the last ${shift.category} shift. Deleting it may affect schedule generation. Continue?`
				: 'Are you sure you want to remove this shift?'

			Alert.alert('Delete shift', message, [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						void removeShiftMeta(shiftId).then(() => {
							Alert.alert('Deleted', `${shift.label} shift has been removed.`)
						})
					},
				},
			])
		},
		[shiftMetas, removeShiftMeta],
	)

	const handleReorder = React.useCallback(
		(shiftId: string, direction: 'up' | 'down') => {
			void reorderShiftMeta(shiftId, direction)
		},
		[reorderShiftMeta],
	)

	const handleToggleGeneration = React.useCallback(
		(shiftId: string, newValue: boolean) => {
			if (newValue) {
				// Enabling is always safe
				void updateShiftMeta(shiftId, { enabledForGeneration: newValue })
				return
			}

			// Check if this is the last enabled shift in its category
			const shift = shiftMetas.find((m) => m.shiftId === shiftId)
			if (!shift) return

			const enabledInCategory = shiftMetas.filter(
				(m) => m.category === shift.category && m.enabledForGeneration && m.shiftId !== shiftId,
			)

			if (enabledInCategory.length === 0) {
				Alert.alert(
					'Warning: Last shift in category',
					`This is the last enabled ${shift.category} shift. Disabling it may prevent schedule generation. Continue?`,
					[
						{ text: 'Cancel', style: 'cancel' },
						{
							text: 'Disable anyway',
							style: 'destructive',
							onPress: () => void updateShiftMeta(shiftId, { enabledForGeneration: newValue }),
						},
					],
				)
			} else {
				void updateShiftMeta(shiftId, { enabledForGeneration: newValue })
			}
		},
		[shiftMetas, updateShiftMeta],
	)



	const isOnline = !!networkState?.isConnected
  const isReachable = !!networkState?.isInternetReachable

	let shiftStatusDescription: string
	let shiftStatus: string
	let shiftStatusColor: string

	if (shiftMetaLoading) {
		shiftStatusDescription = 'Loading from database'
		shiftStatus = 'Loading'
		shiftStatusColor = 'text-amber-500'
	} else if (shiftMetaError) {
		shiftStatusDescription = shiftMetaError
		shiftStatus = 'Error'
		shiftStatusColor = 'text-rose-500'
	} else if (!shiftMetas.length) {
		shiftStatusDescription = 'No custom shifts yet'
		shiftStatus = 'Empty'
		shiftStatusColor = 'text-amber-500'
	} else {
		shiftStatusDescription = `${shiftMetas.length} shift templates`
		shiftStatus = 'OK'
		shiftStatusColor = 'text-emerald-500'
	}

	return (
		<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
			<Text variant="title2" className="mb-3 font-bold">
				App status
			</Text>

			<SettingRow
				icon="wifi"
				title="Connectivity"
				description={isReachable ? 'Online' : 'Offline'}
				status={isOnline ? 'Good' : 'Offline'}
				statusColor={isOnline ? 'text-emerald-500' : 'text-rose-500'}
			/>

			<SettingRow
				icon="sparkle"
				title="Gemini AI"
				description={hasGeminiApiKey() ? 'Key detected' : 'Missing API key'}
				status={hasGeminiApiKey() ? 'Enabled' : 'Disabled'}
				statusColor={hasGeminiApiKey() ? 'text-emerald-500' : 'text-rose-500'}
			/>

			<SettingRow
				icon="calendar"
				title="Current schedule"
				description={schedule ? 'Ready to share' : 'Pending generation'}
				status={schedule ? 'Available' : 'Missing'}
				statusColor={schedule ? 'text-emerald-500' : 'text-amber-500'}
			/>

			<SettingRow
				icon="calendar.badge.plus"
				title="Shift templates"
				description={shiftStatusDescription}
				status={shiftStatus}
				statusColor={shiftStatusColor}
			/>

			{/* AI Features Section */}
			<View className="mt-8">
				<Text variant="title2" className="mb-3 font-bold">
					AI Features
				</Text>

				<View className="rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5">
					<View className="flex-row items-center justify-between">
						<View className="flex-1 pr-4">
							<View className="flex-row items-center gap-2 mb-1">
								<Icon name="sparkle" size={16} className="text-primary" />
								<Text className="font-semibold">AI Insights Panel</Text>
							</View>
							<Text color="tertiary" className="text-sm">
								Show conflict detection, natural language queries, and schedule explanations
							</Text>
						</View>
						<Switch
							value={aiInsightsEnabled}
							onValueChange={toggleAIInsights}
						/>
					</View>

					{!hasGeminiApiKey() && (
						<View className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
							<Text className="text-xs text-amber-700">
								💡 Some AI features require a Gemini API key. Conflict detection works without it!
							</Text>
						</View>
					)}

					{aiInsightsEnabled && (
						<View className="mt-3 rounded-lg bg-primary/5 p-3">
							<Text className="text-xs font-semibold text-primary mb-1">Features included:</Text>
							<Text className="text-xs text-primary/80">• Conflict detection (no API needed)</Text>
							<Text className="text-xs text-primary/80">• Ask AI questions (requires API)</Text>
							<Text className="text-xs text-primary/80">• Schedule explanations (has fallback)</Text>
						</View>
					)}
				</View>
			</View>

			<View className="mt-8">
				<Text variant="title2" className="mb-3 font-bold">
					Shift settings
				</Text>

				<View className="rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5">
					<View className="mb-3 flex-row items-center justify-between">
						<Text className="font-semibold">Shift templates</Text>
						<Pressable onPress={openCreateForm} className="rounded-full bg-primary px-3 py-1.5">
							<Text className="text-xs font-semibold uppercase tracking-widest text-white">
								Add shift
							</Text>
						</Pressable>
					</View>

					{shiftMetaLoading && (
						<Text color="tertiary" className="text-sm">
							Loading shift settings...
						</Text>
					)}

					{shiftMetaError ? (
						<Text className="text-sm text-rose-500">{shiftMetaError}</Text>
					) : null}

					{!shiftMetaLoading && !shiftMetas.length && !shiftMetaError && (
						<View className="mt-2 rounded-2xl border border-border/50 bg-background p-4">
							<Text className="mb-2 text-sm font-semibold">Get started with shift templates</Text>
							<Text color="tertiary" className="mb-3 text-xs leading-relaxed">
								Shift templates define the time slots your team can be assigned to. Create templates for your typical shifts.
							</Text>
							
							<View className="mb-2 rounded-xl bg-card px-3 py-2">
								<Text className="text-xs font-medium">Example: Morning Shift</Text>
								<Text color="tertiary" className="text-[10px]">
									07:00 - 16:00 · EARLY category
								</Text>
							</View>
							
							<View className="mb-2 rounded-xl bg-card px-3 py-2">
								<Text className="text-xs font-medium">Example: Afternoon Shift</Text>
								<Text color="tertiary" className="text-[10px]">
									10:00 - 19:00 · LATE category
								</Text>
							</View>
							
							<Text color="tertiary" className="mt-2 text-[10px] italic">
								Tip: Mark rarely-used shifts as overtime or disable them from generation.
							</Text>
						</View>
					)}

					{shiftMetas.map((meta, index) => (
						<View
							key={meta.shiftId}
							className="mt-3 flex-row items-center justify-between rounded-2xl border border-border/60 bg-background px-3 py-2"
						>
							<View className="flex-1 flex-row items-center gap-2 pr-2">
								<View className="gap-1">
									<Pressable
										onPress={() => handleReorder(meta.shiftId, 'up')}
										disabled={index === 0}
										className="rounded px-1.5 py-0.5"
									>
										<Icon name="chevron.up" size={14} className={index === 0 ? 'text-tertiary/30' : 'text-primary'} />
									</Pressable>
									<Pressable
										onPress={() => handleReorder(meta.shiftId, 'down')}
										disabled={index === shiftMetas.length - 1}
										className="rounded px-1.5 py-0.5"
									>
										<Icon name="chevron.down" size={14} className={index === shiftMetas.length - 1 ? 'text-tertiary/30' : 'text-primary'} />
									</Pressable>
								</View>
								<View className="flex-1 min-w-0">
									<Text className="text-sm font-semibold" numberOfLines={1}>{meta.label}</Text>
									<Text color="tertiary" className="text-xs" numberOfLines={1}>
										{meta.startTime} - {meta.endTime} · {meta.category}
										{meta.isOvertime ? ' · Overtime' : ''}
									</Text>
								</View>
							</View>
							<View className="flex-shrink-0 items-end gap-1">
								<View className="flex-row items-center gap-1.5">
									<Text className="text-[10px] uppercase tracking-wide text-red-600">Gen</Text>
									<Switch
										value={meta.enabledForGeneration}
										onValueChange={(value) => handleToggleGeneration(meta.shiftId, value)}
									/>
								</View>
								<View className="mt-1 flex-row items-center gap-1.5">
									<Text className="text-[10px] uppercase tracking-wide text-red-600">OT</Text>
									<Switch
										value={meta.isOvertime}
										onValueChange={(value) => void updateShiftMeta(meta.shiftId, { isOvertime: value })}
									/>
								</View>
								<View className="mt-2 flex-row gap-2">
									<Pressable onPress={() => openEditForm(meta.shiftId)}>
										<Text className="text-[11px] font-semibold text-primary">Edit</Text>
									</Pressable>
									<Pressable onPress={() => handleDeleteShift(meta.shiftId)}>
										<Text className="text-[11px] font-semibold text-rose-500">Delete</Text>
									</Pressable>
								</View>
							</View>
						</View>
					))}
				</View>

				<ShiftFormModal
					isVisible={isEditingShift}
					editingId={editingId}
					initialValues={formValues}
					onSave={handleSaveShift}
					onCancel={() => setIsEditingShift(false)}
				/>
			</View>
		</ScrollView>
	)
}

interface SettingRowProps {
  icon: SfSymbols
  title: string
  description: string
  status: string
  statusColor: string
}

function SettingRow({ icon, title, description, status, statusColor }: SettingRowProps) {
  return (
    <View className="mb-4 flex-row items-center gap-3 rounded-3xl border border-border bg-card p-4">
      <Icon name={icon} className="text-foreground" />
      <View className="flex-1">
        <Text className="font-semibold">{title}</Text>
        <Text color="tertiary">{description}</Text>
      </View>
      <Text className={`text-xs uppercase tracking-wide ${statusColor}`}>{status}</Text>
    </View>
  )
}

