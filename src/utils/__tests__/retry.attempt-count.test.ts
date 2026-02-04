/**
 * Retry Attempt Count Tests
 *
 * Tests for BUG-8: Incorrect attempt count in retryWithBackoffDetailed
 * Verifies that actual retry attempts are tracked correctly
 */

import { describe, it, expect } from 'vitest';
import { retryWithBackoffDetailed } from '../retry.js';

describe('Retry - BUG-8: Attempt Count Tests', () => {
  it('BUG-8: should track correct attempt count on first success', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      return { success: true };
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 3,
      baseDelay: 10,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1); // ✅ Fixed: should be 1, not hardcoded
    expect(callCount).toBe(1);
  });

  it('BUG-8: should track correct attempt count after retries', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      if (callCount < 3) {
        const error: any = new Error('Retry me');
        error.code = 'ECONNRESET'; // Make it retryable
        error.syscall = 'connect'; // ✅ FIX HIGH-9: Real Node.js errors have syscall
        throw error;
      }
      return { success: true };
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 5,
      baseDelay: 10,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3); // ✅ Fixed: should be 3 (actual attempts)
    expect(callCount).toBe(3);
  });

  it('BUG-8: should track correct attempt count on failure', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      const error: any = new Error('Always fail');
      error.code = 'ECONNRESET'; // Make it retryable
      error.syscall = 'connect'; // ✅ FIX HIGH-9: Real Node.js errors have syscall
      throw error;
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 2,
      baseDelay: 10,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3); // ✅ Fixed: 1 initial + 2 retries = 3 attempts
    expect(callCount).toBe(3);
  });

  it('BUG-8 Before Fix: would always report 1 attempt on success (simulation)', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      if (callCount < 3) {
        const error: any = new Error('Retry');
        error.code = 'ETIMEDOUT';
        error.syscall = 'read'; // ✅ FIX HIGH-9: Real Node.js errors have syscall
        throw error;
      }
      return { data: 'success' };
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 5,
      baseDelay: 10,
    });

    // ✅ After fix: reports actual attempts (3)
    expect(result.attempts).toBe(3);

    // ❌ Before fix: would always be 1 (hardcoded)
    // expect(result.attempts).toBe(1); // WRONG!
  });

  it('BUG-8: should track attempts for immediate non-retryable error', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      throw new Error('Non-retryable error');
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 3,
      baseDelay: 10,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1); // Only one attempt (error not retryable)
    expect(callCount).toBe(1);
  });

  it('BUG-8: should track attempts with custom retry logic', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      if (callCount < 4) {
        throw new Error(`Custom error ${callCount}`);
      }
      return { result: 'success' };
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 5,
      baseDelay: 10,
      isRetryable: (error) => {
        // Custom retry logic: only retry errors with numbers <= 3
        const match = (error as Error).message.match(/(\d+)/);
        return match ? parseInt(match[1]) <= 3 : false;
      },
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(4); // ✅ Correct count
    expect(callCount).toBe(4);
  });

  it('BUG-8: attempt count should match total delay expectations', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      if (callCount < 3) {
        const error: any = new Error('Retry');
        error.code = 'ECONNRESET';
        error.syscall = 'connect'; // ✅ FIX HIGH-9: Real Node.js errors have syscall
        throw error;
      }
      return 'success';
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 3,
      baseDelay: 100,
      enableJitter: false, // Disable jitter for predictable delays
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);

    // Total delay should be roughly: 100ms (1st retry) + 200ms (2nd retry) = ~300ms
    // (No delay before first attempt)
    expect(result.totalDelay).toBeGreaterThan(250);
    expect(result.totalDelay).toBeLessThan(500);
  });

  it('BUG-8: should handle zero retries configuration', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      if (callCount === 1) {
        const error: any = new Error('First attempt fails');
        error.code = 'ETIMEDOUT';
        error.syscall = 'read'; // ✅ FIX HIGH-9: Real Node.js errors have syscall
        throw error;
      }
      return 'success';
    };

    const result = await retryWithBackoffDetailed(operation, {
      maxRetries: 0, // No retries
      baseDelay: 10,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1); // Only initial attempt
    expect(callCount).toBe(1);
  });

  it('BUG-8: concurrent operations should track independently', async () => {
    const createOperation = (failCount: number) => {
      let callCount = 0;
      return async () => {
        callCount++;
        if (callCount <= failCount) {
          const error: any = new Error('Retry');
          error.code = 'ECONNRESET';
          error.syscall = 'connect'; // ✅ FIX HIGH-9: Real Node.js errors have syscall
          throw error;
        }
        return { callCount };
      };
    };

    const [result1, result2, result3] = await Promise.all([
      retryWithBackoffDetailed(createOperation(1), { maxRetries: 3, baseDelay: 10 }),
      retryWithBackoffDetailed(createOperation(2), { maxRetries: 3, baseDelay: 10 }),
      retryWithBackoffDetailed(createOperation(0), { maxRetries: 3, baseDelay: 10 }),
    ]);

    expect(result1.attempts).toBe(2); // Fail once, succeed on 2nd
    expect(result2.attempts).toBe(3); // Fail twice, succeed on 3rd
    expect(result3.attempts).toBe(1); // Succeed immediately
  });
});
