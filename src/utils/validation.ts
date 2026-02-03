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

export function validateObjectSize(
  value: object,
  name: string,
  maxBytes: number
): void {
  const size = JSON.stringify(value).length;
  if (size > maxBytes) {
    throw new ValidationError(`${name} exceeds size limit`, {
      providedSize: size,
      maxSize: maxBytes,
    });
  }
}
