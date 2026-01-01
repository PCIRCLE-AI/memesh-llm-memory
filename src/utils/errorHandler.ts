/**
 * Centralized Error Handling Utilities
 *
 * Provides consistent error handling with:
 * - Stack trace logging
 * - Sensitive data sanitization
 * - Structured error context
 * - Proper error formatting
 */

import { logger } from './logger.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';

/**
 * Sanitize sensitive data in strings
 *
 * Replaces lines that look like sensitive data with hashed values.
 * Uses looksLikeSensitive() to detect API keys, tokens, passwords, etc.
 *
 * @param text - Text to sanitize
 * @returns Sanitized text with sensitive data replaced by [REDACTED:hash]
 *
 * @private
 * @internal
 *
 * @example
 * ```typescript
 * const input = "API_KEY=sk-abc123xyz";
 * const output = sanitizeSensitiveData(input);
 * // Returns: "[REDACTED:a1b2c3...]"
 * ```
 */
function sanitizeSensitiveData(text: string): string {
  if (!text) return text;

  // Split into lines and sanitize each line
  return text.split('\n').map(line => {
    // If the entire line looks sensitive, hash it
    if (looksLikeSensitive(line)) {
      return `[REDACTED:${hashValue(line)}]`;
    }
    return line;
  }).join('\n');
}

/**
 * Error context for structured logging
 */
export interface ErrorContext {
  /** Component or class where error occurred */
  component: string;
  /** Method or function where error occurred */
  method: string;
  /** Operation being performed */
  operation?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
}

/**
 * Handled error result
 */
export interface HandledError {
  /** User-friendly error message */
  message: string;
  /** Sanitized stack trace (if available) */
  stack?: string;
  /** Error type/code */
  type: string;
  /** Context information */
  context?: ErrorContext;
}

/**
 * Log error with full stack trace and structured context
 *
 * @param error - Error to log
 * @param context - Contextual information
 */
export function logError(error: unknown, context: ErrorContext): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  logger.error(`Error in ${context.component}.${context.method}`, {
    message: errorObj.message,
    stack: sanitizeSensitiveData(errorObj.stack || ''),
    errorType: errorObj.constructor.name,
    context: {
      component: context.component,
      method: context.method,
      operation: context.operation,
      data: context.data ? sanitizeSensitiveData(JSON.stringify(context.data)) : undefined,
    },
  });
}

/**
 * Handle error with logging and return formatted result
 *
 * @param error - Error to handle
 * @param context - Contextual information
 * @param userMessage - Optional user-friendly message override
 * @returns Formatted error object
 */
export function handleError(
  error: unknown,
  context: ErrorContext,
  userMessage?: string
): HandledError {
  // Log error with full context and stack trace
  logError(error, context);

  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Return formatted error
  return {
    message: userMessage || errorObj.message,
    stack: sanitizeSensitiveData(errorObj.stack || ''),
    type: errorObj.constructor.name,
    context,
  };
}

/**
 * Wrap async function with error handling
 *
 * @param fn - Async function to wrap
 * @param context - Error context
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw error;
    }
  };
}

/**
 * Format error for MCP tool response
 *
 * @param error - Error to format
 * @param context - Error context
 * @returns MCP-formatted error response
 */
export function formatMCPError(
  error: unknown,
  context: ErrorContext
): {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
} {
  const handled = handleError(error, context);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            error: handled.message,
            type: handled.type,
            component: context.component,
            method: context.method,
            // Include sanitized stack trace in debug mode
            ...(process.env.NODE_ENV === 'development' && { stack: handled.stack }),
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

/**
 * Extract error message safely
 *
 * @param error - Error to extract message from
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Extract error stack safely
 *
 * @param error - Error to extract stack from
 * @returns Sanitized stack trace or undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return sanitizeSensitiveData(error.stack);
  }
  return undefined;
}
