import { INITIAL_EMPLOYEES } from '@/data/initialEmployees'

import { ensureDatabaseInitialized } from './localDatabase'
import { getAllEmployees, upsertEmployee } from './localEmployeeService'

let seedingPromise: Promise<boolean> | null = null

export async function seedInitialEmployees(): Promise<boolean> {
  if (seedingPromise) {
    return seedingPromise
  }

  seedingPromise = (async () => {
    await ensureDatabaseInitialized()
    const existing = await getAllEmployees()

    if (existing.length) {
      return false
    }

    await Promise.all(
      INITIAL_EMPLOYEES.map((employee) =>
        upsertEmployee({
          id: employee.id,
          name: employee.name,
          isOnLeave: employee.isOnLeave,
        }),
      ),
    )

    return true
  })()

  const seeded = await seedingPromise
  seedingPromise = null
  return seeded
}

