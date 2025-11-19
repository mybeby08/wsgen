import { Models } from 'appwrite'

import { account } from './client'

let sessionPromise: Promise<Models.Session> | null = null

export async function ensureAnonymousSession(): Promise<Models.Session> {
  if (sessionPromise) {
    return sessionPromise
  }

  sessionPromise = (async () => {
    try {
      return await account.getSession('current')
    } catch {
      return await account.createAnonymousSession()
    } finally {
      sessionPromise = null
    }
  })()

  return sessionPromise
}

export async function clearSession() {
  try {
    await account.deleteSessions()
  } catch (error) {
    console.warn('Unable to clear Appwrite sessions', error)
  }
}

