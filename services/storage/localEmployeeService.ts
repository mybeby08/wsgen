import type { EmployeeRow } from '@/types/database'
import { dbBoolToBoolean, booleanToDbBool } from '@/types/database'
import { validateEmployeeName, sanitizeInput } from '@/utils/validation'

import { ensureDatabaseInitialized, queryAll, runStatement } from './localDatabase'

export interface EmployeeRecord {
  id: string
  name: string
  isOnLeave: boolean
  updatedAt: string
}

const mapEmployee = (row: EmployeeRow): EmployeeRecord => ({
  id: row.id,
  name: row.name,
  isOnLeave: dbBoolToBoolean(row.is_on_leave),
  updatedAt: row.updated_at,
})

export async function getAllEmployees(): Promise<EmployeeRecord[]> {
  await ensureDatabaseInitialized()
  const rows = await queryAll<EmployeeRow>('SELECT * FROM employees ORDER BY name ASC')
  return rows.map(mapEmployee)
}

export async function getEmployeeById(id: string): Promise<EmployeeRecord | null> {
  await ensureDatabaseInitialized()
  const rows = await queryAll<EmployeeRow>('SELECT * FROM employees WHERE id = ? LIMIT 1', [id])
  if (!rows.length) return null
  return mapEmployee(rows[0])
}

export async function upsertEmployee(
  employee: Pick<EmployeeRecord, 'id' | 'name' | 'isOnLeave'> & { updatedAt?: string },
): Promise<void> {
  // Validate and sanitize input
  validateEmployeeName(employee.name)
  const sanitizedName = sanitizeInput(employee.name)
  
  await ensureDatabaseInitialized()
  const updatedAt = employee.updatedAt ?? new Date().toISOString()
  await runStatement(
    `INSERT OR REPLACE INTO employees (id, name, is_on_leave, updated_at)
     VALUES (?, ?, ?, ?)`,
    [employee.id, sanitizedName, booleanToDbBool(employee.isOnLeave), updatedAt],
  )
}

export async function updateEmployee(
  id: string,
  updates: Partial<Pick<EmployeeRecord, 'name' | 'isOnLeave'>>,
): Promise<EmployeeRecord | null> {
  const existing = await getEmployeeById(id)
  if (!existing) {
    return null
  }

  // Validate and sanitize name if provided
  let sanitizedName = existing.name
  if (updates.name !== undefined) {
    validateEmployeeName(updates.name)
    sanitizedName = sanitizeInput(updates.name)
  }

  const updated: EmployeeRecord = {
    ...existing,
    ...updates,
    name: sanitizedName,
    updatedAt: new Date().toISOString(),
  }

  await runStatement(
    `UPDATE employees
      SET name = ?, is_on_leave = ?, updated_at = ?
      WHERE id = ?`,
    [updated.name, booleanToDbBool(updated.isOnLeave), updated.updatedAt, id],
  )

  return updated
}

export async function toggleEmployeeLeave(id: string): Promise<EmployeeRecord | null> {
  const employee = await getEmployeeById(id)
  if (!employee) return null

  const updatedAt = new Date().toISOString()
  const nextValue = booleanToDbBool(!employee.isOnLeave)
  await runStatement(
    `UPDATE employees SET is_on_leave = ?, updated_at = ? WHERE id = ?`,
    [nextValue, updatedAt, id],
  )

  return {
    ...employee,
    isOnLeave: !employee.isOnLeave,
    updatedAt,
  }
}

