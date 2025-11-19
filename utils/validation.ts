/**
 * Validation utilities for user inputs and data
 */

import { ValidationError } from '@/lib/errors'

/**
 * Validates employee name
 */
export function validateEmployeeName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Employee name cannot be empty', 'Please enter a valid name')
  }

  if (name.length > 100) {
    throw new ValidationError('Employee name too long', 'Name must be less than 100 characters')
  }

  // Check for invalid characters
  const validNamePattern = /^[a-zA-Z\s\-'.]+$/
  if (!validNamePattern.test(name)) {
    throw new ValidationError(
      'Invalid characters in name',
      'Name can only contain letters, spaces, hyphens, and apostrophes'
    )
  }
}

/**
 * Validates week offset is within allowed range
 */
export function validateWeekOffset(offset: number, min: number, max: number): number {
  if (!Number.isInteger(offset)) {
    throw new ValidationError('Invalid week offset', 'Week offset must be a whole number')
  }

  return Math.max(min, Math.min(max, offset))
}

/**
 * Validates date string format (YYYY-MM-DD)
 */
export function validateDateString(dateString: string): void {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateString)) {
    throw new ValidationError('Invalid date format', 'Date must be in YYYY-MM-DD format')
  }

  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new ValidationError('Invalid date', 'Please provide a valid date')
  }
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

/**
 * Validates that a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validates that a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}
