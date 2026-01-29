/**
 * ConnectionPool Race Condition Tests
 *
 * Tests for BUG-1: Double release race condition
 * Verifies that concurrent release() calls don't cause duplicate entries in available pool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionPool } from '../ConnectionPool.js';
import type Database from 'better-sqlite3';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('ConnectionPool - BUG-1: Race Condition Tests', () => {
  let pool: ConnectionPool;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ccb-pool-race-'));
    // ✅ FIX: Correct constructor signature (dbPath, options)
    pool = new ConnectionPool(
      join(tempDir, 'test.db'),  // dbPath as first argument
      {
        maxConnections: 5,  // Need 5 connections for some tests
        connectionTimeout: 5000,
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

  it('BUG-1: should prevent double release in concurrent scenarios', async () => {
    const db = await pool.acquire();

    // Attempt concurrent releases of the same connection
    const releaseResults = await Promise.allSettled([
      Promise.resolve(pool.release(db)),
      Promise.resolve(pool.release(db)),
      Promise.resolve(pool.release(db)),
    ]);

    // All releases should complete (not throw)
    expect(releaseResults.every(r => r.status === 'fulfilled')).toBe(true);

    const stats = pool.getStats();

    // ✅ FIX: Critical assertion - pool should have all 5 connections idle (no duplicates)
    expect(stats.idle).toBe(5); // All connections returned to pool
    expect(stats.active).toBe(0);
    expect(stats.total).toBe(5); // Total pool size should remain 5
    // The key is that duplicate releases don't create extra entries (would be >5)
  });

  it('BUG-1: should handle interleaved acquire/release cycles without duplication', async () => {
    // Acquire multiple connections
    const connections: Database.Database[] = [];
    for (let i = 0; i < 3; i++) {
      connections.push(await pool.acquire());
    }

    // Concurrent release all connections (some may be released multiple times)
    const releases = connections.flatMap(db => [
      Promise.resolve(pool.release(db)),
      Promise.resolve(pool.release(db)),
    ]);

    await Promise.allSettled(releases);

    const stats = pool.getStats();

    // ✅ FIX: All 5 pool connections should be idle (no duplicates from double releases)
    expect(stats.idle).toBe(5);
    expect(stats.active).toBe(0);
    // Without fix: duplicate releases could create >5 entries

    // Verify we can acquire at least 3 unique connections
    const acquired = new Set<Database.Database>();
    for (let i = 0; i < 3; i++) {
      acquired.add(await pool.acquire());
    }
    expect(acquired.size).toBe(3);
  });

  it('BUG-1: should not create duplicate entries when racing with waiting requests', async () => {
    // Fill the pool
    const connections: Database.Database[] = [];
    for (let i = 0; i < 5; i++) {
      connections.push(await pool.acquire());
    }

    // Create waiting request
    const waitingPromise = pool.acquire();

    // ✅ FIX: Wait for acquire() to actually enter waiting state
    // Use setImmediate to ensure acquire() Promise initialization completes
    await new Promise(resolve => setImmediate(resolve));

    // Concurrent release (one should go to waiting, duplicates should be ignored)
    await Promise.all([
      Promise.resolve(pool.release(connections[0])),
      Promise.resolve(pool.release(connections[0])),
      Promise.resolve(pool.release(connections[0])),
    ]);

    // Waiting request should be fulfilled
    const acquired = await waitingPromise;
    expect(acquired).toBe(connections[0]);

    // Release remaining
    for (let i = 1; i < 5; i++) {
      pool.release(connections[i]);
    }
    pool.release(acquired);

    const stats = pool.getStats();
    expect(stats.idle).toBe(5);
    expect(stats.active).toBe(0);
  });

  it('BUG-1 Before Fix: would have created duplicate available entries (simulation)', async () => {
    // This test documents the bug behavior before the fix
    // The fix moves the duplicate check BEFORE state modifications

    const db = await pool.acquire();

    // Simulate the TOCTOU race window that existed before the fix:
    // 1. Thread A checks indexOf() → not found
    // 2. Thread B checks indexOf() → not found (race window)
    // 3. Thread A pushes to available
    // 4. Thread B pushes to available (DUPLICATE!)

    // With the fix, this scenario is prevented by moving the check
    // to the very beginning, before any state changes

    pool.release(db);
    pool.release(db); // This is now safely ignored

    const stats = pool.getStats();
    // ✅ FIX: Pool should have all 5 connections idle (no duplicates created)
    expect(stats.idle).toBe(5); // All connections back in pool
    expect(stats.active).toBe(0);
    // ❌ Before fix: stats.idle could be 6 (duplicate entry created)
  });

  it('BUG-1: high concurrency stress test (100 concurrent releases)', async () => {
    const db = await pool.acquire();

    // Stress test with 100 concurrent releases
    const releases = Array.from({ length: 100 }, () =>
      Promise.resolve(pool.release(db))
    );

    await Promise.allSettled(releases);

    const stats = pool.getStats();
    // ✅ FIX: All 5 pool connections should be idle (100 releases don't create duplicates)
    expect(stats.idle).toBe(5);
    expect(stats.active).toBe(0);
    // Without fix: 100 releases could create 100 duplicate entries

    // Verify pool still works correctly after stress test
    const testDb = await pool.acquire();
    // ✅ FIX: Just verify we can acquire a connection (not necessarily the same instance)
    expect(testDb).toBeDefined();
    expect(testDb).toBeTruthy();
    pool.release(testDb);
  });

  it('BUG-1: should maintain consistency across multiple acquire/release cycles', async () => {
    // Run 50 cycles of acquire/release with random concurrent duplicates
    for (let cycle = 0; cycle < 50; cycle++) {
      const db = await pool.acquire();

      // Random number of concurrent releases (1-5)
      const releaseCount = 1 + Math.floor(Math.random() * 5);
      await Promise.allSettled(
        Array.from({ length: releaseCount }, () =>
          Promise.resolve(pool.release(db))
        )
      );

      const stats = pool.getStats();
      // ✅ FIX: Pool has maxConnections (5) idle connections after release
      expect(stats.idle).toBe(5);
      expect(stats.active).toBe(0);
    }
  });
});
