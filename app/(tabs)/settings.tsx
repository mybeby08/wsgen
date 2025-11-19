import React from 'react'
import { Alert, ScrollView, View, Pressable, Switch, TextInput, ActivityIndicator } from 'react-native'
import { useNetworkState } from 'expo-network'
import { formatDistanceToNow } from 'date-fns'

import { Text } from '@/components/nativewindui/Text'
import { Icon } from '@/components/nativewindui/Icon'
import type { SfSymbols } from 'rn-icon-mapper'
import { hasGeminiApiKey } from '@/services/ai/geminiClient'
import { syncDatabase, getDatabaseStatus } from '@/services/storage/localDatabase'
import { useScheduleStore } from '@/store/scheduleStore'
import { useShiftMetaStore } from '@/store/shiftMetaStore'

export default function SettingsScreen() {
  const networkState = useNetworkState()
  const schedule = useScheduleStore((state) => state.schedule)
	 const [dbStatus, setDbStatus] = React.useState(getDatabaseStatus())
	 const [isSyncing, setIsSyncing] = React.useState(false)

	const shiftMetas = useShiftMetaStore((state) => state.metas)
	const shiftMetaLoading = useShiftMetaStore((state) => state.isLoading)
	const shiftMetaError = useShiftMetaStore((state) => state.error)
	const loadShiftMetas = useShiftMetaStore((state) => state.load)
	const addShiftMeta = useShiftMetaStore((state) => state.add)
	const updateShiftMeta = useShiftMetaStore((state) => state.update)
	const removeShiftMeta = useShiftMetaStore((state) => state.remove)

	const [isEditingShift, setIsEditingShift] = React.useState(false)
	const [editingId, setEditingId] = React.useState<string | null>(null)
	const [formShiftId, setFormShiftId] = React.useState('')
	const [formLabel, setFormLabel] = React.useState('')
	const [formStartTime, setFormStartTime] = React.useState('')
	const [formEndTime, setFormEndTime] = React.useState('')
	const [formCategory, setFormCategory] = React.useState<'EARLY' | 'LATE'>('EARLY')
	const [formEnabledForGeneration, setFormEnabledForGeneration] = React.useState(true)
	const [formIsOvertime, setFormIsOvertime] = React.useState(false)

	React.useEffect(() => {
		if (!shiftMetas.length && !shiftMetaLoading) {
			void loadShiftMetas()
		}
	}, [shiftMetas.length, shiftMetaLoading, loadShiftMetas])

	// Poll DB status every 5 seconds
	React.useEffect(() => {
		const interval = setInterval(() => {
			setDbStatus(getDatabaseStatus())
		}, 5000)
		return () => clearInterval(interval)
	}, [])

	const openCreateForm = React.useCallback(() => {
		setEditingId(null)
		setFormShiftId('')
		setFormLabel('')
		setFormStartTime('07:00')
		setFormEndTime('16:00')
		setFormCategory('EARLY')
		setFormEnabledForGeneration(true)
		setFormIsOvertime(false)
		setIsEditingShift(true)
	}, [])

	const openEditForm = React.useCallback(
		(shiftId: string) => {
			const meta = shiftMetas.find((m) => m.shiftId === shiftId)
			if (!meta) return

			setEditingId(shiftId)
			setFormShiftId(meta.shiftId)
			setFormLabel(meta.label)
			setFormStartTime(meta.startTime)
			setFormEndTime(meta.endTime)
			setFormCategory(meta.category)
			setFormEnabledForGeneration(meta.enabledForGeneration)
			setFormIsOvertime(meta.isOvertime)
			setIsEditingShift(true)
		},
		[shiftMetas],
	)

	const handleSaveShift = React.useCallback(() => {
		const trimmedId = formShiftId.trim()
		const trimmedLabel = formLabel.trim()
		if (!trimmedId || !trimmedLabel || !formStartTime || !formEndTime) {
			Alert.alert('Missing fields', 'Please fill in ID, label, and times.')
			return
		}

		if (editingId) {
			void updateShiftMeta(editingId, {
				label: trimmedLabel,
				startTime: formStartTime,
				endTime: formEndTime,
				category: formCategory,
				enabledForGeneration: formEnabledForGeneration,
				isOvertime: formIsOvertime,
			}).then(() => {
				setIsEditingShift(false)
			})
		} else {
			void addShiftMeta({
				shiftId: trimmedId,
				label: trimmedLabel,
				startTime: formStartTime,
				endTime: formEndTime,
				category: formCategory,
				enabledForGeneration: formEnabledForGeneration,
				isOvertime: formIsOvertime,
			}).then(() => {
				setIsEditingShift(false)
			})
		}
	}, [
		addShiftMeta,
		editingId,
		formCategory,
		formEnabledForGeneration,
		formEndTime,
		formIsOvertime,
		formLabel,
		formShiftId,
		formStartTime,
		updateShiftMeta,
	])

	const handleDeleteShift = React.useCallback(
		(shiftId: string) => {
			Alert.alert('Delete shift', 'Are you sure you want to remove this shift?', [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						void removeShiftMeta(shiftId)
					},
				},
			])
		},
		[removeShiftMeta],
	)

	const handleManualSync = React.useCallback(async () => {
		setIsSyncing(true)
		try {
			await syncDatabase()
			setDbStatus(getDatabaseStatus())
			Alert.alert('Sync complete', 'Database synced successfully with remote.')
		} catch (error) {
			Alert.alert('Sync failed', 'Unable to sync with remote database. Check your connection.')
		} finally {
			setIsSyncing(false)
		}
	}, [])

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

			{/* Database Status */}
			<View className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5">
				<View className="mb-3 flex-row items-center justify-between">
					<View className="flex-1">
						<Text className="text-base font-semibold">Database Sync</Text>
						<Text color="tertiary" className="text-xs">
							Local-first architecture with cloud sync
						</Text>
					</View>
					<View className={`rounded-full px-2 py-1 ${dbStatus.isOnline ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
						<Text className={`text-xs font-semibold ${dbStatus.isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
							{dbStatus.isOnline ? '● Online' : '● Offline'}
						</Text>
					</View>
				</View>

				<View className="space-y-2">
					<View className="flex-row justify-between">
						<Text color="tertiary" className="text-sm">Last sync</Text>
						<Text className="text-sm font-medium">
							{dbStatus.lastSyncTime
								? formatDistanceToNow(dbStatus.lastSyncTime, { addSuffix: true })
								: 'Never'}
						</Text>
					</View>
					<View className="flex-row justify-between">
						<Text color="tertiary" className="text-sm">Frame number</Text>
						<Text className="text-sm font-medium">
							{dbStatus.frameNumber ?? 'N/A'}
						</Text>
					</View>
					<View className="flex-row justify-between">
						<Text color="tertiary" className="text-sm">Status</Text>
						<Text className="text-sm font-medium">
							{dbStatus.isInitialized ? 'Ready' : 'Initializing...'}
						</Text>
					</View>
				</View>

				<Pressable
					onPress={handleManualSync}
					disabled={isSyncing}
					className="mt-4 rounded-2xl bg-primary px-4 py-3 flex-row items-center justify-center"
				>
					{isSyncing ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text className="text-center text-base font-semibold text-white">
							🔄 Sync Now
						</Text>
					)}
				</Pressable>
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
						<Text color="tertiary" className="text-sm">
							No shifts yet. Use "Add shift" to create one.
						</Text>
					)}

					{shiftMetas.map((meta) => (
						<View
							key={meta.shiftId}
							className="mt-3 flex-row items-center justify-between rounded-2xl border border-border/60 bg-background px-3 py-2"
						>
							<View className="flex-1 pr-3">
								<Text className="text-sm font-semibold">{meta.label}</Text>
								<Text color="tertiary" className="text-xs">
									{meta.startTime} - {meta.endTime} · {meta.category}
									{meta.isOvertime ? ' · Overtime' : ''}
								</Text>
							</View>
							<View className="items-end gap-1">
								<View className="flex-row items-center gap-2">
									<Text className="text-[10px] uppercase tracking-widest text-tertiary text-red-600">Gen</Text>
									<Switch
										value={meta.enabledForGeneration}
										onValueChange={(value) => void updateShiftMeta(meta.shiftId, { enabledForGeneration: value })}
									/>
								</View>
								<View className="mt-1 flex-row items-center gap-2">
									<Text className="text-[10px] uppercase tracking-widest text-tertiary text-red-600">OT</Text>
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

				{isEditingShift && (
					<View className="mt-4 rounded-3xl border border-border bg-background p-4">
						<Text className="mb-3 text-base font-semibold">
							{editingId ? 'Edit shift' : 'Add shift'}
						</Text>

						<View className="mb-3">
							<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
								ID
							</Text>
							<TextInput
								value={formShiftId}
								onChangeText={setFormShiftId}
								editable={!editingId}
								autoCapitalize="characters"
								className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
								placeholder="e.g. MORNING"
							/>
						</View>

						<View className="mb-3">
							<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-tertiary text-blue-600">
								Label
							</Text>
							<TextInput
								value={formLabel}
								onChangeText={setFormLabel}
								className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
								placeholder="e.g. Morning"
							/>
						</View>

						<View className="mb-3 flex-row gap-3">
							<View className="flex-1">
								<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-tertiary text-blue-600">
									Start time
								</Text>
								<TextInput
									value={formStartTime}
									onChangeText={setFormStartTime}
									className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
									placeholder="07:00"
								/>
							</View>
							<View className="flex-1">
								<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-tertiary text-red-600">
									End time
								</Text>
								<TextInput
									value={formEndTime}
									onChangeText={setFormEndTime}
									className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
									placeholder="16:00"
								/>
							</View>
						</View>

						<View className="mb-3">
							<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-tertiary text-blue-600">
								Category
							</Text>
							<View className="flex-row gap-2">
								<Pressable
									onPress={() => setFormCategory('EARLY')}
									className={`flex-1 rounded-2xl border px-3 py-2 ${
										formCategory === 'EARLY' ? 'border-primary bg-primary/10' : 'border-border'
									}`}
								>
									<Text
										className={`text-center text-xs font-semibold uppercase tracking-widest ${
											formCategory === 'EARLY' ? 'text-primary' : 'text-foreground'
										}`}
									>
										Early
									</Text>
								</Pressable>
								<Pressable
									onPress={() => setFormCategory('LATE')}
									className={`flex-1 rounded-2xl border px-3 py-2 ${
										formCategory === 'LATE' ? 'border-primary bg-primary/10' : 'border-border'
									}`}
								>
									<Text
										className={`text-center text-xs font-semibold uppercase tracking-widest ${
											formCategory === 'LATE' ? 'text-primary' : 'text-foreground'
										}`}
									>
										Late
									</Text>
								</Pressable>
							</View>
						</View>

						<View className="mb-3 flex-row items-center justify-between">
							<View className="flex-row items-center gap-2">
								<Text className="text-xs font-semibold uppercase tracking-widest text-red-600">
									Use in generator
								</Text>
								<Switch
									value={formEnabledForGeneration}
									onValueChange={setFormEnabledForGeneration}
								/>
							</View>
						</View>

						<View className="mb-4 flex-row items-center justify-between">
							<View className="flex-row items-center gap-2">
								<Text className="text-xs font-semibold uppercase tracking-widest text-tertiary text-red-600">
									Overtime shift
								</Text>
								<Switch value={formIsOvertime} onValueChange={setFormIsOvertime} />
							</View>
						</View>

						<View className="flex-row justify-end gap-3">
							<Pressable
								onPress={() => setIsEditingShift(false)}
								className="rounded-2xl border border-border px-4 py-2"
							>
								<Text className="text-xs font-semibold uppercase tracking-widest">
									Cancel
								</Text>
							</Pressable>
							<Pressable
								onPress={handleSaveShift}
								className="rounded-2xl bg-primary px-4 py-2"
							>
								<Text className="text-xs font-semibold uppercase tracking-widest text-white">
									Save
								</Text>
							</Pressable>
						</View>
					</View>
				)}
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

