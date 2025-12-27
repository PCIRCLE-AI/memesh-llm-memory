/**
 * Error Class Hierarchy
 *
 * Structured error types for better error handling and debugging:
 * - Type-safe error handling with instanceof checks
 * - Consistent error messages and metadata
 * - Better stack traces and debugging information
 * - Easier error categorization and monitoring
 */

/**
 * Base error class for all credential-related errors
 */
export class CredentialError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'CredentialError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation errors - invalid input data
 */
export class ValidationError extends CredentialError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Authentication errors - authentication failures
 */
export class AuthenticationError extends CredentialError {
  constructor(
    message: string,
    public readonly identity?: string
  ) {
    super(message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization errors - permission denied
 */
export class AuthorizationError extends CredentialError {
  constructor(
    message: string,
    public readonly requiredPermission?: string,
    public readonly identity?: string
  ) {
    super(message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found errors - resource not found
 */
export class NotFoundError extends CredentialError {
  constructor(
    message: string,
    public readonly resourceType?: string,
    public readonly resourceId?: string
  ) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict errors - resource already exists
 */
export class ConflictError extends CredentialError {
  constructor(
    message: string,
    public readonly resourceType?: string,
    public readonly conflictingValue?: unknown
  ) {
    super(message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit errors - too many requests
 */
export class RateLimitError extends CredentialError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    public readonly limit?: number
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Quota exceeded errors - resource quota exceeded
 */
export class QuotaExceededError extends CredentialError {
  constructor(
    message: string,
    public readonly quotaType?: string,
    public readonly current?: number,
    public readonly limit?: number
  ) {
    super(message, 'QUOTA_EXCEEDED');
    this.name = 'QuotaExceededError';
  }
}

/**
 * Encryption errors - encryption/decryption failures
 */
export class EncryptionError extends CredentialError {
  constructor(
    message: string,
    public readonly operation?: 'encrypt' | 'decrypt'
  ) {
    super(message, 'ENCRYPTION_ERROR');
    this.name = 'EncryptionError';
  }
}

/**
 * Storage errors - storage backend failures
 */
export class StorageError extends CredentialError {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly backend?: string
  ) {
    super(message, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}

/**
 * Database errors - database operation failures
 */
export class DatabaseError extends CredentialError {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly table?: string
  ) {
    super(message, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

/**
 * Rotation errors - credential rotation failures
 */
export class RotationError extends CredentialError {
  constructor(
    message: string,
    public readonly credentialId?: string,
    public readonly provider?: string
  ) {
    super(message, 'ROTATION_ERROR');
    this.name = 'RotationError';
  }
}

/**
 * Tenant errors - multi-tenancy related errors
 */
export class TenantError extends CredentialError {
  constructor(
    message: string,
    public readonly tenantId?: string,
    public readonly status?: string
  ) {
    super(message, 'TENANT_ERROR');
    this.name = 'TenantError';
  }
}

/**
 * Configuration errors - invalid configuration
 */
export class ConfigurationError extends CredentialError {
  constructor(
    message: string,
    public readonly configKey?: string,
    public readonly expectedType?: string
  ) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

/**
 * Helper function to check if an error is a CredentialError
 */
export function isCredentialError(error: unknown): error is CredentialError {
  return error instanceof CredentialError;
}

/**
 * Helper function to extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Helper function to extract error code safely
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isCredentialError(error)) {
    return error.code;
  }
  return undefined;
}

/**
 * Helper function to create error response for API
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function toErrorResponse(error: unknown): ErrorResponse {
  if (isCredentialError(error)) {
    const details: Record<string, unknown> = {};

    // Add specific error details based on type
    if (error instanceof ValidationError) {
      if (error.field) details.field = error.field;
      if (error.value !== undefined) details.value = error.value;
    } else if (error instanceof AuthorizationError) {
      if (error.requiredPermission) details.requiredPermission = error.requiredPermission;
      if (error.identity) details.identity = error.identity;
    } else if (error instanceof RateLimitError) {
      if (error.retryAfter) details.retryAfter = error.retryAfter;
      if (error.limit) details.limit = error.limit;
    } else if (error instanceof QuotaExceededError) {
      if (error.quotaType) details.quotaType = error.quotaType;
      if (error.current !== undefined) details.current = error.current;
      if (error.limit !== undefined) details.limit = error.limit;
    }

    return {
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        details: Object.keys(details).length > 0 ? details : undefined,
      },
    };
  }

  // Generic error
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: getErrorMessage(error),
    },
  };
}
