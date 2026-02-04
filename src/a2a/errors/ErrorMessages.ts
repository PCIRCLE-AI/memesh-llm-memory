/**
 * A2A Error Messages
 * Centralized error message templates for consistent error reporting
 */

import { ErrorCodes } from './ErrorCodes.js';

export const ErrorMessages = {
  // Authentication & Authorization
  [ErrorCodes.AUTH_TOKEN_NOT_CONFIGURED]:
    'MEMESH_A2A_TOKEN environment variable is not configured',
  [ErrorCodes.AUTH_FAILED]: 'Authentication failed - invalid A2A token',
  [ErrorCodes.AUTH_TOKEN_MISSING]: 'A2A authentication token is missing',

  // Agent Operations
  [ErrorCodes.AGENT_NOT_FOUND]: (agentId: string) => `Agent not found: ${agentId}`,
  [ErrorCodes.AGENT_ALREADY_PROCESSING]: (phase: string = 'Phase 1.0') =>
    `Agent already processing a task (${phase} limitation)`,
  [ErrorCodes.AGENT_REGISTRY_ERROR]: (error: string) =>
    `Agent registry operation failed: ${error}`,

  // Task Operations
  [ErrorCodes.TASK_NOT_FOUND]: (taskId: string) => `Task not found: ${taskId}`,
  [ErrorCodes.TASK_TIMEOUT]: (taskId: string, timeoutSeconds: number) =>
    `Task timeout detected: ${taskId} (timeout: ${timeoutSeconds}s)`,
  [ErrorCodes.TASK_SEND_FAILED]: (targetAgentId: string, error: string) =>
    `Failed to send message to ${targetAgentId}: ${error}`,
  [ErrorCodes.TASK_GET_FAILED]: (taskId: string, targetAgentId: string, error: string) =>
    `Failed to get task ${taskId} from ${targetAgentId}: ${error}`,
  [ErrorCodes.TASK_LIST_FAILED]: (targetAgentId: string, error: string) =>
    `Failed to list tasks from ${targetAgentId}: ${error}`,
  [ErrorCodes.TASK_CANCEL_FAILED]: (taskId: string, targetAgentId: string, error: string) =>
    `Failed to cancel task ${taskId} on ${targetAgentId}: ${error}`,

  // Server Operations
  [ErrorCodes.PORT_NOT_AVAILABLE]: (min: number, max: number) =>
    `No available port in range ${min}-${max}`,
  [ErrorCodes.SERVER_ERROR]: (error: string) => `Server error: ${error}`,

  // Data Operations
  [ErrorCodes.INVALID_JSON]: (context: string, preview?: string) =>
    `Invalid JSON data in ${context}${preview ? `: ${preview}` : ''}`,
  [ErrorCodes.DATABASE_ERROR]: (operation: string, error: string) =>
    `Database ${operation} failed: ${error}`,

  // Timeout Checker
  [ErrorCodes.TIMEOUT_CHECKER_ERROR]: (error: string) => `TimeoutChecker error: ${error}`,
  [ErrorCodes.TIMEOUT_CHECKER_CIRCUIT_OPEN]: (failureCount: number, maxRetries: number) =>
    `TimeoutChecker circuit breaker is open (${failureCount}/${maxRetries} consecutive failures). Service temporarily degraded.`,

  // HTTP Errors
  [ErrorCodes.HTTP_ERROR]: (status: number, message?: string) =>
    `HTTP error ${status}${message ? `: ${message}` : ''}`,
  [ErrorCodes.REQUEST_TIMEOUT]: (url: string, timeoutMs: number) =>
    `Request to ${url} aborted due to timeout (${timeoutMs}ms)`,
  [ErrorCodes.INVALID_CONTENT_TYPE]: (contentType: string, status: number) =>
    `Unexpected Content-Type: ${contentType}, expected application/json (status: ${status})`,

  // Generic
  [ErrorCodes.UNKNOWN_ERROR]: 'An unknown error occurred',
} as const;

/**
 * Helper function to format error messages with parameters
 */
export function formatErrorMessage(
  code: keyof typeof ErrorMessages,
  ...args: any[]
): string {
  const template = ErrorMessages[code];
  if (typeof template === 'function') {
    return (template as (...args: any[]) => string)(...args);
  }
  return template as string;
}

/**
 * Helper function to extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Helper function to create standardized error with code
 *
 * For HTTP errors, attaches the status code to enable retry logic.
 */
export function createError(code: keyof typeof ErrorMessages, ...args: any[]): Error {
  const message = formatErrorMessage(code, ...args);
  const error = new Error(message);
  (error as Error & { code: string }).code = code;

  // For HTTP_ERROR, attach the status code to the error object
  // This enables retry logic to check if error is retryable based on status
  if (code === 'HTTP_ERROR' && typeof args[0] === 'number') {
    (error as Error & { status: number }).status = args[0];
  }

  // For AUTH_FAILED, mark as 401 to prevent retry
  if (code === 'AUTH_FAILED') {
    (error as Error & { status: number }).status = 401;
  }

  return error;
}
