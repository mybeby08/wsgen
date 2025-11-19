/**
 * Custom error types for the application
 */

export class AppError extends Error {
  public readonly code: string
  public readonly userMessage: string
  public readonly originalError?: unknown

  constructor(
    message: string,
    options: {
      code?: string
      userMessage?: string
      originalError?: unknown
    } = {}
  ) {
    super(message)
    this.name = 'AppError'
    this.code = options.code ?? 'UNKNOWN_ERROR'
    this.userMessage = options.userMessage ?? 'An unexpected error occurred'
    this.originalError = options.originalError
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, {
      code: 'DATABASE_ERROR',
      userMessage: 'Unable to access database. Please try again.',
      originalError,
    })
    this.name = 'DatabaseError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, {
      code: 'NETWORK_ERROR',
      userMessage: 'Network connection failed. Check your internet connection.',
      originalError,
    })
    this.name = 'NetworkError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, {
      code: 'VALIDATION_ERROR',
      userMessage: userMessage ?? 'Invalid data provided',
    })
    this.name = 'ValidationError'
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, {
      code: 'AI_SERVICE_ERROR',
      userMessage: 'AI service temporarily unavailable',
      originalError,
    })
    this.name = 'AIServiceError'
  }
}

/**
 * Error logging service
 */
export const ErrorLogger = {
  log(error: Error | AppError, context?: Record<string, unknown>): void {
    if (__DEV__) {
      console.error('[ErrorLogger]', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof AppError && {
          code: error.code,
          userMessage: error.userMessage,
          originalError: error.originalError,
        }),
        context,
      })
    }
    // In production, you would send this to a logging service like Sentry
  },

  warn(message: string, context?: Record<string, unknown>): void {
    if (__DEV__) {
      console.warn('[ErrorLogger]', message, context)
    }
  },
}

/**
 * Wraps a promise to catch and convert errors to AppError
 */
export async function tryCatch<T>(
  promise: Promise<T>,
  errorType: typeof AppError = AppError
): Promise<T> {
  try {
    return await promise
  } catch (error) {
    const appError = new errorType(
      error instanceof Error ? error.message : 'Unknown error',
      { originalError: error }
    )
    ErrorLogger.log(appError)
    throw appError
  }
}

/**
 * Gets a user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
