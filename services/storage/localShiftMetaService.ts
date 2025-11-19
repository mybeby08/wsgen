import { ensureDatabaseInitialized, queryAll, runStatement } from './localDatabase'

export type ShiftCategory = 'EARLY' | 'LATE'

export interface ShiftMetaRecord {
  shiftId: string
  label: string
  startTime: string
  endTime: string
  category: ShiftCategory
  enabledForGeneration: boolean
  isOvertime: boolean
  role: string | null
  note: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

const mapShiftMeta = (row: any): ShiftMetaRecord => ({
  shiftId: row.shift_id,
  label: row.label,
  startTime: row.start_time,
  endTime: row.end_time,
  category: row.category,
  enabledForGeneration: !!row.enabled_for_generation,
  isOvertime: !!row.is_overtime,
  role: row.role ?? null,
  note: row.note ?? null,
  displayOrder: row.display_order ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function getAllShiftMetas(): Promise<ShiftMetaRecord[]> {
  await ensureDatabaseInitialized()
  const rows = await queryAll('SELECT * FROM shift_metas ORDER BY display_order ASC, shift_id ASC')
  return rows.map(mapShiftMeta)
}

export async function getShiftMetaById(shiftId: string): Promise<ShiftMetaRecord | null> {
  await ensureDatabaseInitialized()
  const rows = await queryAll('SELECT * FROM shift_metas WHERE shift_id = ? LIMIT 1', [shiftId])
  if (!rows.length) return null
  return mapShiftMeta(rows[0])
}

interface UpsertShiftMetaInput {
  shiftId: string
  label: string
  startTime: string
  endTime: string
  category: ShiftCategory
  enabledForGeneration: boolean
  isOvertime: boolean
  role?: string | null
  note?: string | null
  displayOrder?: number
}

export async function upsertShiftMeta(input: UpsertShiftMetaInput): Promise<void> {
  await ensureDatabaseInitialized()
  const now = new Date().toISOString()

  await runStatement(
    `INSERT INTO shift_metas (
      shift_id,
      label,
      start_time,
      end_time,
      category,
      enabled_for_generation,
      is_overtime,
      role,
      note,
      display_order,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(shift_id) DO UPDATE SET
      label = excluded.label,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      category = excluded.category,
      enabled_for_generation = excluded.enabled_for_generation,
      is_overtime = excluded.is_overtime,
      role = excluded.role,
      note = excluded.note,
      display_order = excluded.display_order,
      updated_at = excluded.updated_at`,
    [
      input.shiftId,
      input.label,
      input.startTime,
      input.endTime,
      input.category,
      input.enabledForGeneration ? 1 : 0,
      input.isOvertime ? 1 : 0,
      input.role ?? null,
      input.note ?? null,
      input.displayOrder ?? 0,
      now,
      now,
    ],
  )
}

export async function deleteShiftMeta(shiftId: string): Promise<void> {
  await ensureDatabaseInitialized()
  await runStatement('DELETE FROM shift_metas WHERE shift_id = ?', [shiftId])
}

export async function seedInitialShiftMetas(): Promise<boolean> {
  await ensureDatabaseInitialized()
  const rows = await queryAll<{ count: number }>('SELECT COUNT(*) as count FROM shift_metas')
  const existingCount = Number(rows[0]?.count ?? 0)
  if (existingCount > 0) {
    return false
  }

  const now = new Date().toISOString()

  await Promise.all([
    runStatement(
      `INSERT INTO shift_metas (
        shift_id,
        label,
        start_time,
        end_time,
        category,
        enabled_for_generation,
        is_overtime,
        role,
        note,
        display_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'MORNING',
        'Morning',
        '07:00',
        '16:00',
        'EARLY',
        1,
        0,
        'Sixty60 Customer Representative',
        'Default 9h shift',
        1,
        now,
        now,
      ],
    ),
    runStatement(
      `INSERT INTO shift_metas (
        shift_id,
        label,
        start_time,
        end_time,
        category,
        enabled_for_generation,
        is_overtime,
        role,
        note,
        display_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'LATE',
        'Late',
        '10:00',
        '19:00',
        'LATE',
        1,
        0,
        'Sixty60 Customer Representative',
        'Default 9h shift',
        2,
        now,
        now,
      ],
    ),
  ])

  return true
}
