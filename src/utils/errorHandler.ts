/**
 * Centralized Error Handling Utilities
 *
 * Provides consistent error handling with:
 * - Stack trace logging
 * - Sensitive data sanitization
 * - Structured error context
 * - Proper error formatting
 * - Enhanced visual hierarchy with category badges
 * - Boxed suggestion blocks for better scannability
 */

import { logger } from './logger.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';
import chalk from 'chalk';
import boxen from 'boxen';

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
  /** ✅ FIX HIGH-10: Request ID for distributed tracing */
  requestId?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
}

/**
 * Serialized representation of an error in a cause chain
 */
export interface ErrorCauseInfo {
  /** Error message */
  message: string;
  /** Error type/constructor name */
  type: string;
  /** Sanitized stack trace (if available) */
  stack?: string;
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
  /** Cause chain from Error.cause (ES2022+), ordered root-cause last */
  causeChain?: ErrorCauseInfo[];
}

/**
 * ✅ FIX MEDIUM-2: Safely stringify data with size limit
 *
 * Prevents memory exhaustion and log overflow from large objects.
 *
 * @param data - Data to stringify
 * @param maxLength - Maximum length of stringified output (default: 2000)
 * @returns Safely stringified data with truncation if needed
 *
 * @private
 */
function safeStringifyWithLimit(data: unknown, maxLength: number = 2000): string {
  try {
    const str = JSON.stringify(data);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + `... (truncated, ${str.length} total chars)`;
    }
    return str;
  } catch (error) {
    return `[Stringify failed: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Extract the cause chain from an Error (ES2022 Error.cause support)
 *
 * Walks the `cause` property recursively, collecting each cause into an array.
 * Limits depth to prevent infinite loops from circular cause references.
 *
 * @param error - Error whose cause chain to extract
 * @param maxDepth - Maximum cause chain depth (default: 10)
 * @returns Array of cause info objects, or undefined if no cause chain exists
 *
 * @private
 * @internal
 */
function extractCauseChain(error: unknown, maxDepth: number = 10): ErrorCauseInfo[] | undefined {
  if (!(error instanceof Error) || !error.cause) {
    return undefined;
  }

  const chain: ErrorCauseInfo[] = [];
  let current: unknown = error.cause;
  const seen = new WeakSet<object>();

  while (current && chain.length < maxDepth) {
    // Guard against circular cause references
    // Note: Check for null first, then check typeof to ensure proper type narrowing
    // This avoids the "comparison between inconvertible types" issue where
    // typeof x === 'object' includes null (since typeof null === 'object')
    if (current !== null && typeof current === 'object') {
      if (seen.has(current)) {
        chain.push({ message: '[Circular cause reference]', type: 'CircularRef' });
        break;
      }
      seen.add(current);
    }

    if (current instanceof Error) {
      chain.push({
        message: current.message,
        type: current.constructor.name,
        stack: current.stack ? sanitizeSensitiveData(current.stack) : undefined,
      });
      current = current.cause;
    } else {
      // Non-Error cause value (e.g., a string or plain object)
      chain.push({
        message: String(current),
        type: typeof current,
      });
      break;
    }
  }

  return chain.length > 0 ? chain : undefined;
}

/**
 * Log error with full stack trace and structured context
 *
 * ✅ FIX MEDIUM-2: Now uses safe stringify with size limits
 * ✅ FIX: Now preserves and logs the Error.cause chain
 *
 * @param error - Error to log
 * @param context - Contextual information
 */
export function logError(error: unknown, context: ErrorContext): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const causeChain = extractCauseChain(errorObj);

  logger.error(`Error in ${context.component}.${context.method}`, {
    message: errorObj.message,
    stack: sanitizeSensitiveData(errorObj.stack || ''),
    errorType: errorObj.constructor.name,
    requestId: context.requestId, // ✅ FIX HIGH-10: Include request ID in logs
    ...(causeChain && { causeChain }),
    context: {
      component: context.component,
      method: context.method,
      operation: context.operation,
      data: context.data ? sanitizeSensitiveData(safeStringifyWithLimit(context.data)) : undefined,
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
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // ✅ FIX: Extract cause chain once and reuse for both logging and the return object,
  // avoiding a redundant second traversal inside logError().
  const causeChain = extractCauseChain(errorObj);

  // Log error with full context and stack trace
  logger.error(`Error in ${context.component}.${context.method}`, {
    message: errorObj.message,
    stack: sanitizeSensitiveData(errorObj.stack || ''),
    errorType: errorObj.constructor.name,
    requestId: context.requestId,
    ...(causeChain && { causeChain }),
    context: {
      component: context.component,
      method: context.method,
      operation: context.operation,
      data: context.data ? sanitizeSensitiveData(safeStringifyWithLimit(context.data)) : undefined,
    },
  });

  // Return formatted error with the same cause chain (no double extraction)
  return {
    message: userMessage || errorObj.message,
    stack: sanitizeSensitiveData(errorObj.stack || ''),
    type: errorObj.constructor.name,
    context,
    ...(causeChain && { causeChain }),
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
 * Error category type for categorizing different error types
 */
export type ErrorCategory = 'GIT' | 'FILESYSTEM' | 'NETWORK' | 'DATABASE' | 'AUTH' | 'VALIDATION' | 'RESOURCE' | 'API';

/**
 * Error recovery suggestions mapping
 *
 * Maps error patterns to helpful recovery suggestions with code examples
 */
const RECOVERY_SUGGESTIONS: Array<{
  pattern: RegExp;
  suggestion: string;
  category: ErrorCategory;
  example?: {
    current?: string;
    expected?: string;
    quickFix?: string[];
  };
}> = [
  // Git-related errors
  {
    pattern: /not a git repository/i,
    suggestion: 'Run `git init` to initialize a Git repository',
    category: 'GIT',
    example: {
      current: 'Not a Git repository',
      expected: 'Has .git folder',
      quickFix: [
        'cd ~/your-project',
        'git init',
      ],
    },
  },
  {
    pattern: /nothing to commit/i,
    suggestion: 'No changes detected. Make some changes to files first',
    category: 'GIT',
    example: {
      current: 'No staged changes',
      expected: 'Files added to staging area',
      quickFix: [
        'git status',
        'git add <file>',
        'git commit -m "message"',
      ],
    },
  },
  {
    pattern: /invalid reference/i,
    suggestion: 'Use `git log --oneline` to find a valid commit hash',
    category: 'GIT',
    example: {
      quickFix: [
        'git log --oneline',
        'git show <commit-hash>',
      ],
    },
  },
  {
    pattern: /permission denied/i,
    suggestion: 'Check file/directory permissions. You may need to change ownership or run with elevated privileges',
    category: 'FILESYSTEM',
    example: {
      quickFix: [
        'ls -la <file>',
        'chmod 755 <file>',
        'sudo chown $USER <file>',
      ],
    },
  },
  {
    pattern: /ENOENT|no such file/i,
    suggestion: 'Check that the file or directory path exists',
    category: 'FILESYSTEM',
    example: {
      current: 'Path does not exist',
      expected: 'Valid file or directory path',
      quickFix: [
        'ls -la <directory>',
        'mkdir -p <directory>',
      ],
    },
  },
  {
    pattern: /insufficient disk space/i,
    suggestion: 'Free up disk space by removing old backups or temporary files',
    category: 'FILESYSTEM',
    example: {
      quickFix: [
        'df -h',
        'du -sh *',
        'rm -rf /tmp/*',
      ],
    },
  },
  // Network-related errors
  {
    pattern: /ECONNREFUSED|connection refused/i,
    suggestion: 'Check if the service is running and verify the host and port are correct',
    category: 'NETWORK',
    example: {
      current: 'Service not responding',
      expected: 'Service listening on port',
      quickFix: [
        'netstat -an | grep <port>',
        'curl http://localhost:<port>',
      ],
    },
  },
  {
    pattern: /ETIMEDOUT|timeout/i,
    suggestion: 'Check network connectivity. The service may be slow or unreachable',
    category: 'NETWORK',
    example: {
      quickFix: [
        'ping <host>',
        'curl -v <url>',
      ],
    },
  },
  {
    pattern: /ENOTFOUND|DNS/i,
    suggestion: 'Check that the hostname is correct and DNS is working properly',
    category: 'NETWORK',
    example: {
      quickFix: [
        'nslookup <hostname>',
        'ping <hostname>',
      ],
    },
  },
  // Validation errors
  {
    pattern: /validation.*failed|invalid.*input/i,
    suggestion: 'Check the input parameters. Make sure required fields are provided and have correct types',
    category: 'VALIDATION',
  },
  {
    pattern: /expected.*received/i,
    suggestion: 'Check the parameter type. Make sure you\'re passing the correct data type',
    category: 'VALIDATION',
  },
  // Authentication errors
  {
    pattern: /unauthorized|authentication.*failed/i,
    suggestion: 'Check your credentials or API keys. They may be expired or incorrect',
    category: 'AUTH',
    example: {
      current: 'Invalid or expired credentials',
      expected: 'Valid API key or token',
      quickFix: [
        'echo $API_KEY',
        'export API_KEY=your-key-here',
      ],
    },
  },
  {
    pattern: /forbidden|access denied/i,
    suggestion: 'Check your permissions. You may not have access to this resource',
    category: 'AUTH',
  },
  // Database errors
  {
    pattern: /SQLITE_BUSY|database.*locked/i,
    suggestion: 'Wait a moment and retry. Another process may be using the database',
    category: 'DATABASE',
    example: {
      current: 'Database locked',
      expected: 'Database accessible',
      quickFix: [
        'lsof <database-file>',
        'kill <process-id>',
      ],
    },
  },
  {
    pattern: /no such table/i,
    suggestion: 'The database may need to be initialized or migrated',
    category: 'DATABASE',
    example: {
      quickFix: [
        'npm run db:migrate',
        'npm run db:seed',
      ],
    },
  },
  // Memory/Resource errors
  {
    pattern: /out of memory|ENOMEM/i,
    suggestion: 'Close other applications or increase available memory',
    category: 'RESOURCE',
    example: {
      quickFix: [
        'free -h',
        'top',
      ],
    },
  },
  {
    pattern: /too many open files|EMFILE/i,
    suggestion: 'Close unused files or increase the file descriptor limit',
    category: 'RESOURCE',
    example: {
      quickFix: [
        'ulimit -n',
        'ulimit -n 4096',
      ],
    },
  },
  // API/Rate limit errors
  {
    pattern: /rate limit|too many requests/i,
    suggestion: 'Wait a few minutes before retrying. You\'ve hit the rate limit',
    category: 'API',
  },
  {
    pattern: /quota exceeded/i,
    suggestion: 'Check your usage quota. You may need to upgrade your plan or wait for reset',
    category: 'API',
  },
];

/**
 * Get category badge for an error
 *
 * Creates a colored badge for the error category
 *
 * @param category - Error category
 * @returns Colored badge string
 *
 * @example
 * ```typescript
 * getCategoryBadge('GIT');
 * // Returns: chalk.bgYellow.black(' GIT ')
 * ```
 */
export function getCategoryBadge(category: ErrorCategory): string {
  const badges: Record<ErrorCategory, string> = {
    GIT: chalk.bgYellow.black(' GIT '),
    FILESYSTEM: chalk.bgBlue.white(' FILESYSTEM '),
    NETWORK: chalk.bgMagenta.white(' NETWORK '),
    DATABASE: chalk.bgCyan.black(' DATABASE '),
    AUTH: chalk.bgRed.white(' AUTH '),
    VALIDATION: chalk.bgGreen.black(' VALIDATION '),
    RESOURCE: chalk.bgRed.white(' RESOURCE '),
    API: chalk.bgMagenta.white(' API '),
  };

  return badges[category];
}

/**
 * Format suggestion block with boxen
 *
 * Creates a visually appealing boxed suggestion with optional code example
 *
 * @param suggestion - Main suggestion text
 * @param example - Optional code example with current state, expected state, and quick fix
 * @returns Formatted suggestion block
 *
 * @example
 * ```typescript
 * formatSuggestionBlock(
 *   'Run `git init` to create a repository',
 *   {
 *     current: '~/my-project',
 *     expected: 'Has .git folder',
 *     quickFix: ['cd ~/my-project', 'git init']
 *   }
 * );
 * ```
 */
export function formatSuggestionBlock(
  suggestion: string,
  example?: {
    current?: string;
    expected?: string;
    quickFix?: string[];
  }
): string {
  let content = suggestion;

  if (example) {
    if (example.current) {
      content += `\n\n${chalk.dim('Current:')} ${chalk.red(example.current)}`;
    }
    if (example.expected) {
      content += `\n${chalk.dim('Expected:')} ${chalk.green(example.expected)}`;
    }
    if (example.quickFix && example.quickFix.length > 0) {
      content += `\n\n${chalk.dim('Quick fix:')}`;
      example.quickFix.forEach(cmd => {
        content += `\n  ${chalk.cyan(cmd)}`;
      });
    }
  }

  return boxen(content, {
    title: '💡 Suggestion',
    titleAlignment: 'left',
    borderStyle: 'round',
    borderColor: 'yellow',
    padding: 1,
  });
}

/**
 * Get recovery suggestion for an error
 *
 * Analyzes the error message and returns a helpful suggestion
 * for how to recover from or fix the error.
 *
 * @param error - Error to analyze
 * @returns Recovery suggestion object with text and optional example, or undefined if no suggestion available
 *
 * @example
 * ```typescript
 * const suggestion = getRecoverySuggestion(new Error('Not a git repository'));
 * // Returns: { suggestion: "Run `git init`...", category: 'GIT', example: {...} }
 * ```
 */
export function getRecoverySuggestion(error: unknown): {
  suggestion: string;
  category: ErrorCategory;
  example?: {
    current?: string;
    expected?: string;
    quickFix?: string[];
  };
} | undefined {
  const errorMessage = getErrorMessage(error);

  for (const { pattern, suggestion, category, example } of RECOVERY_SUGGESTIONS) {
    if (pattern.test(errorMessage)) {
      return { suggestion, category, example };
    }
  }

  return undefined;
}

/**
 * Format error message with recovery suggestion
 *
 * Creates a user-friendly error message that includes both
 * the error details and a helpful recovery suggestion with enhanced visual hierarchy.
 *
 * @param error - Error to format
 * @param operation - Description of what operation failed
 * @returns Formatted error message with suggestion and category badge
 *
 * @example
 * ```typescript
 * const message = formatErrorWithSuggestion(
 *   new Error('Not a git repository'),
 *   'commit changes'
 * );
 * // Returns:
 * // "❌ Failed to commit changes
 * //    Category: [GIT]
 * //    Error: not a git repository
 * //
 * // ┌─ 💡 Suggestion ──────────────┐
 * // │                              │
 * // │  Run `git init` to create    │
 * // │  a repository                │
 * // │                              │
 * // │  Current: ~/my-project       │
 * // │  Expected: Has .git folder   │
 * // │                              │
 * // │  Quick fix:                  │
 * // │    cd ~/my-project           │
 * // │    git init                  │
 * // │                              │
 * // └──────────────────────────────┘"
 * ```
 */
export function formatErrorWithSuggestion(
  error: unknown,
  operation: string
): string {
  const errorMessage = getErrorMessage(error);
  const suggestionData = getRecoverySuggestion(error);

  // Build header with operation name
  let result = `❌ Failed to ${operation}`;

  // Add category badge if suggestion found
  if (suggestionData) {
    result += `\n   Category: ${getCategoryBadge(suggestionData.category)}`;
  }

  // Add error message in red
  result += `\n   Error: ${chalk.red(errorMessage)}`;

  // Add formatted suggestion block if available
  if (suggestionData) {
    result += `\n\n${formatSuggestionBlock(suggestionData.suggestion, suggestionData.example)}`;
  }

  return result;
}
