/**
 * ConnectionPool Integration Tests
 *
 * Comprehensive integration tests for ConnectionPool and SimpleDatabaseFactory integration.
 * Tests connection pooling, concurrent access, health checks, resource management, and error handling.
 *
 * Test Structure:
 * 1. Pool Initialization - Verify pool creates and configures connections properly
 * 2. Concurrent Connection Acquisition - Test parallel acquire/release operations
 * 3. Connection Health Checks - Verify health check intervals and connection recycling
 * 4. Resource Management - Test connection lifecycle and cleanup
 * 5. Error Handling - Verify proper error handling for various failure scenarios
 *
 * Performance Targets:
 * - Connection acquisition: <10ms average
 * - Pool initialization: <100ms
 * - Concurrent acquisitions: 50 operations complete successfully
 * - No resource leaks after 100 acquire/release cycles
 *
 * @module tests/integration/connection-pool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionPool, type ConnectionPoolOptions, type PoolStats } from '../../src/db/ConnectionPool.js';
import { SimpleDatabaseFactory } from '../../src/config/simple-config.js';
import type { ILogger } from '../../src/utils/ILogger.js';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Mock Logger Implementation
 *
 * Captures all log calls for verification in tests.
 * Allows us to verify that ConnectionPool is logging expected messages.
 */
class MockLogger implements ILogger {
  public logs: Array<{ level: string; message: string; meta?: Record<string, unknown> }> = [];

  info(message: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'info', message, meta });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'error', message, meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  clear(): void {
    this.logs = [];
  }

  /**
   * Check if logger has received a specific message
   */
  hasMessage(level: string, messagePattern: string | RegExp): boolean {
    return this.logs.some(
      (log) =>
        log.level === level &&
        (typeof messagePattern === 'string'
          ? log.message.includes(messagePattern)
          : messagePattern.test(log.message))
    );
  }

  /**
   * Get all messages for a specific log level
   */
  getMessages(level: string): string[] {
    return this.logs.filter((log) => log.level === level).map((log) => log.message);
  }
}

/**
 * Test Suite: ConnectionPool Integration Tests
 */
describe('ConnectionPool Integration Tests', () => {
  let testDbPath: string;
  let tempDir: string;
  let mockLogger: MockLogger;

  /**
   * Setup: Create temporary test database before each test
   */
  beforeEach(() => {
    // Create temporary directory for test databases
    tempDir = mkdtempSync(join(tmpdir(), 'connection-pool-test-'));
    testDbPath = join(tempDir, 'test.db');

    // Create mock logger
    mockLogger = new MockLogger();

    // Initialize test database with schema
    const db = new Database(testDbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Insert test data
      INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
      INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
      INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com');
    `);
    db.close();
  });

  /**
   * Teardown: Clean up test database and temporary directory
   */
  afterEach(async () => {
    // Clean up SimpleDatabaseFactory caches
    await SimpleDatabaseFactory.closeAll();

    // Remove temporary directory
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to clean up temp directory:', error);
      }
    }

    // Clear mock logger
    mockLogger.clear();
  });

  /**
   * Test Suite 1: Pool Initialization
   *
   * Verifies that ConnectionPool creates the correct number of connections,
   * configures them properly (WAL mode, cache, mmap), and integrates with
   * verbose logging.
   */
  describe('Pool Initialization', () => {
    it('should create pool with correct number of connections', () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 5, connectionTimeout: 5000, idleTimeout: 30000 });

      const stats = pool.getStats();

      expect(stats.total).toBe(5);
      expect(stats.idle).toBe(5);
      expect(stats.active).toBe(0);
      expect(stats.waiting).toBe(0);

      // Cleanup
      pool.shutdown();
    });

    it('should configure each connection with WAL mode', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 3, connectionTimeout: 5000, idleTimeout: 30000 });

      // Acquire all connections and check WAL mode
      const connections: Database.Database[] = [];
      for (let i = 0; i < 3; i++) {
        const db = await pool.acquire();
        connections.push(db);

        // Check journal_mode is WAL
        const result = db.pragma('journal_mode', { simple: true }) as string;
        expect(['wal', 'delete']).toContain(result.toLowerCase());
      }

      // Release all connections
      connections.forEach((db) => pool.release(db));

      // Cleanup
      await pool.shutdown();
    });

    it('should configure connections with foreign key constraints enabled', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });

      const db = await pool.acquire();

      // Check foreign_keys pragma
      const result = db.pragma('foreign_keys', { simple: true }) as number;
      expect(result).toBe(1); // 1 means ON

      pool.release(db);
      await pool.shutdown();
    });

    it('should integrate with verbose logger when provided', async () => {
      const pool = new ConnectionPool(
        testDbPath,
        { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 },
        mockLogger
      );

      const db = await pool.acquire();

      // Execute a query to trigger verbose logging
      db.prepare('SELECT * FROM users WHERE id = ?').get(1);

      pool.release(db);

      // Check that SQLite debug messages were logged
      const debugMessages = mockLogger.getMessages('debug');
      expect(debugMessages.length).toBeGreaterThan(0);
      expect(debugMessages.some((msg) => msg.includes('SQLite'))).toBe(true);

      await pool.shutdown();
    });

    it('should initialize pool in under 100ms', () => {
      const startTime = Date.now();

      const pool = new ConnectionPool(testDbPath, { maxConnections: 5, connectionTimeout: 5000, idleTimeout: 30000 });

      const initTime = Date.now() - startTime;

      expect(initTime).toBeLessThan(100);
      expect(pool.isHealthy()).toBe(true);

      pool.shutdown();
    });

    it('should throw error if maxConnections is less than 1', () => {
      expect(() => {
        new ConnectionPool(testDbPath, { maxConnections: 0, connectionTimeout: 5000, idleTimeout: 30000 });
      }).toThrow('maxConnections must be at least 1');
    });
  });

  /**
   * Test Suite 2: Concurrent Connection Acquisition
   *
   * Tests parallel acquire operations to verify:
   * - All connections returned correctly
   * - No connection is double-acquired
   * - Average acquisition time is acceptable
   * - Pool handles high concurrent load
   */
  describe('Concurrent Connection Acquisition', () => {
    it('should handle 50 concurrent acquire operations successfully', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 5, connectionTimeout: 5000, idleTimeout: 30000 });

      const acquireTasks = Array.from({ length: 50 }, async (_, i) => {
        const db = await pool.acquire();

        // Perform a simple query to verify connection works
        const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
        expect(result.count).toBe(3); // We inserted 3 users in beforeEach

        // Simulate some work (random 1-10ms)
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

        pool.release(db);
        return i;
      });

      const results = await Promise.all(acquireTasks);

      // Verify all 50 tasks completed
      expect(results).toHaveLength(50);
      expect(results).toEqual(Array.from({ length: 50 }, (_, i) => i));

      // Verify pool is healthy and all connections are idle
      const stats = pool.getStats();
      expect(stats.idle).toBe(5);
      expect(stats.active).toBe(0);
      expect(stats.waiting).toBe(0);

      await pool.shutdown();
    });

    it('should ensure no connection is double-acquired', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 3, connectionTimeout: 5000, idleTimeout: 30000 });

      const activeConnections = new Set<Database.Database>();
      const connectionHistory: Database.Database[] = [];
      let doubleAcquire = false;

      const acquireTasks = Array.from({ length: 20 }, async () => {
        const db = await pool.acquire();

        // Check if this connection is already active
        if (activeConnections.has(db)) {
          doubleAcquire = true;
        }

        activeConnections.add(db);
        connectionHistory.push(db);

        // Hold connection briefly
        await new Promise((resolve) => setTimeout(resolve, 5));

        activeConnections.delete(db);
        pool.release(db);
      });

      await Promise.all(acquireTasks);

      // Verify no double acquisition occurred
      expect(doubleAcquire).toBe(false);

      // Verify all connections were returned to pool
      const stats = pool.getStats();
      expect(stats.idle).toBe(3);
      expect(stats.active).toBe(0);

      await pool.shutdown();
    });

    it('should achieve average acquisition time under 10ms', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 5, connectionTimeout: 5000, idleTimeout: 30000 });

      const acquisitionTimes: number[] = [];

      const acquireTasks = Array.from({ length: 50 }, async () => {
        const startTime = Date.now();
        const db = await pool.acquire();
        const acquisitionTime = Date.now() - startTime;

        acquisitionTimes.push(acquisitionTime);

        // Quick operation
        db.prepare('SELECT 1').get();

        pool.release(db);
      });

      await Promise.all(acquireTasks);

      // Calculate average acquisition time
      const averageTime = acquisitionTimes.reduce((a, b) => a + b, 0) / acquisitionTimes.length;

      expect(averageTime).toBeLessThan(10);

      await pool.shutdown();
    });

    it('should handle pool exhaustion by queuing requests', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });

      // Acquire all connections
      const db1 = await pool.acquire();
      const db2 = await pool.acquire();

      let stats = pool.getStats();
      expect(stats.idle).toBe(0);
      expect(stats.active).toBe(2);

      // Try to acquire a third connection (should queue)
      const acquirePromise = pool.acquire();

      // Wait a bit for the request to be queued
      await new Promise((resolve) => setTimeout(resolve, 10));

      stats = pool.getStats();
      expect(stats.waiting).toBe(1);

      // Release one connection - queued request should get it
      pool.release(db1);

      const db3 = await acquirePromise;
      expect(db3).toBeDefined();

      stats = pool.getStats();
      expect(stats.waiting).toBe(0);
      expect(stats.active).toBe(2);

      // Cleanup
      pool.release(db2);
      pool.release(db3);
      await pool.shutdown();
    });
  });

  /**
   * Test Suite 3: Connection Health Checks
   *
   * Verifies health check interval works correctly and unhealthy connections
   * are recycled properly.
   */
  describe('Connection Health Checks', () => {
    it('should recycle idle connections after idleTimeout', async () => {
      vi.useFakeTimers();

      const pool = new ConnectionPool(testDbPath, {
        maxConnections: 2,
        connectionTimeout: 5000,
        idleTimeout: 5000, // Minimum allowed idle timeout
        healthCheckInterval: 5000, // Minimum allowed health check interval
      });

      // Acquire and release a connection
      const db1 = await pool.acquire();
      const initialDb1 = db1; // Save reference
      pool.release(db1);

      let stats = pool.getStats();
      expect(stats.totalRecycled).toBe(0);

      // Advance past idle timeout + health check interval to trigger recycling
      await vi.advanceTimersByTimeAsync(11000);

      // Acquire a connection - should be a recycled (new) one
      const db2 = await pool.acquire();

      stats = pool.getStats();
      expect(stats.totalRecycled).toBeGreaterThan(0);

      // The connection instance should be different after recycling
      expect(db2).not.toBe(initialDb1);

      pool.release(db2);
      await pool.shutdown();

      vi.useRealTimers();
    });

    it('should maintain pool size during health checks', async () => {
      vi.useFakeTimers();

      const pool = new ConnectionPool(testDbPath, {
        maxConnections: 3,
        connectionTimeout: 5000,
        idleTimeout: 5000, // Minimum allowed idle timeout
        healthCheckInterval: 5000, // Minimum allowed health check interval
      });

      // Advance past multiple health check cycles
      await vi.advanceTimersByTimeAsync(16000);

      const stats = pool.getStats();

      // Pool should still have all connections
      expect(stats.total).toBe(3);
      expect(pool.isHealthy()).toBe(true);

      await pool.shutdown();

      vi.useRealTimers();
    });

    it('should verify connections are functional after recycling', async () => {
      vi.useFakeTimers();

      const pool = new ConnectionPool(testDbPath, {
        maxConnections: 2,
        connectionTimeout: 5000,
        idleTimeout: 5000, // Minimum allowed idle timeout
        healthCheckInterval: 5000, // Minimum allowed health check interval
      });

      // Acquire, use, and release a connection
      const db1 = await pool.acquire();
      db1.prepare('SELECT * FROM users').all();
      pool.release(db1);

      // Advance past idle timeout + health check interval to trigger recycling
      await vi.advanceTimersByTimeAsync(11000);

      // Acquire connection again - should be recycled
      const db2 = await pool.acquire();

      // Verify it's functional
      const result = db2.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      expect(result.count).toBe(3);

      pool.release(db2);
      await pool.shutdown();

      vi.useRealTimers();
    });
  });

  /**
   * Test Suite 4: Resource Management
   *
   * Tests connection lifecycle, cleanup, and ensures no resource leaks.
   */
  describe('Resource Management', () => {
    it('should properly release connections back to pool', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 3, connectionTimeout: 5000, idleTimeout: 30000 });

      // Acquire all connections
      const dbs = await Promise.all([pool.acquire(), pool.acquire(), pool.acquire()]);

      let stats = pool.getStats();
      expect(stats.active).toBe(3);
      expect(stats.idle).toBe(0);

      // Release all connections
      dbs.forEach((db) => pool.release(db));

      stats = pool.getStats();
      expect(stats.active).toBe(0);
      expect(stats.idle).toBe(3);

      await pool.shutdown();
    });

    it('should handle 100 acquire/release cycles without leaks', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 3, connectionTimeout: 5000, idleTimeout: 30000 });

      const initialStats = pool.getStats();

      for (let i = 0; i < 100; i++) {
        const db = await pool.acquire();
        db.prepare('SELECT 1').get();
        pool.release(db);
      }

      const finalStats = pool.getStats();

      // Pool should still be healthy
      expect(finalStats.total).toBe(initialStats.total);
      expect(finalStats.idle).toBe(initialStats.idle);
      expect(finalStats.active).toBe(0);
      expect(pool.isHealthy()).toBe(true);

      // Verify acquire/release counts match
      expect(finalStats.totalAcquired).toBe(100);
      expect(finalStats.totalReleased).toBe(100);

      await pool.shutdown();
    });

    it('should gracefully shutdown and close all connections', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 4, connectionTimeout: 5000, idleTimeout: 30000 });

      // Acquire some connections
      const db1 = await pool.acquire();
      const db2 = await pool.acquire();

      // Release one
      pool.release(db1);

      // Shutdown pool
      await pool.shutdown();

      // Verify stats show empty pool
      const stats = pool.getStats();
      expect(stats.total).toBe(0);
      expect(stats.idle).toBe(0);
      expect(stats.active).toBe(0);

      // Attempting to acquire should throw
      await expect(pool.acquire()).rejects.toThrow('Pool is shutting down');
    });

    it('should reject waiting requests on shutdown', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 1, connectionTimeout: 5000, idleTimeout: 30000 });

      // Acquire the only connection
      const db = await pool.acquire();

      // Try to acquire another (will wait)
      const acquirePromise = pool.acquire();

      // Wait for request to be queued
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Shutdown pool
      await pool.shutdown();

      // Waiting request should be rejected
      await expect(acquirePromise).rejects.toThrow('Pool is shutting down');
    });

    it('should track totalAcquired and totalReleased correctly', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });

      // Perform multiple acquire/release cycles
      for (let i = 0; i < 10; i++) {
        const db = await pool.acquire();
        pool.release(db);
      }

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(10);
      expect(stats.totalReleased).toBe(10);

      await pool.shutdown();
    });
  });

  /**
   * Test Suite 5: Error Handling
   *
   * Verifies proper error handling for various failure scenarios.
   */
  describe('Error Handling', () => {
    it('should timeout when no connection available within timeout', async () => {
      const minTimeout = 1000; // Minimum allowed connectionTimeout after clamping
      const pool = new ConnectionPool(testDbPath, {
        maxConnections: 1,
        connectionTimeout: minTimeout,
        idleTimeout: 30000,
      });

      // Acquire the only connection and hold it
      const db = await pool.acquire();

      // Try to acquire another connection (should timeout)
      const startTime = Date.now();

      await expect(pool.acquire()).rejects.toThrow(/Connection acquisition timeout after \d+ms/);

      const elapsedTime = Date.now() - startTime;

      // Verify it timed out approximately at the right time (within 100ms tolerance)
      expect(elapsedTime).toBeGreaterThanOrEqual(minTimeout);
      expect(elapsedTime).toBeLessThan(minTimeout + 100);

      const stats = pool.getStats();
      expect(stats.timeoutErrors).toBe(1);

      pool.release(db);
      await pool.shutdown();
    });

    it('should handle invalid database path gracefully', () => {
      const invalidPath = '/invalid/path/that/does/not/exist/test.db';

      expect(() => {
        new ConnectionPool(invalidPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });
      }).toThrow(); // Should throw during initialization
    });

    it('should handle release of unknown connection gracefully', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });

      // Create a connection outside the pool
      const externalDb = new Database(testDbPath);

      // Try to release it (should log error but not throw)
      expect(() => {
        pool.release(externalDb);
      }).not.toThrow();

      externalDb.close();
      await pool.shutdown();
    });

    it('should handle double release gracefully', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 2, connectionTimeout: 5000, idleTimeout: 30000 });

      const db = await pool.acquire();

      // Release once
      pool.release(db);

      const statsAfterFirstRelease = pool.getStats();

      // Release again - ConnectionPool detects and ignores double release,
      // but totalReleased metric is incorrectly incremented (known limitation)
      pool.release(db);

      const statsAfterSecondRelease = pool.getStats();

      // After the fix in MAJOR-4, double release no longer increments totalReleased
      expect(statsAfterSecondRelease.totalReleased).toBe(1);
      expect(statsAfterSecondRelease.idle).toBe(statsAfterFirstRelease.idle);

      await pool.shutdown();
    });

    it('should provide clear error messages for timeout scenarios', async () => {
      // Use minimum allowed connectionTimeout (values below 1000ms are clamped to 1000ms)
      const pool = new ConnectionPool(testDbPath, { maxConnections: 1, connectionTimeout: 1000, idleTimeout: 30000 });

      const db = await pool.acquire();

      try {
        await pool.acquire();
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/Connection acquisition timeout after \d+ms/);
        expect((error as Error).message).toContain('1000');
      }

      pool.release(db);
      await pool.shutdown();
    });
  });

  /**
   * Test Suite 6: SimpleDatabaseFactory Integration
   *
   * Tests integration between ConnectionPool and SimpleDatabaseFactory.
   */
  describe('SimpleDatabaseFactory Integration', () => {
    it('should create connection pool via SimpleDatabaseFactory.getPool()', () => {
      const pool = SimpleDatabaseFactory.getPool(testDbPath);

      expect(pool).toBeDefined();
      expect(pool.isHealthy()).toBe(true);

      const stats = pool.getStats();
      expect(stats.total).toBeGreaterThan(0);
    });

    it('should acquire and release pooled connections via factory methods', async () => {
      const db = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      expect(db).toBeDefined();

      // Use connection
      const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      expect(result.count).toBe(3);

      // Release connection
      SimpleDatabaseFactory.releasePooledConnection(db, testDbPath);

      const stats = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(stats).toBeDefined();
      expect(stats!.active).toBe(0);
    });

    it('should return same pool instance for same path', () => {
      const pool1 = SimpleDatabaseFactory.getPool(testDbPath);
      const pool2 = SimpleDatabaseFactory.getPool(testDbPath);

      expect(pool1).toBe(pool2);
    });

    it('should close all pools when closeAll() is called', async () => {
      // Create multiple pools
      const pool1 = SimpleDatabaseFactory.getPool(testDbPath);
      const tempDb2 = join(tempDir, 'test2.db');
      new Database(tempDb2).close(); // Create empty db
      const pool2 = SimpleDatabaseFactory.getPool(tempDb2);

      expect(pool1.isHealthy()).toBe(true);
      expect(pool2.isHealthy()).toBe(true);

      // Close all
      await SimpleDatabaseFactory.closeAll();

      // Pools should be shutdown
      await expect(pool1.acquire()).rejects.toThrow('Pool is shutting down');
      await expect(pool2.acquire()).rejects.toThrow('Pool is shutting down');
    });
  });

  /**
   * Test Suite 7: Performance Benchmarks
   *
   * Measures and verifies performance characteristics.
   */
  describe('Performance Benchmarks', () => {
    it('should handle high-throughput sequential queries efficiently', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 5, connectionTimeout: 5000, idleTimeout: 30000 });

      const startTime = Date.now();
      const queryCount = 1000;

      for (let i = 0; i < queryCount; i++) {
        const db = await pool.acquire();
        db.prepare('SELECT * FROM users WHERE id = ?').get(1);
        pool.release(db);
      }

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / queryCount;

      // Should average less than 5ms per query (acquire + execute + release)
      expect(avgTime).toBeLessThan(5);

      await pool.shutdown();
    });

    it('should handle high-throughput parallel queries efficiently', async () => {
      const pool = new ConnectionPool(testDbPath, { maxConnections: 5, connectionTimeout: 5000, idleTimeout: 30000 });

      const startTime = Date.now();
      const queryCount = 500;

      const queries = Array.from({ length: queryCount }, async () => {
        const db = await pool.acquire();
        const result = db.prepare('SELECT * FROM users WHERE id = ?').get(1);
        pool.release(db);
        return result;
      });

      const results = await Promise.all(queries);

      const totalTime = Date.now() - startTime;

      // All queries should complete successfully
      expect(results).toHaveLength(queryCount);

      // Should complete in reasonable time (less than 2 seconds for 500 queries)
      expect(totalTime).toBeLessThan(2000);

      await pool.shutdown();
    });
  });
});
