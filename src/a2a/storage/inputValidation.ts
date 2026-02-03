/**
 * ✅ SECURITY FIX (HIGH-3): Input Validation Helpers
 *
 * Centralized input validation to prevent DoS attacks via malicious inputs.
 * Validates array sizes, enum values, and data constraints.
 */

import { ValidationError } from '../../errors/index.js';
import type { TaskState, TaskPriority } from '../types/index.js';

/**
 * Maximum allowed items in filter arrays to prevent DoS attacks
 */
const MAX_FILTER_ARRAY_SIZE = 100;

/**
 * Valid task states as defined by A2A protocol
 */
const VALID_TASK_STATES: readonly TaskState[] = [
  'SUBMITTED',
  'WORKING',
  'INPUT_REQUIRED',
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'REJECTED',
  'TIMEOUT',
] as const;

/**
 * Valid task priorities
 */
const VALID_TASK_PRIORITIES: readonly TaskPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
] as const;

/**
 * Validate array size to prevent DoS attacks
 *
 * @param array - Array to validate
 * @param fieldName - Field name for error message
 * @param maxSize - Maximum allowed size (default: 100)
 * @throws ValidationError if array exceeds maximum size
 */
export function validateArraySize<T>(
  array: T[],
  fieldName: string,
  maxSize: number = MAX_FILTER_ARRAY_SIZE
): void {
  if (array.length > maxSize) {
    throw new ValidationError(`Too many items in ${fieldName}`, {
      field: fieldName,
      providedCount: array.length,
      maxAllowed: maxSize,
      severity: 'HIGH',
      reason: 'DoS prevention: Excessive array size can cause performance degradation',
    });
  }
}

/**
 * Validate task state enum values
 *
 * @param states - Array of states to validate
 * @throws ValidationError if any state is invalid
 */
export function validateTaskStates(states: string[]): asserts states is TaskState[] {
  for (const state of states) {
    if (!VALID_TASK_STATES.includes(state as TaskState)) {
      throw new ValidationError('Invalid task state', {
        field: 'state',
        providedState: state,
        validStates: VALID_TASK_STATES,
        severity: 'HIGH',
        reason: 'SQL injection prevention: Only known enum values are allowed',
      });
    }
  }
}

/**
 * Validate task priority enum values
 *
 * @param priorities - Array of priorities to validate
 * @throws ValidationError if any priority is invalid
 */
export function validateTaskPriorities(
  priorities: string[]
): asserts priorities is TaskPriority[] {
  for (const priority of priorities) {
    if (!VALID_TASK_PRIORITIES.includes(priority as TaskPriority)) {
      throw new ValidationError('Invalid task priority', {
        field: 'priority',
        providedPriority: priority,
        validPriorities: VALID_TASK_PRIORITIES,
        severity: 'HIGH',
        reason: 'SQL injection prevention: Only known enum values are allowed',
      });
    }
  }
}

/**
 * Validate numeric limits (positive integers only)
 *
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @param max - Maximum allowed value
 * @throws ValidationError if value is invalid
 */
export function validatePositiveInteger(
  value: number,
  fieldName: string,
  max: number = Number.MAX_SAFE_INTEGER
): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new ValidationError(`Invalid ${fieldName}`, {
      field: fieldName,
      providedValue: value,
      constraints: { min: 0, max },
      severity: 'MEDIUM',
      reason: 'Only positive integers are allowed',
    });
  }
}

/**
 * Validate ISO 8601 timestamp string
 *
 * @param value - ISO timestamp string to validate
 * @param fieldName - Field name for error message
 * @throws ValidationError if timestamp is invalid
 */
export function validateISOTimestamp(value: string, fieldName: string): void {
  // Check if it's a valid ISO 8601 string
  const date = new Date(value);

  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid ${fieldName}`, {
      field: fieldName,
      providedValue: value,
      severity: 'MEDIUM',
      reason: 'Must be a valid ISO 8601 timestamp string',
    });
  }

  // Check if the timestamp is reasonable (not too far in past/future)
  const timestamp = date.getTime();
  const now = Date.now();
  const oneHundredYears = 100 * 365 * 24 * 60 * 60 * 1000;

  if (timestamp < 0 || timestamp > now + oneHundredYears) {
    throw new ValidationError(`Invalid ${fieldName}`, {
      field: fieldName,
      providedValue: value,
      timestamp,
      constraints: { min: 0, max: now + oneHundredYears },
      severity: 'MEDIUM',
      reason: 'Timestamp must be a reasonable date (not before epoch or too far in future)',
    });
  }
}
