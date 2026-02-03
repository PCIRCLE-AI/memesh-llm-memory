import { ValidationError } from '../errors/index.js';

export function validateFiniteNumber(
  value: number,
  name: string,
  options?: { min?: number; max?: number }
): void {
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${name} must be finite number`, {
      providedValue: value,
    });
  }

  if (options?.min !== undefined && value < options.min) {
    throw new ValidationError(`${name} must be >= ${options.min}`, {
      providedValue: value,
      min: options.min,
    });
  }

  if (options?.max !== undefined && value > options.max) {
    throw new ValidationError(`${name} must be <= ${options.max}`, {
      providedValue: value,
      max: options.max,
    });
  }
}

export function validateSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new ValidationError(`${name} must be safe integer`, {
      providedValue: value,
      max: Number.MAX_SAFE_INTEGER,
    });
  }
}

export function validatePercentage(value: number, name: string): void {
  validateFiniteNumber(value, name, { min: 0, max: 100 });
}

export function validateNormalized(value: number, name: string): void {
  validateFiniteNumber(value, name, { min: 0, max: 1 });
}

export function validateNonEmptyString(value: string, name: string): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} must be string`, {
      providedType: typeof value,
    });
  }
  if (value.trim() === '') {
    throw new ValidationError(`${name} cannot be empty`, {
      providedValue: value,
    });
  }
}

export function validateEnum<T extends string>(
  value: string,
  name: string,
  allowedValues: readonly T[]
): asserts value is T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`Invalid ${name}`, {
      providedValue: value,
      allowedValues: [...allowedValues],
    });
  }
}

export function validateNonEmptyArray<T>(
  value: unknown,
  name: string
): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${name} must be array`, {
      providedType: typeof value,
    });
  }
  if (value.length === 0) {
    throw new ValidationError(`${name} cannot be empty array`, {
      providedLength: 0,
    });
  }
}

/**
 * Validate that an object's JSON serialization does not exceed a character limit.
 *
 * Note: This measures characters (string length), not bytes. For UTF-8 encoding,
 * multi-byte characters will use more bytes than characters.
 *
 * @param value - The object to validate
 * @param name - Name of the field (for error messages)
 * @param maxChars - Maximum allowed characters in the JSON serialization
 */
export function validateObjectSize(
  value: object,
  name: string,
  maxChars: number
): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    // JSON.stringify throws TypeError on circular references and on BigInt values.
    // Surface these as ValidationErrors with a helpful message so callers get a
    // consistent error type rather than an unexpected TypeError.
    const reason = error instanceof Error ? error.message : String(error);
    throw new ValidationError(
      `${name} cannot be serialized for size validation: ${reason}`,
      {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        hint: 'The object may contain circular references or non-serializable values (e.g., BigInt)',
      }
    );
  }

  // ✅ MINOR-1: Clarified that this measures characters, not bytes
  const charCount = serialized.length;
  if (charCount > maxChars) {
    throw new ValidationError(`${name} exceeds character limit`, {
      providedChars: charCount,
      maxChars: maxChars,
    });
  }
}
