/**
 * Input Validation Utilities for Credential Management
 *
 * Provides comprehensive validation for service names, account names,
 * and other inputs to prevent injection attacks and ensure data integrity.
 */

/**
 * Validation error with context
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate service name
 * @throws {ValidationError} If service name is invalid
 */
export function validateServiceName(service: string): void {
  if (typeof service !== 'string') {
    throw new ValidationError(
      'Service name must be a string',
      'service',
      service
    );
  }

  if (!service || service.trim().length === 0) {
    throw new ValidationError(
      'Service name cannot be empty',
      'service',
      service
    );
  }

  if (service.length > 255) {
    throw new ValidationError(
      `Service name too long (max 255 chars, got ${service.length})`,
      'service',
      service
    );
  }

  // Check for dangerous characters
  if (/[\x00-\x1F\x7F]/.test(service)) {
    throw new ValidationError(
      'Service name contains control characters',
      'service',
      service
    );
  }
}

/**
 * Validate account name
 * @throws {ValidationError} If account name is invalid
 */
export function validateAccountName(account: string): void {
  if (typeof account !== 'string') {
    throw new ValidationError(
      'Account name must be a string',
      'account',
      account
    );
  }

  if (!account || account.trim().length === 0) {
    throw new ValidationError(
      'Account name cannot be empty',
      'account',
      account
    );
  }

  if (account.length > 255) {
    throw new ValidationError(
      `Account name too long (max 255 chars, got ${account.length})`,
      'account',
      account
    );
  }

  // Check for dangerous characters
  if (/[\x00-\x1F\x7F]/.test(account)) {
    throw new ValidationError(
      'Account name contains control characters',
      'account',
      account
    );
  }
}

/**
 * Validate service and account together
 * @throws {ValidationError} If either is invalid
 */
export function validateServiceAndAccount(service: string, account: string): void {
  validateServiceName(service);
  validateAccountName(account);
}

/**
 * Validate positive integer
 * @throws {ValidationError} If not a positive integer
 */
export function validatePositiveInteger(value: number, field: string): void {
  if (typeof value !== 'number') {
    throw new ValidationError(
      `${field} must be a number`,
      field,
      value
    );
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(
      `${field} must be an integer`,
      field,
      value
    );
  }

  if (value <= 0) {
    throw new ValidationError(
      `${field} must be positive`,
      field,
      value
    );
  }
}

/**
 * Validate date is not in the past
 * @throws {ValidationError} If date is in the past
 */
export function validateFutureDate(date: Date, field: string): void {
  if (!(date instanceof Date)) {
    throw new ValidationError(
      `${field} must be a Date object`,
      field,
      date
    );
  }

  if (isNaN(date.getTime())) {
    throw new ValidationError(
      `${field} is an invalid date`,
      field,
      date
    );
  }

  if (date.getTime() < Date.now()) {
    throw new ValidationError(
      `${field} cannot be in the past`,
      field,
      date
    );
  }
}

/**
 * Validate metadata size
 * @throws {ValidationError} If metadata is too large
 */
export function validateMetadataSize(metadata: Record<string, any>, maxSizeBytes: number = 10240): void {
  const size = JSON.stringify(metadata).length;

  if (size > maxSizeBytes) {
    throw new ValidationError(
      `Metadata too large (max ${maxSizeBytes} bytes, got ${size})`,
      'metadata',
      metadata
    );
  }
}

/**
 * Sanitize string for logging (remove sensitive data patterns)
 */
export function sanitizeForLogging(str: string): string {
  // Remove potential API keys, tokens, passwords
  return str
    .replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED]') // Long alphanumeric strings
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
    .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]');
}
