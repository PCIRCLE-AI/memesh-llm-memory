/**
 * ✅ SECURITY FIX (HIGH-3): Input Validation Error
 *
 * Custom error class for input validation failures.
 * Provides structured error information for security-related validation.
 */

export class ValidationError extends Error {
  public readonly code: string = 'VALIDATION_ERROR';
  public readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
