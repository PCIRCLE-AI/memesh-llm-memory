import { ValidationError } from '../errors/index.js';
export function validateFiniteNumber(value, name, options) {
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
export function validateSafeInteger(value, name) {
    if (!Number.isSafeInteger(value)) {
        throw new ValidationError(`${name} must be safe integer`, {
            providedValue: value,
            max: Number.MAX_SAFE_INTEGER,
        });
    }
}
export function validatePercentage(value, name) {
    validateFiniteNumber(value, name, { min: 0, max: 100 });
}
export function validateNormalized(value, name) {
    validateFiniteNumber(value, name, { min: 0, max: 1 });
}
export function validateNonEmptyString(value, name) {
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
export function validateEnum(value, name, allowedValues) {
    if (!allowedValues.includes(value)) {
        throw new ValidationError(`Invalid ${name}`, {
            providedValue: value,
            allowedValues: [...allowedValues],
        });
    }
}
export function validateNonEmptyArray(value, name) {
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
export function validateObjectSize(value, name, maxChars) {
    let serialized;
    try {
        serialized = JSON.stringify(value);
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new ValidationError(`${name} cannot be serialized for size validation: ${reason}`, {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            hint: 'The object may contain circular references or non-serializable values (e.g., BigInt)',
        });
    }
    const charCount = serialized.length;
    if (charCount > maxChars) {
        throw new ValidationError(`${name} exceeds character limit`, {
            providedChars: charCount,
            maxChars: maxChars,
        });
    }
}
//# sourceMappingURL=validation.js.map