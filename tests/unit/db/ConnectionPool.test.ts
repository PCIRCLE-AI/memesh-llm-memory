/**
 * ConnectionPool Unit Tests
 *
 * Comprehensive test suite for SQLite connection pooling functionality.
 * Tests cover pool initialization, connection acquisition/release,
 * concurrent access, timeout handling, health checks, and graceful shutdown.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionPool } from '../../../src/db/ConnectionPool.js';
import type Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ConnectionPool', () => {
  let testDbPath: string;
  let pool: ConnectionPool;

  beforeEach(() => {
    // Create unique test database for each test
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    testDbPath = path.join(os.tmpdir(), `test-pool-${timestamp}-${random}.db`);
  });

  afterEach(async () => {
    // Cleanup pool
    if (pool) {
      await pool.shutdown();
    }

    // Remove test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Clean up WAL and SHM files
    [testDbPath + '-wal', testDbPath + '-shm'].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('Pool Initialization', () => {
    it('should create pool with default options', () => {
      pool = new ConnectionPool(testDbPath);
      const stats = pool.getStats();

      expect(stats.total).toBe(5); // Default maxConnections
      expect(stats.idle).toBe(5); // All connections idle initially
      expect(stats.active).toBe(0);
      expect(stats.waiting).toBe(0);
    });

    it('should create pool with custom options', () => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 3,
        connectionTimeout: 2000,
        idleTimeout: 15000,
      });

      const stats = pool.getStats();
      expect(stats.total).toBe(3);
      expect(stats.idle).toBe(3);
    });

    it('should throw error for invalid maxConnections', () => {
      expect(() => {
        new ConnectionPool(testDbPath, { maxConnections: 0, connectionTimeout: 5000, idleTimeout: 30000 });
      }).toThrow('maxConnections must be at least 1');

      expect(() => {
        new ConnectionPool(testDbPath, { maxConnections: -1, connectionTimeout: 5000, idleTimeout: 30000 });
      }).toThrow('maxConnections must be at least 1');
    });

    it('should create pool with in-memory database', () => {
      pool = new ConnectionPool(':memory:', { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });
      const stats = pool.getStats();

      expect(stats.total).toBe(2);
      expect(stats.idle).toBe(2);
    });

    it('should report healthy status after initialization', () => {
      pool = new ConnectionPool(testDbPath, { maxConnections: 3, connectionTimeout: 5000, idleTimeout: 30000 });
      expect(pool.isHealthy()).toBe(true);
    });
  });

  describe('Connection Acquisition and Release', () => {
    beforeEach(() => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 3,
        connectionTimeout: 5000,
        idleTimeout: 30000,
      });
    });

    it('should acquire and release connection', async () => {
      const statsBefore = pool.getStats();
      expect(statsBefore.idle).toBe(3);
      expect(statsBefore.active).toBe(0);

      const db = await pool.acquire();
      expect(db).toBeDefined();

      const statsAcquired = pool.getStats();
      expect(statsAcquired.idle).toBe(2);
      expect(statsAcquired.active).toBe(1);
      expect(statsAcquired.totalAcquired).toBe(1);

      pool.release(db);

      const statsReleased = pool.getStats();
      expect(statsReleased.idle).toBe(3);
      expect(statsReleased.active).toBe(0);
      expect(statsReleased.totalReleased).toBe(1);
    });

    it('should allow using acquired connection', async () => {
      const db = await pool.acquire();

      // Create table and insert data
      db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      db.prepare('INSERT INTO test (name) VALUES (?)').run('Alice');

      const result = db.prepare('SELECT * FROM test WHERE name = ?').get('Alice') as any;
      expect(result).toBeDefined();
      expect(result.name).toBe('Alice');

      pool.release(db);
    });

    it('should handle multiple sequential acquisitions', async () => {
      const db1 = await pool.acquire();
      pool.release(db1);

      const db2 = await pool.acquire();
      pool.release(db2);

      const db3 = await pool.acquire();
      pool.release(db3);

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(3);
      expect(stats.totalReleased).toBe(3);
      expect(stats.idle).toBe(3);
    });

    it('should reuse connections', async () => {
      const db1 = await pool.acquire();
      pool.release(db1);

      const statsBefore = pool.getStats();
      expect(statsBefore.idle).toBe(3);

      const db2 = await pool.acquire();
      // Connection is reused (comes from available pool, not created new)
      const statsAfter = pool.getStats();
      expect(statsAfter.idle).toBe(2);
      expect(statsAfter.active).toBe(1);

      pool.release(db2);
    });

    it('should ignore release of unknown connection', async () => {
      const unknownDb = {} as Database.Database;
      pool.release(unknownDb); // Should not throw

      const stats = pool.getStats();
      expect(stats.totalReleased).toBe(0);
    });
  });

  describe('Concurrent Access', () => {
    beforeEach(() => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 3,
        connectionTimeout: 5000,
        idleTimeout: 30000,
      });
    });

    it('should handle concurrent acquisitions within pool size', async () => {
      const acquisitions = [
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
      ];

      const connections = await Promise.all(acquisitions);
      expect(connections).toHaveLength(3);

      const stats = pool.getStats();
      expect(stats.active).toBe(3);
      expect(stats.idle).toBe(0);

      // Release all
      connections.forEach(db => pool.release(db));

      const statsAfter = pool.getStats();
      expect(statsAfter.idle).toBe(3);
      expect(statsAfter.active).toBe(0);
    });

    it('should queue requests when pool is exhausted', async () => {
      // Acquire all connections
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      const conn3 = await pool.acquire();

      const stats1 = pool.getStats();
      expect(stats1.active).toBe(3);
      expect(stats1.idle).toBe(0);

      // Try to acquire one more (should queue)
      const pendingPromise = pool.acquire();

      // Wait a bit to ensure it's queued
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats2 = pool.getStats();
      expect(stats2.waiting).toBe(1);

      // Release one connection
      pool.release(conn1);

      // The pending request should now be fulfilled
      const conn4 = await pendingPromise;
      expect(conn4).toBeDefined();

      const stats3 = pool.getStats();
      expect(stats3.waiting).toBe(0);
      expect(stats3.active).toBe(3); // conn2, conn3, conn4

      // Cleanup
      pool.release(conn2);
      pool.release(conn3);
      pool.release(conn4);
    });

    it('should handle multiple queued requests', async () => {
      // Acquire all connections
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      const conn3 = await pool.acquire();

      // Queue 3 requests (matching pool size)
      const pending = [
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
      ];

      // Wait for queue to populate
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = pool.getStats();
      expect(stats.waiting).toBe(3);

      // Release all connections
      pool.release(conn1);
      pool.release(conn2);
      pool.release(conn3);

      // All pending requests should be fulfilled
      const fulfilled = await Promise.all(pending);
      expect(fulfilled).toHaveLength(3);

      // Cleanup
      fulfilled.forEach(db => pool.release(db));
    });
  });

  describe('Connection Timeout', () => {
    beforeEach(() => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 2,
        connectionTimeout: 1000, // 1 second timeout
        idleTimeout: 30000,
      });
    });

    it('should timeout when no connection available', async () => {
      // Acquire all connections
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      // Try to acquire one more - should timeout
      await expect(pool.acquire()).rejects.toThrow('Connection acquisition timeout after 1000ms');

      const stats = pool.getStats();
      expect(stats.timeoutErrors).toBe(1);

      // Cleanup
      pool.release(conn1);
      pool.release(conn2);
    });

    it('should not timeout if connection becomes available', async () => {
      // Acquire all connections
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      // Start acquiring (will queue)
      const pendingPromise = pool.acquire();

      // Release one connection after 500ms (before timeout)
      setTimeout(() => pool.release(conn1), 500);

      // Should succeed (no timeout)
      const conn3 = await pendingPromise;
      expect(conn3).toBeDefined();

      const stats = pool.getStats();
      expect(stats.timeoutErrors).toBe(0);

      // Cleanup
      pool.release(conn2);
      pool.release(conn3);
    });
  });

  describe('Health Checks and Idle Timeout', () => {
    it('should recycle idle connections', async () => {
      vi.useFakeTimers();

      pool = new ConnectionPool(testDbPath, {
        maxConnections: 2,
        connectionTimeout: 5000,
        idleTimeout: 5000, // Minimum allowed idle timeout
        healthCheckInterval: 5000, // Minimum allowed health check interval
      });

      // Acquire and immediately release a connection
      const conn = await pool.acquire();
      pool.release(conn);

      const initialStats = pool.getStats();
      expect(initialStats.totalRecycled).toBe(0);

      // Advance past idle timeout + health check interval to trigger recycling
      await vi.advanceTimersByTimeAsync(11000);

      const afterStats = pool.getStats();
      expect(afterStats.totalRecycled).toBeGreaterThan(0);
      expect(afterStats.total).toBe(2); // Pool size maintained
      expect(pool.isHealthy()).toBe(true);

      vi.useRealTimers();
    });

    it('should maintain pool size after recycling', async () => {
      vi.useFakeTimers();

      pool = new ConnectionPool(testDbPath, {
        maxConnections: 3,
        connectionTimeout: 5000,
        idleTimeout: 5000, // Minimum allowed idle timeout
        healthCheckInterval: 5000, // Minimum allowed health check interval
      });

      // Use all connections
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      const conn3 = await pool.acquire();

      pool.release(conn1);
      pool.release(conn2);
      pool.release(conn3);

      // Advance past idle timeout + health check interval to trigger recycling
      await vi.advanceTimersByTimeAsync(11000);

      const stats = pool.getStats();
      expect(stats.total).toBe(3);
      expect(stats.idle).toBe(3);
      expect(pool.isHealthy()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(() => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 3,
        connectionTimeout: 5000,
        idleTimeout: 30000,
      });
    });

    it('should shutdown cleanly', async () => {
      await pool.shutdown();

      const stats = pool.getStats();
      expect(stats.total).toBe(0);
      expect(stats.idle).toBe(0);
    });

    it('should reject acquisitions after shutdown', async () => {
      await pool.shutdown();

      await expect(pool.acquire()).rejects.toThrow('Pool is shutting down');
    });

    it('should reject queued requests on shutdown', async () => {
      // Acquire all connections
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      const conn3 = await pool.acquire();

      // Queue requests
      const pending1 = pool.acquire();
      const pending2 = pool.acquire();

      // Wait for queue
      await new Promise(resolve => setTimeout(resolve, 100));

      // Shutdown - should reject queued requests
      const shutdownPromise = pool.shutdown();

      await expect(pending1).rejects.toThrow('Pool is shutting down');
      await expect(pending2).rejects.toThrow('Pool is shutting down');

      await shutdownPromise;
    });

    it('should handle multiple shutdown calls gracefully', async () => {
      await pool.shutdown();
      await pool.shutdown(); // Should not throw
      await pool.shutdown(); // Should not throw
    });

    it('should ignore releases after shutdown', async () => {
      const conn = await pool.acquire();
      await pool.shutdown();

      // Should not throw
      pool.release(conn);
    });
  });

  describe('Statistics Tracking', () => {
    beforeEach(() => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 3,
        connectionTimeout: 5000,
        idleTimeout: 30000,
      });
    });

    it('should track acquisitions and releases', async () => {
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      let stats = pool.getStats();
      expect(stats.totalAcquired).toBe(2);
      expect(stats.totalReleased).toBe(0);

      pool.release(conn1);

      stats = pool.getStats();
      expect(stats.totalAcquired).toBe(2);
      expect(stats.totalReleased).toBe(1);

      pool.release(conn2);

      stats = pool.getStats();
      expect(stats.totalAcquired).toBe(2);
      expect(stats.totalReleased).toBe(2);
    });

    it('should track waiting requests', async () => {
      // Acquire all
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      const conn3 = await pool.acquire();

      // Queue requests
      const pending1 = pool.acquire();
      const pending2 = pool.acquire();

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = pool.getStats();
      expect(stats.waiting).toBe(2);

      // Release and resolve
      pool.release(conn1);
      pool.release(conn2);

      await Promise.all([pending1, pending2]);

      const finalStats = pool.getStats();
      expect(finalStats.waiting).toBe(0);
    });

    it('should track timeout errors', async () => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 1,
        connectionTimeout: 500,
        idleTimeout: 30000,
      });

      const conn = await pool.acquire();

      // Try to acquire - will timeout
      await expect(pool.acquire()).rejects.toThrow();

      const stats = pool.getStats();
      expect(stats.timeoutErrors).toBe(1);

      pool.release(conn);
    });
  });

  describe('Error Handling', () => {
    it('should handle database file errors', () => {
      const invalidPath = '/invalid/path/to/db.sqlite';

      expect(() => {
        new ConnectionPool(invalidPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });
      }).toThrow();
    });

    it('should handle connection close errors gracefully', async () => {
      pool = new ConnectionPool(testDbPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });

      const conn = await pool.acquire();

      // Force close the connection
      conn.close();

      // Release should not throw
      pool.release(conn);

      // Shutdown should handle already-closed connection
      await expect(pool.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Connection Metadata', () => {
    beforeEach(() => {
      pool = new ConnectionPool(testDbPath, {
        maxConnections: 2,
        connectionTimeout: 5000,
        idleTimeout: 30000,
      });
    });

    it('should track connection usage count', async () => {
      const conn = await pool.acquire();
      pool.release(conn);

      const conn2 = await pool.acquire();
      // Connection is reused from pool
      pool.release(conn2);

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(2); // Connection acquired twice
      expect(stats.totalReleased).toBe(2); // And released twice
    });
  });
});
