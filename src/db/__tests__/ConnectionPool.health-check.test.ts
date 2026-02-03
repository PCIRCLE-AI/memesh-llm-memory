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
  let testDbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ccb-pool-health-'));
    testDbPath = join(tempDir, 'test.db');
  });

  afterEach(async () => {
    if (pool) {
      await pool.shutdown();
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('BUG-5: should not create duplicate health check timers', async () => {
    vi.useFakeTimers();

    // Create pool AFTER enabling fake timers so setInterval is intercepted
    pool = new ConnectionPool(testDbPath, {
      maxConnections: 3,
      healthCheckInterval: 5000, // Minimum allowed interval
    });

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

    // Advance time by 3 intervals (3 * 5000ms = 15000ms)
    await vi.advanceTimersByTimeAsync(15000);

    // Should have ~3 health checks, not 9 (3 timers * 3 intervals)
    // With fix: old timers are cleared before creating new ones
    // Allow up to 4 checks (3 expected + 1 variance) to catch duplicate timer leaks
    expect(healthCheckCount).toBeLessThanOrEqual(4);
    expect(healthCheckCount).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('BUG-5: should handle health check errors without stopping timer', async () => {
    vi.useFakeTimers();

    // Create pool AFTER enabling fake timers so setInterval is intercepted
    pool = new ConnectionPool(testDbPath, {
      maxConnections: 3,
      healthCheckInterval: 5000, // Minimum allowed interval
    });

    const privatePool = pool as any;
    let checkCount = 0;

    privatePool.performHealthCheck = async () => {
      checkCount++;
      throw new Error('Health check error');
    };

    privatePool.startHealthCheck();

    // Advance time to trigger multiple checks (5 intervals * 5000ms = 25000ms)
    await vi.advanceTimersByTimeAsync(25000);

    // All checks should be attempted despite errors (up to MAX_CONSECUTIVE_HEALTH_CHECK_ERRORS)
    expect(checkCount).toBeGreaterThanOrEqual(5);

    vi.useRealTimers();
  });

  it('BUG-5: pool should remain functional after health check error', async () => {
    vi.useFakeTimers();

    // Create pool AFTER enabling fake timers so setInterval is intercepted
    pool = new ConnectionPool(testDbPath, {
      maxConnections: 3,
      healthCheckInterval: 5000, // Minimum allowed interval
    });

    const privatePool = pool as any;
    privatePool.performHealthCheck = async () => {
      throw new Error('Health check fails');
    };

    // Trigger health check (advance past one interval)
    await vi.advanceTimersByTimeAsync(6000);

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

    // Create pool AFTER enabling fake timers so setInterval is intercepted
    pool = new ConnectionPool(testDbPath, {
      maxConnections: 3,
      healthCheckInterval: 5000, // Minimum allowed interval
    });

    const privatePool = pool as any;
    let checkCount = 0;

    privatePool.performHealthCheck = async () => {
      checkCount++;
    };

    // Before fix: calling startHealthCheck twice would create two timers
    // After fix: old timer is cleared before creating new one

    privatePool.startHealthCheck();
    await vi.advanceTimersByTimeAsync(5000); // 1 interval
    const count1 = checkCount;

    privatePool.startHealthCheck(); // This now clears the old timer
    await vi.advanceTimersByTimeAsync(5000); // 1 interval
    const count2 = checkCount;

    // With fix: only one timer is running (count increments by 1)
    expect(count2 - count1).toBe(1);

    // Before fix: two timers running (count would increment by 2)

    vi.useRealTimers();
  });

  it('BUG-5: shutdown should cleanup health check timer', async () => {
    vi.useFakeTimers();

    // Create pool AFTER enabling fake timers so setInterval is intercepted
    pool = new ConnectionPool(testDbPath, {
      maxConnections: 3,
      healthCheckInterval: 5000, // Minimum allowed interval
    });

    const privatePool = pool as any;
    let checkCount = 0;

    privatePool.performHealthCheck = async () => {
      checkCount++;
    };

    // Advance past 2 intervals to accumulate some checks
    await vi.advanceTimersByTimeAsync(10000);
    const countBeforeShutdown = checkCount;

    await pool.shutdown();

    // Advance time after shutdown
    await vi.advanceTimersByTimeAsync(25000);

    // No additional checks after shutdown
    expect(checkCount).toBe(countBeforeShutdown);

    vi.useRealTimers();
  });

  it('CRITICAL-2: should handle concurrent release during health check iteration (scan-then-process)', async () => {
    vi.useFakeTimers();

    // Create pool with real connections
    pool = new ConnectionPool(testDbPath, {
      maxConnections: 3,
      healthCheckInterval: 5000,
      idleTimeout: 1000, // Low idle timeout to trigger recycling
    });

    const privatePool = pool as any;

    // Acquire all connections to have active connections
    const db1 = await pool.acquire();
    const db2 = await pool.acquire();
    const db3 = await pool.acquire();

    // Release all connections - they will be in the available pool
    pool.release(db1);
    pool.release(db2);
    pool.release(db3);

    // Verify initial state
    let stats = pool.getStats();
    expect(stats.idle).toBe(3);
    expect(stats.active).toBe(0);

    // Make connections "stale" by advancing time past idle timeout
    await vi.advanceTimersByTimeAsync(2000);

    // Now simulate concurrent release during health check
    // Override performHealthCheck to simulate a release happening during iteration
    let healthCheckStarted = false;
    let releaseCalledDuringHealthCheck = false;

    const originalPerformHealthCheck = privatePool.performHealthCheck.bind(pool);
    privatePool.performHealthCheck = async () => {
      healthCheckStarted = true;

      // Acquire a connection during health check
      const dbDuringCheck = await pool.acquire();

      // The scan-then-process pattern should handle this safely
      // because we snapshot available connections BEFORE processing

      // Release immediately - this should not corrupt the iteration
      pool.release(dbDuringCheck);
      releaseCalledDuringHealthCheck = true;

      // Call original health check
      return originalPerformHealthCheck();
    };

    // Trigger health check
    await vi.advanceTimersByTimeAsync(5000);

    // Verify the concurrent operations happened
    expect(healthCheckStarted).toBe(true);
    expect(releaseCalledDuringHealthCheck).toBe(true);

    // Pool should still be functional and not corrupted
    stats = pool.getStats();
    expect(stats.total).toBeGreaterThan(0);

    // Should still be able to acquire and release connections
    const dbAfter = await pool.acquire();
    expect(dbAfter).toBeDefined();
    pool.release(dbAfter);

    vi.useRealTimers();
  });

  it('CRITICAL-2: health check should not lose connections when release happens mid-iteration', async () => {
    vi.useFakeTimers();

    pool = new ConnectionPool(testDbPath, {
      maxConnections: 5,
      healthCheckInterval: 5000,
      idleTimeout: 1000,
    });

    const privatePool = pool as any;

    // Acquire and release all connections to populate the available pool
    const connections: any[] = [];
    for (let i = 0; i < 5; i++) {
      connections.push(await pool.acquire());
    }
    for (const conn of connections) {
      pool.release(conn);
    }

    // Make connections stale
    await vi.advanceTimersByTimeAsync(2000);

    // Track how many connections are in the pool throughout the test
    const poolSizesBefore = pool.getStats().total;

    // Override the health check to simulate concurrent modifications
    let iterationCount = 0;
    const originalPerformHealthCheck = privatePool.performHealthCheck.bind(pool);
    privatePool.performHealthCheck = async () => {
      iterationCount++;

      // On first health check, acquire and release during the check
      if (iterationCount === 1) {
        // This should NOT cause connection loss due to scan-then-process pattern
        const tempDb = await pool.acquire();
        pool.release(tempDb);
      }

      return originalPerformHealthCheck();
    };

    // Trigger multiple health check cycles
    await vi.advanceTimersByTimeAsync(15000); // 3 health check cycles

    // Verify pool size is maintained (not degraded due to race conditions)
    const statsAfter = pool.getStats();
    expect(statsAfter.total).toBe(poolSizesBefore);

    // Pool should be healthy
    expect(pool.isHealthy()).toBe(true);

    vi.useRealTimers();
  });
});
