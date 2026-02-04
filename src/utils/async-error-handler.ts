/**
 * Async Error Handler Utilities
 *
 * Provides reusable error handling wrappers for async functions to prevent
 * unhandled promise rejections and ensure consistent error logging.
 *
 * @module utils/async-error-handler
 */

import { logger } from './logger.js';

/**
 * Wraps an async function with error handling
 *
 * @param fn - The async function to wrap
 * @param context - Context description for error logging
 * @returns The result of the function or null if error occurred
 *
 * @example
 * ```typescript
 * const result = await withErrorHandling(
 *   async () => fetchData(),
 *   'fetchData'
 * );
 * if (result === null) {
 *   // Handle error case
 * }
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Error in ${context}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Wraps an async function with error handling that re-throws
 *
 * @param fn - The async function to wrap
 * @param context - Context description for error logging
 * @returns The result of the function
 * @throws Re-throws the original error after logging
 *
 * @example
 * ```typescript
 * try {
 *   const result = await withErrorHandlingThrow(
 *     async () => fetchData(),
 *     'fetchData'
 *   );
 * } catch (error) {
 *   // Handle error
 * }
 * ```
 */
export async function withErrorHandlingThrow<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Error in ${context}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
