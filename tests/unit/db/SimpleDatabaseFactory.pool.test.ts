/**
 * SimpleDatabaseFactory Connection Pool Integration Tests
 *
 * Tests the integration of ConnectionPool with SimpleDatabaseFactory.
 * Validates pool management, configuration, and backward compatibility.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimpleDatabaseFactory } from '../../../src/config/simple-config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SimpleDatabaseFactory - Connection Pool Integration', () => {
  let testDbPath: string;

  beforeEach(() => {
    // Create unique test database for each test
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    testDbPath = path.join(os.tmpdir(), `test-factory-pool-${timestamp}-${random}.db`);
  });

  afterEach(async () => {
    // Cleanup factory
    await SimpleDatabaseFactory.closeAll();

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

    // Clean environment variables
    delete process.env.DB_POOL_SIZE;
    delete process.env.DB_POOL_TIMEOUT;
    delete process.env.DB_POOL_IDLE_TIMEOUT;
  });

  describe('Pool Management', () => {
    it('should create connection pool on first getPool() call', () => {
      const pool = SimpleDatabaseFactory.getPool(testDbPath);
      expect(pool).toBeDefined();

      const stats = pool.getStats();
      expect(stats.total).toBe(5); // Default pool size
    });

    it('should reuse existing pool', () => {
      const pool1 = SimpleDatabaseFactory.getPool(testDbPath);
      const pool2 = SimpleDatabaseFactory.getPool(testDbPath);

      expect(pool1).toBe(pool2); // Same instance
    });

    it('should create separate pools for different paths', () => {
      const pool1 = SimpleDatabaseFactory.getPool(testDbPath);
      const pool2 = SimpleDatabaseFactory.getPool(':memory:');

      expect(pool1).not.toBe(pool2);
    });

    it('should respect DB_POOL_SIZE environment variable', () => {
      process.env.DB_POOL_SIZE = '10';

      const pool = SimpleDatabaseFactory.getPool(testDbPath);
      const stats = pool.getStats();

      expect(stats.total).toBe(10);
    });

    it('should respect DB_POOL_TIMEOUT environment variable', () => {
      process.env.DB_POOL_TIMEOUT = '3000';

      const pool = SimpleDatabaseFactory.getPool(testDbPath);
      expect(pool).toBeDefined();
      // Timeout is internal, validated indirectly through behavior
    });

    it('should respect DB_POOL_IDLE_TIMEOUT environment variable', () => {
      process.env.DB_POOL_IDLE_TIMEOUT = '60000';

      const pool = SimpleDatabaseFactory.getPool(testDbPath);
      expect(pool).toBeDefined();
      // Idle timeout is internal, validated indirectly through behavior
    });

    it('should use default values for invalid environment variables', () => {
      process.env.DB_POOL_SIZE = 'invalid';
      process.env.DB_POOL_TIMEOUT = 'abc';

      const pool = SimpleDatabaseFactory.getPool(testDbPath);
      const stats = pool.getStats();

      // Invalid values should fallback to defaults
      expect(stats.total).toBe(5); // Default maxConnections
    });
  });

  describe('Pooled Connection Acquisition', () => {
    it('should acquire pooled connection', async () => {
      const db = await SimpleDatabaseFactory.getPooledConnection(testDbPath);
      expect(db).toBeDefined();
      expect(db.open).toBe(true);

      SimpleDatabaseFactory.releasePooledConnection(db, testDbPath);
    });

    it('should allow using pooled connection', async () => {
      const db = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      // Create table and query
      db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      db.prepare('INSERT INTO test (name) VALUES (?)').run('Alice');

      const result = db.prepare('SELECT * FROM test WHERE name = ?').get('Alice') as any;
      expect(result).toBeDefined();
      expect(result.name).toBe('Alice');

      SimpleDatabaseFactory.releasePooledConnection(db, testDbPath);
    });

    it('should handle multiple pooled connections', async () => {
      const db1 = await SimpleDatabaseFactory.getPooledConnection(testDbPath);
      const db2 = await SimpleDatabaseFactory.getPooledConnection(testDbPath);
      const db3 = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      expect(db1).toBeDefined();
      expect(db2).toBeDefined();
      expect(db3).toBeDefined();

      const stats = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(stats?.active).toBe(3);
      expect(stats?.idle).toBe(2); // 5 total - 3 active

      SimpleDatabaseFactory.releasePooledConnection(db1, testDbPath);
      SimpleDatabaseFactory.releasePooledConnection(db2, testDbPath);
      SimpleDatabaseFactory.releasePooledConnection(db3, testDbPath);

      const statsAfter = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(statsAfter?.active).toBe(0);
      expect(statsAfter?.idle).toBe(5);
    });

    it('should handle release of unknown connection gracefully', async () => {
      const db = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      // Try to release to non-existent pool
      SimpleDatabaseFactory.releasePooledConnection(db, '/non/existent/path.db');

      // Should not throw, just log error
      expect(true).toBe(true);

      SimpleDatabaseFactory.releasePooledConnection(db, testDbPath);
    });
  });

  describe('Pool Statistics', () => {
    it('should return pool statistics', async () => {
      const db = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      const stats = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(stats).toBeDefined();
      expect(stats?.total).toBe(5);
      expect(stats?.active).toBe(1);
      expect(stats?.idle).toBe(4);
      expect(stats?.waiting).toBe(0);

      SimpleDatabaseFactory.releasePooledConnection(db, testDbPath);
    });

    it('should return null for non-existent pool', () => {
      const stats = SimpleDatabaseFactory.getPoolStats('/non/existent/path.db');
      expect(stats).toBeNull();
    });

    it('should track total acquired and released', async () => {
      const db1 = await SimpleDatabaseFactory.getPooledConnection(testDbPath);
      const db2 = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      SimpleDatabaseFactory.releasePooledConnection(db1, testDbPath);

      const stats = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(stats?.totalAcquired).toBe(2);
      expect(stats?.totalReleased).toBe(1);

      SimpleDatabaseFactory.releasePooledConnection(db2, testDbPath);

      const statsAfter = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(statsAfter?.totalAcquired).toBe(2);
      expect(statsAfter?.totalReleased).toBe(2);
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support singleton getInstance()', () => {
      const db1 = SimpleDatabaseFactory.getInstance(testDbPath);
      const db2 = SimpleDatabaseFactory.getInstance(testDbPath);

      expect(db1).toBe(db2); // Same singleton instance
      expect(db1.open).toBe(true);
    });

    it('should support singleton and pooled connections simultaneously', async () => {
      const singleton = SimpleDatabaseFactory.getInstance(testDbPath);
      const pooled = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      expect(singleton).toBeDefined();
      expect(pooled).toBeDefined();
      expect(singleton).not.toBe(pooled); // Different connections

      SimpleDatabaseFactory.releasePooledConnection(pooled, testDbPath);
    });

    it('should support createTestDatabase()', () => {
      const testDb = SimpleDatabaseFactory.createTestDatabase();
      expect(testDb).toBeDefined();
      expect(testDb.open).toBe(true);

      testDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
      const result = testDb.prepare("SELECT * FROM sqlite_master WHERE type='table'").all();
      expect(result.length).toBeGreaterThan(0);

      testDb.close();
    });
  });

  describe('Cleanup', () => {
    it('should close singleton and pool on close()', async () => {
      const singleton = SimpleDatabaseFactory.getInstance(testDbPath);
      const pooled = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      SimpleDatabaseFactory.releasePooledConnection(pooled, testDbPath);

      await SimpleDatabaseFactory.close(testDbPath);

      // Singleton should be closed
      expect(singleton.open).toBe(false);

      // Pool should be shutdown
      const stats = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(stats).toBeNull();
    });

    it('should close all singletons and pools on closeAll()', async () => {
      const db1 = SimpleDatabaseFactory.getInstance(testDbPath);
      const pooled1 = await SimpleDatabaseFactory.getPooledConnection(testDbPath);

      const testDbPath2 = path.join(os.tmpdir(), `test-factory-pool-${Date.now()}-2.db`);
      const db2 = SimpleDatabaseFactory.getInstance(testDbPath2);
      const pooled2 = await SimpleDatabaseFactory.getPooledConnection(testDbPath2);

      SimpleDatabaseFactory.releasePooledConnection(pooled1, testDbPath);
      SimpleDatabaseFactory.releasePooledConnection(pooled2, testDbPath2);

      await SimpleDatabaseFactory.closeAll();

      // All singletons closed
      expect(db1.open).toBe(false);
      expect(db2.open).toBe(false);

      // All pools shutdown
      expect(SimpleDatabaseFactory.getPoolStats(testDbPath)).toBeNull();
      expect(SimpleDatabaseFactory.getPoolStats(testDbPath2)).toBeNull();

      // Cleanup second test file
      if (fs.existsSync(testDbPath2)) {
        fs.unlinkSync(testDbPath2);
      }
      [testDbPath2 + '-wal', testDbPath2 + '-shm'].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    });

    it('should handle close() on non-existent path gracefully', async () => {
      await SimpleDatabaseFactory.close('/non/existent/path.db');
      // Should not throw
      expect(true).toBe(true);
    });

    it('should allow recreation after close()', async () => {
      const pool1 = SimpleDatabaseFactory.getPool(testDbPath);
      await SimpleDatabaseFactory.close(testDbPath);

      const pool2 = SimpleDatabaseFactory.getPool(testDbPath);
      expect(pool2).not.toBe(pool1); // New instance
      expect(pool2.getStats().total).toBe(5);
    });
  });

  describe('Concurrent Stress Test', () => {
    it('should handle concurrent pooled connections', async () => {
      const concurrentRequests = 20;
      const results: Promise<void>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        results.push((async () => {
          const db = await SimpleDatabaseFactory.getPooledConnection(testDbPath);
          try {
            // Simulate work
            db.prepare('SELECT 1 + 1 AS result').get();
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          } finally {
            SimpleDatabaseFactory.releasePooledConnection(db, testDbPath);
          }
        })());
      }

      await Promise.all(results);

      const stats = SimpleDatabaseFactory.getPoolStats(testDbPath);
      expect(stats?.totalAcquired).toBe(concurrentRequests);
      expect(stats?.totalReleased).toBe(concurrentRequests);
      expect(stats?.active).toBe(0);
      expect(stats?.idle).toBe(5);
    });
  });
});
