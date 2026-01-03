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

/**
 * Error recovery suggestions mapping
 *
 * Maps error patterns to helpful recovery suggestions
 */
const RECOVERY_SUGGESTIONS: Array<{
  pattern: RegExp;
  suggestion: string;
  category: string;
}> = [
  // Git-related errors
  {
    pattern: /not a git repository/i,
    suggestion: '💡 Try: Use git-setup to initialize Git, or navigate to a Git repository.',
    category: 'git',
  },
  {
    pattern: /nothing to commit/i,
    suggestion: '💡 Tip: No changes detected. Make some changes to files first.',
    category: 'git',
  },
  {
    pattern: /invalid reference/i,
    suggestion: '💡 Try: Use git-list-versions to see available versions and their hashes.',
    category: 'git',
  },
  {
    pattern: /permission denied/i,
    suggestion: '💡 Check: File/directory permissions. You may need to change ownership or run with elevated privileges.',
    category: 'filesystem',
  },
  {
    pattern: /ENOENT|no such file/i,
    suggestion: '💡 Check: The file or directory path. Make sure it exists.',
    category: 'filesystem',
  },
  {
    pattern: /insufficient disk space/i,
    suggestion: '💡 Try: Free up disk space by removing old backups or temporary files.',
    category: 'filesystem',
  },
  // Network-related errors
  {
    pattern: /ECONNREFUSED|connection refused/i,
    suggestion: '💡 Check: Is the service running? Verify the host and port are correct.',
    category: 'network',
  },
  {
    pattern: /ETIMEDOUT|timeout/i,
    suggestion: '💡 Try: Check network connectivity. The service may be slow or unreachable.',
    category: 'network',
  },
  {
    pattern: /ENOTFOUND|DNS/i,
    suggestion: '💡 Check: The hostname is correct and DNS is working properly.',
    category: 'network',
  },
  // Validation errors
  {
    pattern: /validation.*failed|invalid.*input/i,
    suggestion: '💡 Check: The input parameters. Make sure required fields are provided and have correct types.',
    category: 'validation',
  },
  {
    pattern: /expected.*received/i,
    suggestion: '💡 Check: The parameter type. Make sure you\'re passing the correct data type.',
    category: 'validation',
  },
  // Authentication errors
  {
    pattern: /unauthorized|authentication.*failed/i,
    suggestion: '💡 Check: Your credentials or API keys. They may be expired or incorrect.',
    category: 'auth',
  },
  {
    pattern: /forbidden|access denied/i,
    suggestion: '💡 Check: Your permissions. You may not have access to this resource.',
    category: 'auth',
  },
  // Database errors
  {
    pattern: /SQLITE_BUSY|database.*locked/i,
    suggestion: '💡 Try: Wait a moment and retry. Another process may be using the database.',
    category: 'database',
  },
  {
    pattern: /no such table/i,
    suggestion: '💡 Try: The database may need to be initialized or migrated.',
    category: 'database',
  },
  // Memory/Resource errors
  {
    pattern: /out of memory|ENOMEM/i,
    suggestion: '💡 Try: Close other applications or increase available memory.',
    category: 'resource',
  },
  {
    pattern: /too many open files|EMFILE/i,
    suggestion: '💡 Try: Close unused files or increase the file descriptor limit.',
    category: 'resource',
  },
  // API/Rate limit errors
  {
    pattern: /rate limit|too many requests/i,
    suggestion: '💡 Try: Wait a few minutes before retrying. You\'ve hit the rate limit.',
    category: 'api',
  },
  {
    pattern: /quota exceeded/i,
    suggestion: '💡 Check: Your usage quota. You may need to upgrade your plan or wait for reset.',
    category: 'api',
  },
];

/**
 * Get recovery suggestion for an error
 *
 * Analyzes the error message and returns a helpful suggestion
 * for how to recover from or fix the error.
 *
 * @param error - Error to analyze
 * @returns Recovery suggestion string, or undefined if no suggestion available
 *
 * @example
 * ```typescript
 * const suggestion = getRecoverySuggestion(new Error('Not a git repository'));
 * // Returns: "💡 Try: Use git-setup to initialize Git..."
 * ```
 */
export function getRecoverySuggestion(error: unknown): string | undefined {
  const errorMessage = getErrorMessage(error);

  for (const { pattern, suggestion } of RECOVERY_SUGGESTIONS) {
    if (pattern.test(errorMessage)) {
      return suggestion;
    }
  }

  return undefined;
}

/**
 * Format error message with recovery suggestion
 *
 * Creates a user-friendly error message that includes both
 * the error details and a helpful recovery suggestion.
 *
 * @param error - Error to format
 * @param operation - Description of what operation failed
 * @returns Formatted error message with suggestion
 *
 * @example
 * ```typescript
 * const message = formatErrorWithSuggestion(
 *   new Error('Not a git repository'),
 *   'list versions'
 * );
 * // Returns:
 * // "❌ Failed to list versions: Not a git repository
 * //
 * // 💡 Try: Use git-setup to initialize Git..."
 * ```
 */
export function formatErrorWithSuggestion(
  error: unknown,
  operation: string
): string {
  const errorMessage = getErrorMessage(error);
  const suggestion = getRecoverySuggestion(error);

  let result = `❌ Failed to ${operation}: ${errorMessage}`;

  if (suggestion) {
    result += `\n\n${suggestion}`;
  }

  return result;
}
