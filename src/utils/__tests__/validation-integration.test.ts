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
} from '../index.js';
import { ValidationError } from '../../errors/index.js';

describe('Validation Integration Tests', () => {
  describe('Export verification', () => {
    it('should export all validation functions', () => {
      expect(validateFiniteNumber).toBeDefined();
      expect(validateSafeInteger).toBeDefined();
      expect(validatePercentage).toBeDefined();
      expect(validateNormalized).toBeDefined();
      expect(validateNonEmptyString).toBeDefined();
      expect(validateEnum).toBeDefined();
      expect(validateNonEmptyArray).toBeDefined();
      expect(validateObjectSize).toBeDefined();
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should validate API request parameters', () => {
      const validateApiRequest = (params: {
        temperature: number;
        maxTokens: number;
        model: string;
        messages: unknown[];
      }) => {
        validateNormalized(params.temperature, 'temperature');
        validateSafeInteger(params.maxTokens, 'maxTokens');
        validateNonEmptyString(params.model, 'model');
        validateNonEmptyArray(params.messages, 'messages');
      };

      expect(() =>
        validateApiRequest({
          temperature: 0.7,
          maxTokens: 1000,
          model: 'claude-3',
          messages: [{ role: 'user', content: 'hello' }],
        })
      ).not.toThrow();

      expect(() =>
        validateApiRequest({
          temperature: 1.5,
          maxTokens: 1000,
          model: 'claude-3',
          messages: [],
        })
      ).toThrow(ValidationError);
    });

    it('should validate configuration object', () => {
      const validateConfig = (config: {
        retryAttempts: number;
        timeoutMs: number;
        priority: string;
      }) => {
        validateSafeInteger(config.retryAttempts, 'retryAttempts');
        validateFiniteNumber(config.timeoutMs, 'timeoutMs', {
          min: 0,
          max: 60000,
        });
        validateEnum(config.priority, 'priority', [
          'low',
          'normal',
          'high',
        ] as const);
      };

      expect(() =>
        validateConfig({
          retryAttempts: 3,
          timeoutMs: 5000,
          priority: 'high',
        })
      ).not.toThrow();

      expect(() =>
        validateConfig({
          retryAttempts: 3,
          timeoutMs: 5000,
          priority: 'urgent',
        })
      ).toThrow(ValidationError);
    });

    it('should validate payload size', () => {
      const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

      const validatePayload = (data: object) => {
        validateObjectSize(data, 'payload', MAX_PAYLOAD_SIZE);
      };

      expect(() =>
        validatePayload({ small: 'data' })
      ).not.toThrow();

      expect(() =>
        validatePayload({ large: 'x'.repeat(2 * 1024 * 1024) })
      ).toThrow(ValidationError);
    });

    it('should validate percentage-based inputs', () => {
      const validateProgress = (progress: number) => {
        validatePercentage(progress, 'progress');
      };

      expect(() => validateProgress(0)).not.toThrow();
      expect(() => validateProgress(50)).not.toThrow();
      expect(() => validateProgress(100)).not.toThrow();
      expect(() => validateProgress(150)).toThrow(ValidationError);
    });

    it('should chain multiple validations', () => {
      const validateUserInput = (input: {
        name: string;
        age: number;
        confidence: number;
        preferences: string[];
      }) => {
        validateNonEmptyString(input.name, 'name');
        validateSafeInteger(input.age, 'age');
        validateFiniteNumber(input.age, 'age', { min: 0, max: 150 });
        validateNormalized(input.confidence, 'confidence');
        validateNonEmptyArray(input.preferences, 'preferences');
      };

      const validInput = {
        name: 'Alice',
        age: 30,
        confidence: 0.95,
        preferences: ['option1', 'option2'],
      };

      expect(() => validateUserInput(validInput)).not.toThrow();

      const invalidInputs = [
        { ...validInput, name: '' },
        { ...validInput, age: 200 },
        { ...validInput, confidence: 2.0 },
        { ...validInput, preferences: [] },
      ];

      invalidInputs.forEach((input) => {
        expect(() => validateUserInput(input)).toThrow(ValidationError);
      });
    });
  });

  describe('Error context preservation', () => {
    it('should preserve context through validation chain', () => {
      try {
        validateFiniteNumber(150, 'cpu_usage', { min: 0, max: 100 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.context?.providedValue).toBe(150);
        expect(validationError.context?.max).toBe(100);
        expect(validationError.message).toContain('cpu_usage');
      }
    });
  });
});
