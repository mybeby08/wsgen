import Constants from 'expo-constants'

/**
 * Environment configuration
 * Uses EXPO_PUBLIC_ prefix for runtime access in client
 */
export const ENV = {
  GEMINI_API_KEY: Constants.expoConfig?.extra?.geminiApiKey as string | undefined,
  TURSO_DB_URL: Constants.expoConfig?.extra?.tursoDbUrl as string | undefined,
  TURSO_DB_AUTH_TOKEN: Constants.expoConfig?.extra?.tursoDbAuthToken as string | undefined,
} as const

/**
 * App configuration constants
 */
export const APP_CONFIG = {
  APP_NAME: 'Work Schedule Generator',
  VERSION: '1.0.0',
  
  // Schedule Settings
  SCHEDULE: {
    MAX_WEEK_OFFSET_PAST: -8,
    MAX_WEEK_OFFSET_FUTURE: 4,
    RECENT_SCHEDULES_LIMIT: 3,
    WEEK_STARTS_ON: 1, // Monday
  },
  
  // AI Settings
  AI: {
    DEFAULT_MODEL: 'gemini-2.5-flash',
    MAX_SUGGESTIONS: 5,
    TIMEOUT_MS: 15000,
  },
  
  // Database Settings
  DATABASE: {
    INIT_TIMEOUT_MS: 5000,
  },
  
  // UI Settings
  UI: {
    SPLASH_MIN_DURATION_MS: 1000,
    DEBOUNCE_MS: 300,
  },
} as const

/**
 * Validates required environment variables
 * @throws Error if required variables are missing
 */
export function validateConfig(): void {
  const errors: string[] = []
  
  if (!ENV.TURSO_DB_URL) {
    errors.push('TURSO_DB_URL is required')
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
  }
}

/**
 * Check if optional features are available
 */
export const FEATURES = {
  AI_INSIGHTS: Boolean(ENV.GEMINI_API_KEY),
} as const
