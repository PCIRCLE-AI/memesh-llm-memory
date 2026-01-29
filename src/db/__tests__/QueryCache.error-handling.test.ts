/**
 * QueryCache Error Handling Tests
 *
 * Tests for BUG-4: Cleanup interval error handling
 * Verifies that cleanup errors don't stop the interval
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryCache } from '../QueryCache.js';

describe('QueryCache - BUG-4: Error Handling Tests', () => {
  let cache: QueryCache<string, any>;

  beforeEach(() => {
    // ✅ FIX: Enable fake timers BEFORE creating cache so interval is tracked
    vi.useFakeTimers();

    cache = new QueryCache<string, any>({
      maxSize: 10,
      defaultTTL: 1000,
    });
  });

  afterEach(() => {
    cache.dispose();
    // ✅ FIX: Restore real timers after each test
    vi.useRealTimers();
  });

  it('BUG-4: should handle cleanup errors without stopping interval', async () => {
    // Add items to cache
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    // Mock cleanup to throw error on first call
    let cleanupCount = 0;
    const originalCleanup = cache.cleanup.bind(cache);
    cache.cleanup = () => {
      cleanupCount++;
      if (cleanupCount === 1) {
        throw new Error('Cleanup error');
      }
      originalCleanup();
    };

    // Advance time to trigger multiple cleanups
    await vi.advanceTimersByTimeAsync(61000); // First cleanup (will throw)
    await vi.advanceTimersByTimeAsync(60000); // Second cleanup (should work)

    // Cleanup should have been called at least twice despite error
    expect(cleanupCount).toBeGreaterThanOrEqual(2);
  });

  it('BUG-4: cache should remain functional after cleanup error', async () => {
    // Mock cleanup to always throw
    cache.cleanup = () => {
      throw new Error('Persistent cleanup error');
    };

    // Advance time to trigger cleanup
    await vi.advanceTimersByTimeAsync(61000);

    // Cache operations should still work
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    cache.set('key2', 'value2');
    expect(cache.get('key2')).toBe('value2');
  });

  it('BUG-4: multiple cleanup errors should not accumulate', async () => {
    let errorCount = 0;
    cache.cleanup = () => {
      errorCount++;
      throw new Error(`Error ${errorCount}`);
    };

    // Trigger multiple cleanups
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(60000);
    }

    // All cleanups should have been attempted despite errors
    expect(errorCount).toBe(5);
  });

  it('BUG-4 Before Fix: cleanup error would stop interval (simulation)', async () => {
    // Before fix: If cleanup throws, setInterval stops running
    // After fix: Cleanup continues even after errors

    let cleanupAttempts = 0;
    cache.cleanup = () => {
      cleanupAttempts++;
      if (cleanupAttempts === 1) {
        throw new Error('First cleanup fails');
      }
      // Subsequent cleanups succeed
    };

    // First cleanup
    await vi.advanceTimersByTimeAsync(61000);
    expect(cleanupAttempts).toBe(1);

    // ✅ After fix: Second cleanup should still run
    await vi.advanceTimersByTimeAsync(60000);
    expect(cleanupAttempts).toBe(2);

    // ❌ Before fix: cleanupAttempts would still be 1 (interval stopped)
  });

  it('BUG-4: dispose should work even if cleanup is failing', () => {
    cache.cleanup = () => {
      throw new Error('Cleanup always fails');
    };

    // Dispose should not throw
    expect(() => cache.dispose()).not.toThrow();
  });
});
