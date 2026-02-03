import { describe, it, expect } from 'vitest';
import {
  validateFiniteNumber,
  validateSafeInteger,
  validatePercentage,
  validateNormalized,
  validateNonEmptyString,
  validateEnum,
  validateNonEmptyArray,
  validateObjectSize,
} from '../validation.js';
import { ValidationError } from '../../errors/index.js';

describe('validateFiniteNumber', () => {
  it('should accept finite numbers', () => {
    expect(() => validateFiniteNumber(0, 'value')).not.toThrow();
    expect(() => validateFiniteNumber(42, 'value')).not.toThrow();
    expect(() => validateFiniteNumber(-10.5, 'value')).not.toThrow();
    expect(() => validateFiniteNumber(Number.MAX_VALUE, 'value')).not.toThrow();
  });

  it('should reject non-finite numbers', () => {
    expect(() => validateFiniteNumber(Infinity, 'value')).toThrow(
      ValidationError
    );
    expect(() => validateFiniteNumber(-Infinity, 'value')).toThrow(
      ValidationError
    );
    expect(() => validateFiniteNumber(NaN, 'value')).toThrow(ValidationError);
  });

  it('should include field name in error message', () => {
    expect(() => validateFiniteNumber(NaN, 'temperature')).toThrow(
      /temperature must be finite number/
    );
  });

  it('should enforce minimum value', () => {
    expect(() =>
      validateFiniteNumber(5, 'value', { min: 10 })
    ).toThrow(/must be >= 10/);
    expect(() => validateFiniteNumber(10, 'value', { min: 10 })).not.toThrow();
    expect(() => validateFiniteNumber(15, 'value', { min: 10 })).not.toThrow();
  });

  it('should enforce maximum value', () => {
    expect(() =>
      validateFiniteNumber(15, 'value', { max: 10 })
    ).toThrow(/must be <= 10/);
    expect(() => validateFiniteNumber(10, 'value', { max: 10 })).not.toThrow();
    expect(() => validateFiniteNumber(5, 'value', { max: 10 })).not.toThrow();
  });

  it('should enforce both min and max', () => {
    const options = { min: 0, max: 100 };
    expect(() => validateFiniteNumber(-1, 'value', options)).toThrow();
    expect(() => validateFiniteNumber(0, 'value', options)).not.toThrow();
    expect(() => validateFiniteNumber(50, 'value', options)).not.toThrow();
    expect(() => validateFiniteNumber(100, 'value', options)).not.toThrow();
    expect(() => validateFiniteNumber(101, 'value', options)).toThrow();
  });
});

describe('validateSafeInteger', () => {
  it('should accept safe integers', () => {
    expect(() => validateSafeInteger(0, 'value')).not.toThrow();
    expect(() => validateSafeInteger(42, 'value')).not.toThrow();
    expect(() => validateSafeInteger(-100, 'value')).not.toThrow();
    expect(() =>
      validateSafeInteger(Number.MAX_SAFE_INTEGER, 'value')
    ).not.toThrow();
    expect(() =>
      validateSafeInteger(Number.MIN_SAFE_INTEGER, 'value')
    ).not.toThrow();
  });

  it('should reject non-safe integers', () => {
    expect(() =>
      validateSafeInteger(Number.MAX_SAFE_INTEGER + 1, 'value')
    ).toThrow(ValidationError);
    expect(() =>
      validateSafeInteger(Number.MIN_SAFE_INTEGER - 1, 'value')
    ).toThrow(ValidationError);
  });

  it('should reject decimals', () => {
    expect(() => validateSafeInteger(10.5, 'value')).toThrow(ValidationError);
    expect(() => validateSafeInteger(0.1, 'value')).toThrow(ValidationError);
  });

  it('should reject infinity and NaN', () => {
    expect(() => validateSafeInteger(Infinity, 'value')).toThrow(
      ValidationError
    );
    expect(() => validateSafeInteger(NaN, 'value')).toThrow(ValidationError);
  });
});

describe('validatePercentage', () => {
  it('should accept valid percentages', () => {
    expect(() => validatePercentage(0, 'value')).not.toThrow();
    expect(() => validatePercentage(50, 'value')).not.toThrow();
    expect(() => validatePercentage(100, 'value')).not.toThrow();
    expect(() => validatePercentage(0.5, 'value')).not.toThrow();
  });

  it('should reject values below 0', () => {
    expect(() => validatePercentage(-1, 'value')).toThrow(ValidationError);
    expect(() => validatePercentage(-0.1, 'value')).toThrow(ValidationError);
  });

  it('should reject values above 100', () => {
    expect(() => validatePercentage(101, 'value')).toThrow(ValidationError);
    expect(() => validatePercentage(100.1, 'value')).toThrow(ValidationError);
  });

  it('should reject non-finite values', () => {
    expect(() => validatePercentage(Infinity, 'value')).toThrow(
      ValidationError
    );
    expect(() => validatePercentage(NaN, 'value')).toThrow(ValidationError);
  });
});

describe('validateNormalized', () => {
  it('should accept values between 0 and 1', () => {
    expect(() => validateNormalized(0, 'value')).not.toThrow();
    expect(() => validateNormalized(0.5, 'value')).not.toThrow();
    expect(() => validateNormalized(1, 'value')).not.toThrow();
  });

  it('should reject values below 0', () => {
    expect(() => validateNormalized(-0.1, 'value')).toThrow(ValidationError);
    expect(() => validateNormalized(-1, 'value')).toThrow(ValidationError);
  });

  it('should reject values above 1', () => {
    expect(() => validateNormalized(1.1, 'value')).toThrow(ValidationError);
    expect(() => validateNormalized(2, 'value')).toThrow(ValidationError);
  });

  it('should reject non-finite values', () => {
    expect(() => validateNormalized(Infinity, 'value')).toThrow(
      ValidationError
    );
    expect(() => validateNormalized(NaN, 'value')).toThrow(ValidationError);
  });
});

describe('validateNonEmptyString', () => {
  it('should accept non-empty strings', () => {
    expect(() => validateNonEmptyString('hello', 'value')).not.toThrow();
    expect(() => validateNonEmptyString('a', 'value')).not.toThrow();
    expect(() => validateNonEmptyString('   x   ', 'value')).not.toThrow();
  });

  it('should reject empty strings', () => {
    expect(() => validateNonEmptyString('', 'value')).toThrow(ValidationError);
  });

  it('should reject whitespace-only strings', () => {
    expect(() => validateNonEmptyString('   ', 'value')).toThrow(
      ValidationError
    );
    expect(() => validateNonEmptyString('\t\n', 'value')).toThrow(
      ValidationError
    );
  });

  it('should reject non-string values', () => {
    expect(() => validateNonEmptyString(42 as any, 'value')).toThrow(
      ValidationError
    );
    expect(() => validateNonEmptyString(null as any, 'value')).toThrow(
      ValidationError
    );
    expect(() => validateNonEmptyString(undefined as any, 'value')).toThrow(
      ValidationError
    );
  });

  it('should include type information in error', () => {
    try {
      validateNonEmptyString(42 as any, 'name');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).context).toHaveProperty(
        'providedType',
        'number'
      );
    }
  });
});

describe('validateEnum', () => {
  const validColors = ['red', 'green', 'blue'] as const;

  it('should accept valid enum values', () => {
    expect(() => validateEnum('red', 'color', validColors)).not.toThrow();
    expect(() => validateEnum('green', 'color', validColors)).not.toThrow();
    expect(() => validateEnum('blue', 'color', validColors)).not.toThrow();
  });

  it('should reject invalid enum values', () => {
    expect(() => validateEnum('yellow', 'color', validColors)).toThrow(
      ValidationError
    );
    expect(() => validateEnum('', 'color', validColors)).toThrow(
      ValidationError
    );
  });

  it('should include allowed values in error', () => {
    try {
      validateEnum('yellow', 'color', validColors);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const context = (error as ValidationError).context;
      expect(context).toHaveProperty('providedValue', 'yellow');
      expect(context).toHaveProperty('allowedValues');
      expect(context!.allowedValues).toEqual(['red', 'green', 'blue']);
    }
  });

  it('should work with single-value enum', () => {
    const single = ['only'] as const;
    expect(() => validateEnum('only', 'value', single)).not.toThrow();
    expect(() => validateEnum('other', 'value', single)).toThrow(
      ValidationError
    );
  });
});

describe('validateNonEmptyArray', () => {
  it('should accept non-empty arrays', () => {
    expect(() => validateNonEmptyArray([1], 'value')).not.toThrow();
    expect(() => validateNonEmptyArray([1, 2, 3], 'value')).not.toThrow();
    expect(() => validateNonEmptyArray(['a'], 'value')).not.toThrow();
  });

  it('should reject empty arrays', () => {
    expect(() => validateNonEmptyArray([], 'value')).toThrow(ValidationError);
  });

  it('should reject non-arrays', () => {
    expect(() => validateNonEmptyArray('string', 'value')).toThrow(
      ValidationError
    );
    expect(() => validateNonEmptyArray(42, 'value')).toThrow(ValidationError);
    expect(() => validateNonEmptyArray({}, 'value')).toThrow(ValidationError);
    expect(() => validateNonEmptyArray(null, 'value')).toThrow(
      ValidationError
    );
  });

  it('should include type information in error', () => {
    try {
      validateNonEmptyArray('not-array', 'items');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).context).toHaveProperty(
        'providedType',
        'string'
      );
    }
  });

  it('should include length in empty array error', () => {
    try {
      validateNonEmptyArray([], 'items');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).context).toHaveProperty(
        'providedLength',
        0
      );
    }
  });
});

describe('validateObjectSize', () => {
  it('should accept objects within size limit', () => {
    expect(() => validateObjectSize({ a: 1 }, 'value', 100)).not.toThrow();
    expect(() =>
      validateObjectSize({ name: 'test' }, 'value', 100)
    ).not.toThrow();
  });

  it('should reject objects exceeding size limit', () => {
    const largeObject = { data: 'x'.repeat(1000) };
    expect(() => validateObjectSize(largeObject, 'value', 100)).toThrow(
      ValidationError
    );
  });

  it('should calculate size based on JSON string length', () => {
    const obj = { a: 1, b: 2 };
    const jsonSize = JSON.stringify(obj).length;

    expect(() =>
      validateObjectSize(obj, 'value', jsonSize)
    ).not.toThrow();
    expect(() =>
      validateObjectSize(obj, 'value', jsonSize - 1)
    ).toThrow(ValidationError);
  });

  it('should include size information in error', () => {
    const obj = { data: 'test' };
    const actualSize = JSON.stringify(obj).length;

    try {
      validateObjectSize(obj, 'payload', 5);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const context = (error as ValidationError).context;
      expect(context).toHaveProperty('providedSize', actualSize);
      expect(context).toHaveProperty('maxSize', 5);
    }
  });

  it('should handle nested objects', () => {
    const nested = { a: { b: { c: 'deep' } } };
    const jsonSize = JSON.stringify(nested).length;

    expect(() =>
      validateObjectSize(nested, 'value', jsonSize)
    ).not.toThrow();
    expect(() =>
      validateObjectSize(nested, 'value', jsonSize - 1)
    ).toThrow(ValidationError);
  });
});
