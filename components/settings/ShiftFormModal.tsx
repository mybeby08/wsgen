import React from 'react'
import { Alert, View, Pressable, Switch, TextInput } from 'react-native'

import { Text } from '@/components/nativewindui/Text'
import type { ShiftCategory } from '@/services/storage/localShiftMetaService'

interface ShiftFormModalProps {
	isVisible: boolean
	editingId: string | null
	initialValues: {
		shiftId: string
		label: string
		startTime: string
		endTime: string
		category: ShiftCategory
		enabledForGeneration: boolean
		isOvertime: boolean
		role: string
		note: string
	}
	onSave: (data: {
		shiftId: string
		label: string
		startTime: string
		endTime: string
		category: ShiftCategory
		enabledForGeneration: boolean
		isOvertime: boolean
		role: string | null
		note: string | null
	}) => Promise<void>
	onCancel: () => void
}

export function ShiftFormModal({
	isVisible,
	editingId,
	initialValues,
	onSave,
	onCancel,
}: ShiftFormModalProps) {
	const [formShiftId, setFormShiftId] = React.useState(initialValues.shiftId)
	const [formLabel, setFormLabel] = React.useState(initialValues.label)
	const [formStartTime, setFormStartTime] = React.useState(initialValues.startTime)
	const [formEndTime, setFormEndTime] = React.useState(initialValues.endTime)
	const [formCategory, setFormCategory] = React.useState<ShiftCategory>(initialValues.category)
	const [formEnabledForGeneration, setFormEnabledForGeneration] = React.useState(
		initialValues.enabledForGeneration,
	)
	const [formIsOvertime, setFormIsOvertime] = React.useState(initialValues.isOvertime)
	const [formRole, setFormRole] = React.useState(initialValues.role)
	const [formNote, setFormNote] = React.useState(initialValues.note)
	const [isSaving, setIsSaving] = React.useState(false)

	// Update form when initial values change
	React.useEffect(() => {
		setFormShiftId(initialValues.shiftId)
		setFormLabel(initialValues.label)
		setFormStartTime(initialValues.startTime)
		setFormEndTime(initialValues.endTime)
		setFormCategory(initialValues.category)
		setFormEnabledForGeneration(initialValues.enabledForGeneration)
		setFormIsOvertime(initialValues.isOvertime)
		setFormRole(initialValues.role)
		setFormNote(initialValues.note)
		setIsSaving(false)
	}, [initialValues, isVisible])

	const handleSave = React.useCallback(async () => {
		const trimmedId = formShiftId.trim()
		const trimmedLabel = formLabel.trim()
		const trimmedRole = formRole.trim()
		const trimmedNote = formNote.trim()

		if (!trimmedId || !trimmedLabel || !formStartTime || !formEndTime) {
			Alert.alert('Missing fields', 'Please fill in ID, label, and times.')
			return
		}

		// Validate time format and range
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
		if (!timeRegex.test(formStartTime) || !timeRegex.test(formEndTime)) {
			Alert.alert('Invalid time format', 'Please use HH:MM format (e.g., 07:00).')
			return
		}

		const [startHour, startMin] = formStartTime.split(':').map(Number)
		const [endHour, endMin] = formEndTime.split(':').map(Number)
		const startMinutes = startHour * 60 + startMin
		const endMinutes = endHour * 60 + endMin

		if (endMinutes <= startMinutes) {
			Alert.alert('Invalid time range', 'End time must be after start time.')
			return
		}

		setIsSaving(true)

		try {
			await onSave({
				shiftId: trimmedId,
				label: trimmedLabel,
				startTime: formStartTime,
				endTime: formEndTime,
				category: formCategory,
				enabledForGeneration: formEnabledForGeneration,
				isOvertime: formIsOvertime,
				role: trimmedRole || null,
				note: trimmedNote || null,
			})
		} catch (err) {
			setIsSaving(false)
			Alert.alert('Error', `Failed to save shift: ${String(err)}`)
		}
	}, [
		formShiftId,
		formLabel,
		formStartTime,
		formEndTime,
		formCategory,
		formEnabledForGeneration,
		formIsOvertime,
		formRole,
		formNote,
		onSave,
	])

	if (!isVisible) return null

	return (
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

			<View className="mb-3">
				<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-tertiary text-blue-600">
					Role (optional)
				</Text>
				<TextInput
					value={formRole}
					onChangeText={setFormRole}
					className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
					placeholder="e.g. Sixty60 Customer Representative"
				/>
			</View>

			<View className="mb-3">
				<Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-tertiary text-blue-600">
					Note (optional)
				</Text>
				<TextInput
					value={formNote}
					onChangeText={setFormNote}
					className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
					placeholder="e.g. 9h shift"
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
					<Switch value={formEnabledForGeneration} onValueChange={setFormEnabledForGeneration} />
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
					onPress={onCancel}
					disabled={isSaving}
					className="rounded-2xl border border-border px-4 py-2"
				>
					<Text className="text-xs font-semibold uppercase tracking-widest">Cancel</Text>
				</Pressable>
				<Pressable
					onPress={handleSave}
					disabled={isSaving}
					className={`rounded-2xl px-4 py-2 ${isSaving ? 'bg-primary/50' : 'bg-primary'}`}
				>
					<Text className="text-xs font-semibold uppercase tracking-widest text-white">
						{isSaving ? 'Saving...' : 'Save'}
					</Text>
				</Pressable>
			</View>
		</View>
	)
}
