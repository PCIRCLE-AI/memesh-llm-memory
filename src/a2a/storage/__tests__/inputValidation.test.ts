/**
 * ✅ SECURITY FIX (HIGH-3): Input Validation Tests
 *
 * Tests for input validation helpers to ensure:
 * 1. Array size limits prevent DoS attacks
 * 2. Enum validation prevents SQL injection
 * 3. Numeric validation prevents overflow/underflow
 */

import { describe, it, expect } from 'vitest';
import {
  validateArraySize,
  validateTaskStates,
  validateTaskPriorities,
  validatePositiveInteger,
} from '../inputValidation.js';
import { ValidationError } from '../../../errors/index.js';

describe('Input Validation (HIGH-3)', () => {
  describe('validateArraySize', () => {
    it('should accept arrays within size limit', () => {
      const array = Array.from({ length: 50 }, (_, i) => i);
      expect(() => validateArraySize(array, 'test')).not.toThrow();
    });

    it('should accept arrays at exactly the limit', () => {
      const array = Array.from({ length: 100 }, (_, i) => i);
      expect(() => validateArraySize(array, 'test')).not.toThrow();
    });

    it('should reject arrays exceeding size limit (DoS prevention)', () => {
      const array = Array.from({ length: 101 }, (_, i) => i);

      expect(() => validateArraySize(array, 'test')).toThrow(ValidationError);

      try {
        validateArraySize(array, 'test');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details).toMatchObject({
          field: 'test',
          providedCount: 101,
          maxAllowed: 100,
          severity: 'HIGH',
        });
      }
    });

    it('should reject extremely large arrays (1000+ items)', () => {
      const array = Array.from({ length: 1000 }, (_, i) => i);

      expect(() => validateArraySize(array, 'large-array')).toThrow(ValidationError);
    });

    it('should accept custom size limit', () => {
      const array = Array.from({ length: 50 }, (_, i) => i);

      expect(() => validateArraySize(array, 'test', 50)).not.toThrow();
      expect(() => validateArraySize(array, 'test', 49)).toThrow(ValidationError);
    });
  });

  describe('validateTaskStates', () => {
    it('should accept all valid task states', () => {
      const validStates = [
        'SUBMITTED',
        'WORKING',
        'INPUT_REQUIRED',
        'COMPLETED',
        'FAILED',
        'CANCELED',
        'REJECTED',
        'TIMEOUT',
      ];

      expect(() => validateTaskStates(validStates)).not.toThrow();
    });

    it('should accept subset of valid states', () => {
      const states = ['SUBMITTED', 'COMPLETED', 'FAILED'];

      expect(() => validateTaskStates(states)).not.toThrow();
    });

    it('should reject invalid state (SQL injection prevention)', () => {
      const states = ['SUBMITTED', 'INVALID_STATE'];

      expect(() => validateTaskStates(states)).toThrow(ValidationError);

      try {
        validateTaskStates(states);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details).toMatchObject({
          field: 'state',
          providedState: 'INVALID_STATE',
          severity: 'HIGH',
        });
      }
    });

    it('should reject SQL injection attempt via state', () => {
      const maliciousStates = ["SUBMITTED' OR '1'='1"];

      expect(() => validateTaskStates(maliciousStates)).toThrow(ValidationError);
    });

    it('should reject state with SQL comment injection', () => {
      const maliciousStates = ['SUBMITTED --'];

      expect(() => validateTaskStates(maliciousStates)).toThrow(ValidationError);
    });

    it('should reject state with UNION attack', () => {
      const maliciousStates = ["SUBMITTED' UNION SELECT * FROM tasks --"];

      expect(() => validateTaskStates(maliciousStates)).toThrow(ValidationError);
    });
  });

  describe('validateTaskPriorities', () => {
    it('should accept all valid priorities', () => {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];

      expect(() => validateTaskPriorities(validPriorities)).not.toThrow();
    });

    it('should accept subset of valid priorities', () => {
      const priorities = ['normal', 'high'];

      expect(() => validateTaskPriorities(priorities)).not.toThrow();
    });

    it('should reject invalid priority', () => {
      const priorities = ['normal', 'invalid'];

      expect(() => validateTaskPriorities(priorities)).toThrow(ValidationError);

      try {
        validateTaskPriorities(priorities);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details).toMatchObject({
          field: 'priority',
          providedPriority: 'invalid',
          severity: 'HIGH',
        });
      }
    });

    it('should reject SQL injection attempt via priority', () => {
      const maliciousPriorities = ["high' OR '1'='1"];

      expect(() => validateTaskPriorities(maliciousPriorities)).toThrow(ValidationError);
    });
  });

  describe('validatePositiveInteger', () => {
    it('should accept positive integers', () => {
      expect(() => validatePositiveInteger(0, 'test')).not.toThrow();
      expect(() => validatePositiveInteger(1, 'test')).not.toThrow();
      expect(() => validatePositiveInteger(100, 'test')).not.toThrow();
      expect(() => validatePositiveInteger(10000, 'test')).not.toThrow();
    });

    it('should reject negative integers', () => {
      expect(() => validatePositiveInteger(-1, 'test')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(-100, 'test')).toThrow(ValidationError);
    });

    it('should reject non-integers', () => {
      expect(() => validatePositiveInteger(1.5, 'test')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(NaN, 'test')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(Infinity, 'test')).toThrow(ValidationError);
    });

    it('should reject values exceeding max', () => {
      expect(() => validatePositiveInteger(101, 'test', 100)).toThrow(ValidationError);
      expect(() => validatePositiveInteger(1000, 'test', 100)).toThrow(ValidationError);
    });

    it('should accept values at exactly max', () => {
      expect(() => validatePositiveInteger(100, 'test', 100)).not.toThrow();
    });

    it('should provide detailed error information', () => {
      try {
        validatePositiveInteger(-5, 'limit');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details).toMatchObject({
          field: 'limit',
          providedValue: -5,
          severity: 'MEDIUM',
        });
      }
    });
  });

  describe('ValidationError', () => {
    it('should create error with message and details', () => {
      const error = new ValidationError('Test error', { field: 'test', value: 123 });

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_FAILED'); // Central ValidationError uses VALIDATION_FAILED
      expect(error.details).toEqual({ field: 'test', value: 123 });
    });

    it('should serialize to JSON correctly', () => {
      const error = new ValidationError('Test error', { field: 'test' });
      const json = error.toJSON();

      // Central ValidationError serializes context, not details, and includes timestamp + stack
      expect(json.name).toBe('ValidationError');
      expect(json.code).toBe('VALIDATION_FAILED');
      expect(json.message).toBe('Test error');
      expect(json.context).toEqual({ field: 'test' });
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('should be instanceof Error', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });
});
