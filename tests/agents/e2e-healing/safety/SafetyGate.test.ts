import { describe, it, expect, beforeEach } from 'vitest';
import { SafetyGate } from '../../../../src/agents/e2e-healing/safety/SafetyGate.js';
import { CircuitBreaker } from '../../../../src/agents/e2e-healing/safety/CircuitBreaker.js';
import { ScopeLimiter } from '../../../../src/agents/e2e-healing/safety/ScopeLimiter.js';
import type { E2EHealingConfig, HealingConstraints } from '../../../../src/agents/e2e-healing/types.js';

describe('SafetyGate', () => {
  let safetyGate: SafetyGate;
  let circuitBreaker: CircuitBreaker;
  let scopeLimiter: ScopeLimiter;

  beforeEach(() => {
    const healingConfig: E2EHealingConfig = {
      maxAttempts: 3,
      cooldownPeriod: 1000,
      failureThreshold: 3,
      resetTimeout: 5000,
    };

    const constraints: HealingConstraints = {
      maxAttempts: 3,
      maxFilesModified: 3,
      maxLinesChanged: 100,
      allowedFilePatterns: ['**/*.css', '**/*.tsx'],
      forbiddenFilePatterns: ['**/api/**'],
      maxDirectoryDepth: 2,
    };

    circuitBreaker = new CircuitBreaker(healingConfig);
    scopeLimiter = new ScopeLimiter(constraints);
    safetyGate = new SafetyGate(circuitBreaker, scopeLimiter, healingConfig.maxAttempts);
  });

  describe('validate', () => {
    it('should allow safe fix to pass through', () => {
      const fix = {
        code: '.button { color: blue; }',
        targetFile: 'src/components/Button.css',
        tokensUsed: 50,
        cacheHit: false,
      };

      const result = safetyGate.validate('test-1', 'tests/e2e/button.test.ts', fix);

      expect(result.allowed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should block fix that exceeds scope limits', () => {
      const fix = {
        code: Array(150).fill('line').join('\n'), // 150 lines exceeds maxLinesChanged: 100
        targetFile: 'src/components/Button.tsx',
        tokensUsed: 200,
        cacheHit: false,
      };

      const result = safetyGate.validate('test-2', 'tests/e2e/button.test.ts', fix);

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('lines'))).toBe(true);
    });

    it('should block fix to forbidden files', () => {
      const fix = {
        code: 'export const apiKey = "secret";',
        targetFile: 'src/api/config.ts',
        tokensUsed: 30,
        cacheHit: false,
      };

      const result = safetyGate.validate('test-3', 'tests/e2e/api.test.ts', fix);

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('forbidden'))).toBe(true);
    });

    it('should block when circuit breaker is open', () => {
      // Trigger circuit breaker by recording 3 failures
      safetyGate.recordFailure('test-4');
      safetyGate.recordFailure('test-4');
      safetyGate.recordFailure('test-4');

      const fix = {
        code: '.button { color: red; }',
        targetFile: 'src/components/Button.css',
        tokensUsed: 50,
        cacheHit: false,
      };

      const result = safetyGate.validate('test-4', 'tests/e2e/button.test.ts', fix);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.includes('circuit breaker'))).toBe(true);
    });

    it('should block when max attempts exceeded', () => {
      const fix = {
        code: '.button { color: green; }',
        targetFile: 'src/components/Button.css',
        tokensUsed: 50,
        cacheHit: false,
      };

      // Validate 4 times (exceeds maxAttempts: 3)
      safetyGate.validate('test-5', 'tests/e2e/button.test.ts', fix);
      safetyGate.validate('test-5', 'tests/e2e/button.test.ts', fix);
      safetyGate.validate('test-5', 'tests/e2e/button.test.ts', fix);

      const result = safetyGate.validate('test-5', 'tests/e2e/button.test.ts', fix);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.includes('max attempts'))).toBe(true);
    });

    it('should allow fix to files matching allowed patterns', () => {
      const fix1 = {
        code: '.style { }',
        targetFile: 'src/deep/nested/Component.css',
        tokensUsed: 20,
        cacheHit: false,
      };

      const fix2 = {
        code: 'export const Component = () => null;',
        targetFile: 'src/components/Component.tsx',
        tokensUsed: 40,
        cacheHit: false,
      };

      const result1 = safetyGate.validate('test-6a', 'tests/e2e/test.ts', fix1);
      const result2 = safetyGate.validate('test-6b', 'tests/e2e/test.ts', fix2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should block fix to files not matching allowed patterns', () => {
      const fix = {
        code: 'export const util = () => {};',
        targetFile: 'src/utils/helper.js',
        tokensUsed: 30,
        cacheHit: false,
      };

      const result = safetyGate.validate('test-7', 'tests/e2e/test.ts', fix);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.includes('pattern'))).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should reset circuit breaker on success', () => {
      // Record failures first
      safetyGate.recordFailure('test-8');
      safetyGate.recordFailure('test-8');

      // Record success should reset
      safetyGate.recordSuccess('test-8');

      const fix = {
        code: '.button { }',
        targetFile: 'src/components/Button.css',
        tokensUsed: 20,
        cacheHit: false,
      };

      const result = safetyGate.validate('test-8', 'tests/e2e/test.ts', fix);

      expect(result.allowed).toBe(true);
    });
  });

  describe('recordFailure', () => {
    it('should open circuit breaker after threshold failures', () => {
      const fix = {
        code: '.button { }',
        targetFile: 'src/components/Button.css',
        tokensUsed: 20,
        cacheHit: false,
      };

      // Validate should pass initially
      const result1 = safetyGate.validate('test-9', 'tests/e2e/test.ts', fix);
      expect(result1.allowed).toBe(true);

      // Record 3 failures (threshold)
      safetyGate.recordFailure('test-9');
      safetyGate.recordFailure('test-9');
      safetyGate.recordFailure('test-9');

      // Validate should now fail due to circuit breaker
      const result2 = safetyGate.validate('test-9', 'tests/e2e/test.ts', fix);
      expect(result2.allowed).toBe(false);
      expect(result2.violations.some(v => v.includes('circuit breaker'))).toBe(true);
    });
  });
});
