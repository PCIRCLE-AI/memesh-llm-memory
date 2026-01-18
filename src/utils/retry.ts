/**
 * API Retry Mechanism with Exponential Backoff
 *
 * Handles transient API failures with intelligent retry logic
 */

import { logger } from './logger.js';

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds (default: 1000)
   * Actual delays will be: 1s, 2s, 4s
   */
  baseDelay?: number;

  /**
   * Enable jitter to randomize delays (default: true)
   * Helps prevent thundering herd problem
   */
  enableJitter?: boolean;

  /**
   * HTTP status codes that should trigger retry
   * Default: [429 (Too Many Requests), 503 (Service Unavailable)]
   */
  retryableStatusCodes?: number[];

  /**
   * Custom function to determine if error is retryable
   */
  isRetryable?: (error: unknown) => boolean;

  /**
   * Operation name for logging
   */
  operationName?: string;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

const DEFAULT_RETRYABLE_STATUS_CODES = [429, 503];

/**
 * Check if error is retryable
 *
 * Determines if an error should trigger a retry attempt based on:
 * - Custom retry check function (if provided)
 * - HTTP status codes (SDK or Axios errors)
 * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
 * - Fetch API network errors
 *
 * @param error - Error to check
 * @param retryableStatusCodes - HTTP status codes that should trigger retry
 * @param customCheck - Optional custom function to determine if error is retryable
 * @returns true if error should be retried, false otherwise
 *
 * @private
 * @internal
 */
function isRetryableError(
  error: unknown,
  retryableStatusCodes: number[],
  customCheck?: (error: unknown) => boolean
): boolean {
  // Custom check takes precedence
  if (customCheck && customCheck(error)) {
    return true;
  }

  // HTTP errors with retryable status codes
  if (error && typeof error === 'object') {
    // SDK errors with status codes
    if ('status' in error && typeof error.status === 'number') {
      return retryableStatusCodes.includes(error.status);
    }

    // Axios errors
    if ('response' in error && error.response && typeof error.response === 'object') {
      const response = error.response as { status?: number };
      if (response.status && retryableStatusCodes.includes(response.status)) {
        return true;
      }
    }
  }

  // Network errors (ECONNRESET, ETIMEDOUT, ECONNREFUSED, etc.)
  if (error instanceof Error) {
    const networkErrorCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];
    if (networkErrorCodes.some(code => error.message.includes(code))) {
      return true;
    }

    // Fetch API network errors
    if (error.name === 'FetchError' || error.name === 'NetworkError') {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 *
 * Implements exponential backoff: baseDelay * 2^attempt
 * - attempt 0: 1x baseDelay (e.g., 1s)
 * - attempt 1: 2x baseDelay (e.g., 2s)
 * - attempt 2: 4x baseDelay (e.g., 4s)
 *
 * Optional jitter adds ±25% randomization to prevent thundering herd problem.
 *
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param enableJitter - Whether to add jitter (±25% randomization)
 * @returns Delay in milliseconds (rounded)
 *
 * @private
 * @internal
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  enableJitter: boolean
): number {
  // Exponential backoff: baseDelay * 2^attempt
  // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  if (!enableJitter) {
    return exponentialDelay;
  }

  // Add jitter: ±25% randomization
  const jitterRange = exponentialDelay * 0.25;
  const jitter = (Math.random() - 0.5) * 2 * jitterRange;

  return Math.round(exponentialDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 *
 * @private
 * @internal
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract error message for logging
 *
 * Safely extracts error message from various error types.
 *
 * @param error - Error to extract message from
 * @returns Error message string
 *
 * @private
 * @internal
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

/**
 * Retry async operation with exponential backoff
 *
 * Automatically retries failed operations with increasing delays between attempts.
 * Only retries errors that are classified as retryable (transient failures).
 * Throws the last error if all retry attempts are exhausted.
 *
 * @template T - Return type of the operation
 * @param operation - Async function to retry
 * @param options - Retry configuration options
 * @returns Result from successful operation
 * @throws Last error if all retry attempts fail
 *
 * @example
 * ```typescript
 * // Basic retry with defaults (3 retries, 1s base delay)
 * const result = await retryWithBackoff(
 *   () => apiClient.request({ endpoint: '/tasks', method: 'POST' })
 * );
 *
 * // Custom retry configuration
 * const result = await retryWithBackoff(
 *   () => apiClient.request({ endpoint: '/tasks', method: 'POST' }),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     enableJitter: true,
 *     retryableStatusCodes: [429, 503],
 *     operationName: 'Task Submission'
 *   }
 * );
 *
 * // Custom retry logic
 * const result = await retryWithBackoff(
 *   () => fetchData(),
 *   {
 *     isRetryable: (error) => error instanceof NetworkError,
 *     operationName: 'Data Fetch'
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    enableJitter = true,
    retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
    isRetryable: customIsRetryable,
    operationName = 'API operation',
  } = options;

  let lastError: Error | unknown;
  let totalDelay = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} for ${operationName}`);

      const result = await operation();

      if (attempt > 0) {
        logger.info(`[Retry] ✅ ${operationName} succeeded on attempt ${attempt + 1} after ${totalDelay}ms delay`, {
          operation: operationName,
          attempts: attempt + 1,
          totalDelay,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const shouldRetry = isRetryableError(error, retryableStatusCodes, customIsRetryable);

      if (!shouldRetry) {
        logger.warn(`[Retry] ❌ ${operationName} failed with non-retryable error`, {
          operation: operationName,
          error: getErrorMessage(error),
          attempt: attempt + 1,
        });
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt >= maxRetries) {
        logger.error(`[Retry] ❌ ${operationName} failed after ${maxRetries + 1} attempts`, {
          operation: operationName,
          attempts: maxRetries + 1,
          totalDelay,
          error: getErrorMessage(error),
        });
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateDelay(attempt, baseDelay, enableJitter);
      totalDelay += delay;

      logger.warn(`[Retry] ⚠️  ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms`, {
        operation: operationName,
        attempt: attempt + 1,
        delay,
        totalDelay,
        error: getErrorMessage(error),
      });

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Retry with detailed result (doesn't throw on failure)
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoffDetailed(
 *   () => apiClient.request({ endpoint: '/tasks', method: 'POST' }),
 *   { operationName: 'Task Submission' }
 * );
 *
 * if (result.success) {
 *   console.log('Generated audio:', result.result);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts');
 * }
 * ```
 */
export async function retryWithBackoffDetailed<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const result = await retryWithBackoff(operation, options);
    attempts = 1; // If successful on first try

    return {
      success: true,
      result,
      attempts,
      totalDelay: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: (options.maxRetries ?? 3) + 1,
      totalDelay: Date.now() - startTime,
    };
  }
}

/**
 * Create a retryable version of an async function
 *
 * @example
 * ```typescript
 * const retryableTranscribe = createRetryable(
 *   (audioPath: string) => client.audio.transcriptions.create({ file: audioPath }),
 *   { operationName: 'Transcription', maxRetries: 3 }
 * );
 *
 * const result = await retryableTranscribe('/path/to/audio.mp3');
 * ```
 */
export function createRetryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retryWithBackoff(() => fn(...args), options);
}
