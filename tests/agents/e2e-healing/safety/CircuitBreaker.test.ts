import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../../../../src/agents/e2e-healing/safety/CircuitBreaker.js';
import { DEFAULT_CONFIG } from '../../../../src/agents/e2e-healing/config.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  const testId = 'test-123';

  beforeEach(() => {
    breaker = new CircuitBreaker(DEFAULT_CONFIG);
  });

  it('should allow first repair attempt', () => {
    const canAttempt = breaker.canAttemptRepair(testId);
    expect(canAttempt).toBe(true);
  });

  it('should block after max attempts reached', () => {
    // Record 3 failed attempts
    breaker.recordAttempt(testId, false);
    breaker.recordAttempt(testId, false);
    breaker.recordAttempt(testId, false);

    const canAttempt = breaker.canAttemptRepair(testId);
    expect(canAttempt).toBe(false);
  });

  it('should block during cooldown period', () => {
    // Record a failed attempt
    breaker.recordAttempt(testId, false);

    // Should not be in cooldown yet (only 1 attempt)
    expect(breaker.canAttemptRepair(testId)).toBe(true);

    // Record 2 more failed attempts to trigger cooldown
    breaker.recordAttempt(testId, false);
    breaker.recordAttempt(testId, false);

    // Now should be blocked due to cooldown
    expect(breaker.canAttemptRepair(testId)).toBe(false);
  });

  it('should block after consecutive failure threshold', () => {
    // Record 3 consecutive failures
    breaker.recordAttempt(testId, false);
    breaker.recordAttempt(testId, false);
    breaker.recordAttempt(testId, false);

    const canAttempt = breaker.canAttemptRepair(testId);
    expect(canAttempt).toBe(false);
  });

  it('should reset attempt counter on success', () => {
    breaker.recordAttempt(testId, true);
    const history = breaker.getHistory(testId);

    expect(history).toBeDefined();
    expect(history.totalAttempts).toBe(0); // Reset to allow re-healing if test fails again
    expect(history.consecutiveFailures).toBe(0);
  });

  it('should reset consecutive failures on success', () => {
    // Record 2 failures then 1 success
    breaker.recordAttempt(testId, false);
    breaker.recordAttempt(testId, false);
    breaker.recordAttempt(testId, true);

    const history = breaker.getHistory(testId);
    expect(history.consecutiveFailures).toBe(0);
  });
});
