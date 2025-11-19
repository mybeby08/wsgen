/**
 * Secure storage utilities
 * For sensitive data that shouldn't be in plain text
 * 
 * NOTE: This is a basic implementation. In production, use expo-secure-store
 * or react-native-keychain for truly secure storage on device.
 */

import { ErrorLogger } from './errors'

/**
 * Securely stores a value
 * In production, this would use expo-secure-store
 */
export async function securelyStore(key: string, value: string): Promise<void> {
  try {
    // For now, using localStorage-like approach
    // In production: Use expo-secure-store
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`secure_${key}`, value)
    }
  } catch (error) {
    ErrorLogger.log(
      error instanceof Error ? error : new Error('Failed to securely store value'),
      { key }
    )
  }
}

/**
 * Retrieves a securely stored value
 */
export async function securelyRetrieve(key: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(`secure_${key}`)
    }
    return null
  } catch (error) {
    ErrorLogger.log(
      error instanceof Error ? error : new Error('Failed to retrieve secure value'),
      { key }
    )
    return null
  }
}

/**
 * Removes a securely stored value
 */
export async function securelyRemove(key: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`secure_${key}`)
    }
  } catch (error) {
    ErrorLogger.log(
      error instanceof Error ? error : new Error('Failed to remove secure value'),
      { key }
    )
  }
}

/**
 * Clears all secure storage
 */
export async function clearSecureStorage(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(window.localStorage)
      keys.forEach((key) => {
        if (key.startsWith('secure_')) {
          window.localStorage.removeItem(key)
        }
      })
    }
  } catch (error) {
    ErrorLogger.log(
      error instanceof Error ? error : new Error('Failed to clear secure storage')
    )
  }
}
