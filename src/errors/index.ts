/**
 * Custom Error Classes for Claude Code Buddy
 *
 * Provides a standardized error hierarchy for better error handling and debugging.
 * All custom errors extend BaseError which includes error codes and context.
 */

/**
 * Error codes for programmatic error handling
 */
export enum ErrorCode {
  // Validation errors (1000-1999)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_RANGE = 'INVALID_RANGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',

  // State errors (2000-2999)
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  ALREADY_INITIALIZED = 'ALREADY_INITIALIZED',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // Not found errors (3000-3999)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',

  // Configuration errors (4000-4999)
  CONFIGURATION_INVALID = 'CONFIGURATION_INVALID',
  CONFIGURATION_MISSING = 'CONFIGURATION_MISSING',
  API_KEY_MISSING = 'API_KEY_MISSING',
  UNSUPPORTED_OPTION = 'UNSUPPORTED_OPTION',

  // Operation errors (5000-5999)
  OPERATION_FAILED = 'OPERATION_FAILED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  DIMENSION_MISMATCH = 'DIMENSION_MISMATCH',

  // External service errors (6000-6999)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Base error class for all custom errors
 * Provides consistent error structure with code and context
 */
export class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Validation Error - Invalid input parameters
 *
 * Use when input fails validation checks (type, range, format, etc.)
 *
 * @example
 * throw new ValidationError('CPU percentage must be between 0 and 100', {
 *   value: 150,
 *   min: 0,
 *   max: 100
 * });
 */
export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_FAILED, context);
  }
}

/**
 * State Error - Invalid state for operation
 *
 * Use when operation cannot proceed due to invalid state
 * (not initialized, already running, etc.)
 *
 * @example
 * throw new StateError('Memory system not initialized', {
 *   operation: 'search',
 *   requiredState: 'initialized',
 *   currentState: 'not_initialized'
 * });
 */
export class StateError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.INVALID_STATE, context);
  }
}

/**
 * Not Found Error - Resource not found
 *
 * Use when a requested resource doesn't exist
 *
 * @example
 * throw new NotFoundError('Task not found', {
 *   taskId: 'abc-123',
 *   operation: 'cancel'
 * });
 */
export class NotFoundError extends BaseError {
  constructor(
    message: string,
    resourceType?: string,
    resourceId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCode.RESOURCE_NOT_FOUND, {
      resourceType,
      resourceId,
      ...context,
    });
  }
}

/**
 * Configuration Error - Configuration issues
 *
 * Use when configuration is missing or invalid
 *
 * @example
 * throw new ConfigurationError('OpenAI API key is required', {
 *   configKey: 'OPENAI_API_KEY',
 *   envVar: 'OPENAI_API_KEY'
 * });
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.CONFIGURATION_INVALID, context);
  }
}

/**
 * Operation Error - Operation execution failed
 *
 * Use when an operation fails during execution
 *
 * @example
 * throw new OperationError('Embedding creation failed', {
 *   operation: 'createEmbedding',
 *   inputLength: 1000,
 *   cause: originalError
 * });
 */
export class OperationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.OPERATION_FAILED, context);
  }
}

/**
 * External Service Error - External API/service failures
 *
 * Use when external service calls fail
 *
 * @example
 * throw new ExternalServiceError('External API request failed', {
 *   service: 'third-party-service',
 *   endpoint: '/endpoint',
 *   statusCode: 500,
 *   response: errorResponse
 * });
 */
export class ExternalServiceError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.EXTERNAL_SERVICE_ERROR, context);
  }
}

/**
 * Type guard to check if error is a custom BaseError
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is a StateError
 */
export function isStateError(error: unknown): error is StateError {
  return error instanceof StateError;
}

/**
 * Type guard to check if error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard to check if error is a ConfigurationError
 */
export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

/**
 * Type guard to check if error is an OperationError
 */
export function isOperationError(error: unknown): error is OperationError {
  return error instanceof OperationError;
}

/**
 * Type guard to check if error is an ExternalServiceError
 */
export function isExternalServiceError(error: unknown): error is ExternalServiceError {
  return error instanceof ExternalServiceError;
}

/**
 * Helper to extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Helper to extract error code from custom errors
 */
export function getErrorCode(error: unknown): ErrorCode | undefined {
  if (isBaseError(error)) {
    return error.code;
  }
  return undefined;
}
