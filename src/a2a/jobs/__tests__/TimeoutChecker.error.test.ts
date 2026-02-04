/**
 * Test 2: Async Interval Error Handling (MINOR-B)
 *
 * Verifies that the TimeoutChecker properly handles errors in the async interval.
 *
 * Test coverage:
 * - Errors in checkWithCircuitBreaker are caught
 * - Errors are logged properly
 * - Interval continues after error
 * - Circuit breaker state is preserved
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeoutChecker } from '../TimeoutChecker.js';
import type { MCPTaskDelegator } from '../../delegator/MCPTaskDelegator.js';

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from '../../../utils/logger.js';

describe('TimeoutChecker Async Interval Error Handling (MINOR-B)', () => {
  let mockDelegator: MCPTaskDelegator;
  let checker: TimeoutChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock delegator
    mockDelegator = {
      checkTimeouts: vi.fn().mockResolvedValue(undefined),
    } as unknown as MCPTaskDelegator;
  });

  afterEach(() => {
    if (checker && checker.isRunning()) {
      checker.stop();
    }
    vi.useRealTimers();
  });

  describe('Errors in checkWithCircuitBreaker are caught', () => {
    it('should catch synchronous errors in checkTimeouts', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Sync error in checkTimeouts')
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 1000,
        maxConsecutiveErrors: 5,
      });

      checker.start(1000);

      // Advance past first interval
      await vi.advanceTimersByTimeAsync(1100);

      // Error should have been caught and logged
      expect(logger.error).toHaveBeenCalled();

      // Checker should still be running
      expect(checker.isRunning()).toBe(true);

      // Statistics should reflect the error
      const stats = checker.getStatistics();
      expect(stats.totalErrors).toBe(1);
      expect(stats.consecutiveErrors).toBe(1);
    });

    it('should catch async errors that escape try-catch', async () => {
      // Simulate an error that might escape internal try-catch
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return Promise.reject(new Error('Unhandled async error'));
      });

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5,
      });

      checker.start(500);

      // Advance past first interval
      await vi.advanceTimersByTimeAsync(600);

      // Error should be caught by the .catch() handler
      expect(logger.error).toHaveBeenCalled();
      expect(checker.isRunning()).toBe(true);
    });

    it('should handle errors with stack traces', async () => {
      const errorWithStack = new Error('Error with stack');
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(errorWithStack);

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 1000,
        maxConsecutiveErrors: 5,
      });

      checker.start(1000);
      await vi.advanceTimersByTimeAsync(1100);

      // Should log error with stack
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          error: 'Error with stack',
          stack: expect.any(String),
        })
      );
    });
  });

  describe('Errors are logged properly', () => {
    it('should log error message correctly', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Test error message')
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 1000,
        maxConsecutiveErrors: 5,
      });

      checker.start(1000);
      await vi.advanceTimersByTimeAsync(1100);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('TimeoutChecker'),
        expect.objectContaining({
          error: 'Test error message',
        })
      );
    });

    it('should log consecutive error count', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Repeated error')
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5,
      });

      checker.start(500);

      // Trigger multiple errors
      for (let i = 1; i <= 3; i++) {
        await vi.advanceTimersByTimeAsync(600);

        expect(logger.error).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            consecutiveErrors: i,
          })
        );
      }
    });

    it('should log circuit state in error', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Error with state')
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5,
      });

      checker.start(500);
      await vi.advanceTimersByTimeAsync(600);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          circuitState: expect.any(String),
        })
      );
    });

    it('should handle non-Error objects', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        'string error'
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 1000,
        maxConsecutiveErrors: 5,
      });

      checker.start(1000);
      await vi.advanceTimersByTimeAsync(1100);

      // Should handle string errors
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Interval continues after error', () => {
    it('should continue running after single error', async () => {
      let callCount = 0;
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First call fails'));
        }
        return Promise.resolve();
      });

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5,
      });

      checker.start(500);

      // First interval - error
      await vi.advanceTimersByTimeAsync(600);
      expect(callCount).toBe(1);
      expect(checker.isRunning()).toBe(true);

      // Second interval - success
      await vi.advanceTimersByTimeAsync(600);
      expect(callCount).toBe(2);
      expect(checker.isRunning()).toBe(true);
    });

    it('should continue running after multiple errors', async () => {
      let errorCount = 0;
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockImplementation(() => {
        errorCount++;
        // Fail first 3 attempts, then succeed
        if (errorCount <= 3) {
          return Promise.reject(new Error(`Error ${errorCount}`));
        }
        return Promise.resolve();
      });

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5, // More than our 3 errors
      });

      checker.start(500);

      // Run through 4 intervals
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(600);
      }

      expect(errorCount).toBe(4);
      expect(checker.isRunning()).toBe(true);

      // After success, consecutive errors should reset
      const stats = checker.getStatistics();
      expect(stats.consecutiveErrors).toBe(0);
    });

    it('should maintain interval timing after errors', async () => {
      const callTimes: number[] = [];
      let startTime = 0;

      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callTimes.push(Date.now() - startTime);
        return Promise.reject(new Error('Always fails'));
      });

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 1000,
        maxConsecutiveErrors: 10,
      });

      startTime = Date.now();
      checker.start(1000);

      // Run through 3 intervals
      await vi.advanceTimersByTimeAsync(1100);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(callTimes.length).toBe(3);
      // Intervals should be approximately 1000ms apart
      expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(900);
      expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(900);
    });
  });

  describe('Circuit breaker state is preserved', () => {
    it('should track consecutive errors correctly', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Consistent error')
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5,
      });

      checker.start(500);

      // Run 3 intervals with errors
      for (let i = 1; i <= 3; i++) {
        await vi.advanceTimersByTimeAsync(600);
        const stats = checker.getStatistics();
        expect(stats.consecutiveErrors).toBe(i);
      }
    });

    it('should open circuit after maxConsecutiveErrors', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Repeated failure')
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 3,
        circuitCooldownMs: 60000,
      });

      checker.start(500);

      // Run 3 intervals to hit max errors
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(600);
      }

      const stats = checker.getStatistics();
      expect(stats.circuitState).toBe('OPEN');
    });

    it('should preserve circuit state across async error handler', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return Promise.reject(new Error('Async error'));
      });

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 2,
      });

      checker.start(500);

      // First error
      await vi.advanceTimersByTimeAsync(600);
      let stats = checker.getStatistics();
      expect(stats.circuitState).toBe('CLOSED');
      expect(stats.consecutiveErrors).toBe(1);

      // Second error - should open circuit
      await vi.advanceTimersByTimeAsync(600);
      stats = checker.getStatistics();
      expect(stats.circuitState).toBe('OPEN');
    });

    it('should reset consecutive errors on success', async () => {
      let shouldFail = true;

      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockImplementation(() => {
        if (shouldFail) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve();
      });

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5,
      });

      checker.start(500);

      // Run 2 intervals with errors
      await vi.advanceTimersByTimeAsync(600);
      await vi.advanceTimersByTimeAsync(600);

      let stats = checker.getStatistics();
      expect(stats.consecutiveErrors).toBe(2);

      // Now succeed
      shouldFail = false;
      await vi.advanceTimersByTimeAsync(600);

      stats = checker.getStatistics();
      expect(stats.consecutiveErrors).toBe(0);
    });

    it('should maintain total error count across resets', async () => {
      let failCount = 0;

      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockImplementation(() => {
        failCount++;
        // Alternate between fail and success
        if (failCount % 2 === 1) {
          return Promise.reject(new Error('Alternating error'));
        }
        return Promise.resolve();
      });

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 500,
        maxConsecutiveErrors: 5,
      });

      checker.start(500);

      // Run 4 intervals (2 errors, 2 successes)
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(600);
      }

      const stats = checker.getStatistics();
      expect(stats.totalErrors).toBe(2);
      expect(stats.consecutiveErrors).toBe(0); // Reset after success
      expect(stats.totalChecks).toBe(4);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid consecutive errors', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Rapid error')
      );

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 100,
        maxConsecutiveErrors: 5,
      });

      checker.start(100);

      // Run 5 rapid intervals
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(110);
      }

      const stats = checker.getStatistics();
      expect(stats.circuitState).toBe('OPEN');
      expect(stats.totalErrors).toBe(5);
    });

    it('should handle undefined error objects', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(undefined);

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 1000,
        maxConsecutiveErrors: 5,
      });

      checker.start(1000);
      await vi.advanceTimersByTimeAsync(1100);

      // Should not crash
      expect(checker.isRunning()).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle null error objects', async () => {
      (mockDelegator.checkTimeouts as ReturnType<typeof vi.fn>).mockRejectedValue(null);

      checker = new TimeoutChecker(mockDelegator, {
        intervalMs: 1000,
        maxConsecutiveErrors: 5,
      });

      checker.start(1000);
      await vi.advanceTimersByTimeAsync(1100);

      // Should not crash
      expect(checker.isRunning()).toBe(true);
    });
  });
});
