/**
 * ConnectionPool Health Check Tests
 *
 * Tests for BUG-5: Health check timer duplication and error handling
 * Verifies that health check timer is properly managed
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionPool } from '../ConnectionPool.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('ConnectionPool - BUG-5: Health Check Tests', () => {
  let pool: ConnectionPool;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ccb-pool-health-'));
    // ✅ FIX: Correct constructor signature (dbPath, options)
    pool = new ConnectionPool(
      join(tempDir, 'test.db'),  // dbPath as first argument
      {
        maxConnections: 3,
        healthCheckInterval: 1000, // 1 second for testing
      }
    );
  });

  afterEach(async () => {
    await pool.shutdown();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('BUG-5: should not create duplicate health check timers', async () => {
    vi.useFakeTimers();

    // Health check starts automatically on pool creation
    // Simulate multiple startHealthCheck calls (shouldn't happen in normal code, but testing the fix)
    const privatePool = pool as any;

    let healthCheckCount = 0;
    const originalHealthCheck = privatePool.performHealthCheck.bind(pool);
    privatePool.performHealthCheck = async () => {
      healthCheckCount++;
      await originalHealthCheck();
    };

    // Call startHealthCheck multiple times (simulating potential bug)
    privatePool.startHealthCheck();
    privatePool.startHealthCheck();
    privatePool.startHealthCheck();

    // Advance time
    await vi.advanceTimersByTimeAsync(3000); // 3 intervals

    // Should have ~3 health checks, not 9 (3 timers * 3 intervals)
    // With fix: old timers are cleared before creating new ones
    expect(healthCheckCount).toBeLessThan(6); // Allow some variance
    expect(healthCheckCount).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('BUG-5: should handle health check errors without stopping timer', async () => {
    vi.useFakeTimers();

    const privatePool = pool as any;
    let checkCount = 0;

    privatePool.performHealthCheck = async () => {
      checkCount++;
      throw new Error('Health check error');
    };

    privatePool.startHealthCheck();

    // Advance time to trigger multiple checks
    await vi.advanceTimersByTimeAsync(5000); // 5 intervals

    // All checks should be attempted despite errors
    expect(checkCount).toBeGreaterThanOrEqual(5);

    vi.useRealTimers();
  });

  it('BUG-5: pool should remain functional after health check error', async () => {
    vi.useFakeTimers();

    const privatePool = pool as any;
    privatePool.performHealthCheck = async () => {
      throw new Error('Health check fails');
    };

    // Trigger health check
    await vi.advanceTimersByTimeAsync(2000);

    // Pool operations should still work
    const db1 = await pool.acquire();
    expect(db1).toBeDefined();

    pool.release(db1);

    const db2 = await pool.acquire();
    expect(db2).toBeDefined();
    pool.release(db2);

    vi.useRealTimers();
  });

  it('BUG-5 Before Fix: would create duplicate timers (simulation)', async () => {
    vi.useFakeTimers();

    const privatePool = pool as any;
    let checkCount = 0;

    privatePool.performHealthCheck = async () => {
      checkCount++;
    };

    // Before fix: calling startHealthCheck twice would create two timers
    // After fix: old timer is cleared before creating new one

    privatePool.startHealthCheck();
    await vi.advanceTimersByTimeAsync(1000);
    const count1 = checkCount;

    privatePool.startHealthCheck(); // ✅ This now clears the old timer
    await vi.advanceTimersByTimeAsync(1000);
    const count2 = checkCount;

    // With fix: only one timer is running (count increments by 1)
    expect(count2 - count1).toBe(1);

    // ❌ Before fix: two timers running (count would increment by 2)

    vi.useRealTimers();
  });

  it('BUG-5: shutdown should cleanup health check timer', async () => {
    vi.useFakeTimers();

    const privatePool = pool as any;
    let checkCount = 0;

    privatePool.performHealthCheck = async () => {
      checkCount++;
    };

    await vi.advanceTimersByTimeAsync(2000);
    const countBeforeShutdown = checkCount;

    await pool.shutdown();

    // Advance time after shutdown
    await vi.advanceTimersByTimeAsync(5000);

    // No additional checks after shutdown
    expect(checkCount).toBe(countBeforeShutdown);

    vi.useRealTimers();
  });
});
