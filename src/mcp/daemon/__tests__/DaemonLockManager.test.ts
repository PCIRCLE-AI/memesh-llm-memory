/**
 * DaemonLockManager Tests
 *
 * Tests for singleton daemon lock management:
 * - Atomic lock acquisition with temp file + hard link pattern (prevents TOCTOU race)
 * - Stale lock detection with instance ID verification
 * - Lock release
 * - PID existence checking
 * - Race condition prevention
 * - UUID validation for instance IDs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { DaemonLockManager, type LockInfo } from '../DaemonLockManager.js';

// Test in a secure temporary directory created per test run
// Use mkdtemp for secure, unpredictable temp directory creation
let TEST_DIR: string;
let TEST_LOCK_PATH: string;

// Mock the PathResolver to use test directory (dynamic)
vi.mock('../../../utils/PathResolver.js', () => ({
  getDataDirectory: () => TEST_DIR,
}));

describe('DaemonLockManager', () => {
  beforeEach(async () => {
    // Create secure unique test directory using mkdtemp
    // This prevents insecure temporary file vulnerability (predictable paths)
    TEST_DIR = await fsp.mkdtemp(path.join(os.tmpdir(), 'memesh-daemon-test-'));
    TEST_LOCK_PATH = path.join(TEST_DIR, 'daemon.lock');
  });

  afterEach(async () => {
    // Clean up test directory
    if (TEST_DIR) {
      await fsp.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('getLockPath', () => {
    it('should return the correct lock file path', () => {
      const lockPath = DaemonLockManager.getLockPath();
      expect(lockPath).toBe(TEST_LOCK_PATH);
    });
  });

  describe('generateInstanceId', () => {
    it('should generate a unique UUID', () => {
      const id1 = DaemonLockManager.generateInstanceId();
      const id2 = DaemonLockManager.generateInstanceId();

      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidUuid', () => {
    it('should return true for valid UUID v4', () => {
      expect(DaemonLockManager.isValidUuid('12345678-1234-4123-8123-123456789abc')).toBe(true);
      expect(DaemonLockManager.isValidUuid('a1b2c3d4-e5f6-4789-9abc-def012345678')).toBe(true);
      expect(DaemonLockManager.isValidUuid('ABCDEF12-3456-4789-ABCD-EF0123456789')).toBe(true); // uppercase
    });

    it('should return true for generated instanceId', () => {
      const instanceId = DaemonLockManager.generateInstanceId();
      expect(DaemonLockManager.isValidUuid(instanceId)).toBe(true);
    });

    it('should return false for invalid UUID formats', () => {
      expect(DaemonLockManager.isValidUuid('test-instance-id')).toBe(false);
      expect(DaemonLockManager.isValidUuid('not-a-uuid')).toBe(false);
      expect(DaemonLockManager.isValidUuid('')).toBe(false);
      expect(DaemonLockManager.isValidUuid('12345678-1234-1234-1234-123456789abc')).toBe(false); // not v4 (version is 1)
      expect(DaemonLockManager.isValidUuid('12345678-1234-4234-1234-123456789abc')).toBe(false); // variant bits wrong
      expect(DaemonLockManager.isValidUuid('12345678123441238123123456789abc')).toBe(false); // no dashes
      expect(DaemonLockManager.isValidUuid('12345678-1234-4123-8123-123456789ab')).toBe(false); // too short
      expect(DaemonLockManager.isValidUuid('12345678-1234-4123-8123-123456789abcd')).toBe(false); // too long
    });
  });

  describe('readLock', () => {
    it('should return null when no lock file exists', async () => {
      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo).toBeNull();
    });

    it('should read valid lock file', async () => {
      const testLock: LockInfo = {
        pid: 12345,
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 3,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        instanceId: 'test-instance-id',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(testLock, null, 2));

      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo).not.toBeNull();
      expect(lockInfo?.pid).toBe(12345);
      expect(lockInfo?.socketPath).toBe('/test/socket.sock');
      expect(lockInfo?.version).toBe('2.6.0');
      expect(lockInfo?.instanceId).toBe('test-instance-id');
    });

    it('should return null for invalid lock file format', async () => {
      await fsp.writeFile(TEST_LOCK_PATH, 'invalid json');

      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo).toBeNull();
    });

    it('should return null for lock file missing required fields', async () => {
      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify({ foo: 'bar' }));

      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo).toBeNull();
    });
  });

  describe('isPidAlive', () => {
    it('should return true for current process PID', () => {
      const isAlive = DaemonLockManager.isPidAlive(process.pid);
      expect(isAlive).toBe(true);
    });

    it('should return false for non-existent PID', () => {
      // Use a very high PID that's unlikely to exist
      const isAlive = DaemonLockManager.isPidAlive(99999999);
      expect(isAlive).toBe(false);
    });

    it('should return true for PID 1 (init process)', () => {
      // PID 1 should always exist on Unix systems
      if (process.platform !== 'win32') {
        const isAlive = DaemonLockManager.isPidAlive(1);
        expect(isAlive).toBe(true);
      }
    });
  });

  describe('verifyInstance', () => {
    it('should return pid_dead when PID does not exist', async () => {
      const lockInfo: LockInfo = {
        pid: 99999999, // Non-existent PID
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        instanceId: 'test-instance-id',
      };

      const result = await DaemonLockManager.verifyInstance(lockInfo);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('pid_dead');
    });

    it('should return no_instance_id when lock has no instanceId (backwards compatibility)', async () => {
      const lockInfo: LockInfo = {
        pid: process.pid, // Current process (alive)
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        // No instanceId
      };

      const result = await DaemonLockManager.verifyInstance(lockInfo);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('no_instance_id');
    });

    it('should return connection_failed when socket does not exist', async () => {
      const lockInfo: LockInfo = {
        pid: process.pid, // Current process (alive)
        socketPath: '/nonexistent/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        // Use valid UUID format so UUID validation passes and we test socket connection
        instanceId: '12345678-1234-4123-8123-123456789abc',
      };

      const result = await DaemonLockManager.verifyInstance(lockInfo);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('connection_failed');
    });

    it('should return pid_alive_instance_mismatch when instanceId format is invalid', async () => {
      const lockInfo: LockInfo = {
        pid: process.pid, // Current process (alive)
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        instanceId: 'invalid-not-a-uuid', // Invalid UUID format
      };

      const result = await DaemonLockManager.verifyInstance(lockInfo);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('pid_alive_instance_mismatch');
    });
  });

  describe('acquireLock', () => {
    it('should successfully acquire lock when no lock exists', async () => {
      const result = await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      expect(result.success).toBe(true);

      // Verify lock file exists
      const exists = await fsp.access(TEST_LOCK_PATH).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify lock content includes instanceId
      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo?.pid).toBe(process.pid);
      expect(lockInfo?.socketPath).toBe('/test/socket.sock');
      expect(lockInfo?.instanceId).toBeDefined();
      expect(lockInfo?.instanceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should fail to acquire lock when valid lock exists', async () => {
      // Create a lock with current PID (simulating another process)
      const existingLock: LockInfo = {
        pid: process.pid, // Same PID means it's "alive"
        socketPath: '/existing/socket.sock',
        startTime: Date.now(),
        version: '2.5.0',
        clientCount: 1,
        protocolVersion: 1,
        minClientVersion: '2.5.0',
        // No instanceId - backwards compatibility mode trusts PID
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(existingLock, null, 2));

      const result = await DaemonLockManager.acquireLock({
        socketPath: '/new/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('already_locked');
      expect(result.existingLock).toBeDefined();
    });

    it('should clear stale lock (dead PID) and acquire', async () => {
      // Create a lock with non-existent PID (stale)
      const staleLock: LockInfo = {
        pid: 99999999, // Non-existent PID
        socketPath: '/stale/socket.sock',
        startTime: Date.now() - 3600000, // 1 hour ago
        version: '2.5.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.5.0',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(staleLock, null, 2));

      const result = await DaemonLockManager.acquireLock({
        socketPath: '/new/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('stale_lock_cleared');

      // Verify new lock
      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo?.pid).toBe(process.pid);
      expect(lockInfo?.socketPath).toBe('/new/socket.sock');
      expect(lockInfo?.instanceId).toBeDefined();
    });

    it('should include instanceId in acquired lock', async () => {
      const result = await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      expect(result.success).toBe(true);

      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo?.instanceId).toBeDefined();
      expect(typeof lockInfo?.instanceId).toBe('string');
    });
  });

  describe('releaseLock', () => {
    it('should release lock owned by current process', async () => {
      // First acquire the lock
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      const exists1 = await fsp.access(TEST_LOCK_PATH).then(() => true).catch(() => false);
      expect(exists1).toBe(true);

      // Release the lock
      const released = await DaemonLockManager.releaseLock();
      expect(released).toBe(true);

      const exists2 = await fsp.access(TEST_LOCK_PATH).then(() => true).catch(() => false);
      expect(exists2).toBe(false);
    });

    it('should return true when no lock exists', async () => {
      const released = await DaemonLockManager.releaseLock();
      expect(released).toBe(true);
    });

    it('should not release lock owned by another process', async () => {
      // Create a lock with a different PID (simulating another process)
      // We use PID 1 which always exists on Unix
      if (process.platform !== 'win32') {
        const otherLock: LockInfo = {
          pid: 1, // init process - always alive
          socketPath: '/other/socket.sock',
          startTime: Date.now(),
          version: '2.6.0',
          clientCount: 1,
          protocolVersion: 1,
          minClientVersion: '2.6.0',
        };

        await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(otherLock, null, 2));

        const released = await DaemonLockManager.releaseLock();
        expect(released).toBe(false);

        const exists = await fsp.access(TEST_LOCK_PATH).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('updateLock', () => {
    it('should update lock info when we own the lock', async () => {
      // Acquire lock first
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      // Get the original instanceId
      const originalLock = await DaemonLockManager.readLock();
      const originalInstanceId = originalLock?.instanceId;

      // Update client count
      const updated = await DaemonLockManager.updateLock({ clientCount: 5 });
      expect(updated).toBe(true);

      // Verify update
      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo?.clientCount).toBe(5);
      // Ensure instanceId is preserved
      expect(lockInfo?.instanceId).toBe(originalInstanceId);
      expect(lockInfo?.pid).toBe(process.pid);
    });

    it('should fail to update when no lock exists', async () => {
      const updated = await DaemonLockManager.updateLock({ clientCount: 5 });
      expect(updated).toBe(false);
    });

    it('should preserve instanceId during update', async () => {
      // Acquire lock first
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      const lockBefore = await DaemonLockManager.readLock();
      const instanceIdBefore = lockBefore?.instanceId;

      // Update multiple times
      await DaemonLockManager.updateLock({ clientCount: 1 });
      await DaemonLockManager.updateLock({ clientCount: 2 });
      await DaemonLockManager.updateLock({ version: '2.7.0' });

      const lockAfter = await DaemonLockManager.readLock();
      expect(lockAfter?.instanceId).toBe(instanceIdBefore);
      expect(lockAfter?.clientCount).toBe(2);
      expect(lockAfter?.version).toBe('2.7.0');
    });
  });

  describe('isLockValid', () => {
    it('should return false when no lock exists', async () => {
      const isValid = await DaemonLockManager.isLockValid();
      expect(isValid).toBe(false);
    });

    it('should return true when lock exists and PID is alive', async () => {
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      const isValid = await DaemonLockManager.isLockValid();
      expect(isValid).toBe(true);
    });

    it('should return false when lock exists but PID is dead', async () => {
      const staleLock: LockInfo = {
        pid: 99999999, // Non-existent PID
        socketPath: '/stale/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(staleLock, null, 2));

      const isValid = await DaemonLockManager.isLockValid();
      expect(isValid).toBe(false);
    });
  });

  describe('isLockValidStrict', () => {
    it('should return false when no lock exists', async () => {
      const isValid = await DaemonLockManager.isLockValidStrict();
      expect(isValid).toBe(false);
    });

    it('should return false when lock exists but instance verification fails', async () => {
      // Create a lock with valid PID but instance verification will fail
      // (socket doesn't exist)
      const lock: LockInfo = {
        pid: process.pid,
        socketPath: '/nonexistent/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        // Use valid UUID format so we test socket connection failure, not UUID validation
        instanceId: '12345678-1234-4123-8123-123456789abc',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(lock, null, 2));

      const isValid = await DaemonLockManager.isLockValidStrict();
      expect(isValid).toBe(false);
    });

    it('should return true for lock without instanceId (backwards compatibility)', async () => {
      const lock: LockInfo = {
        pid: process.pid,
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        // No instanceId
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(lock, null, 2));

      const isValid = await DaemonLockManager.isLockValidStrict();
      expect(isValid).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when no lock exists', async () => {
      const status = await DaemonLockManager.getStatus();

      expect(status.lockExists).toBe(false);
      expect(status.lockInfo).toBeNull();
      expect(status.isValid).toBe(false);
      expect(status.isPidAlive).toBe(false);
      expect(status.instanceVerification).toBeUndefined();
    });

    it('should return correct status when valid lock exists', async () => {
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 2,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      const status = await DaemonLockManager.getStatus();

      expect(status.lockExists).toBe(true);
      expect(status.lockInfo).not.toBeNull();
      expect(status.isValid).toBe(true);
      expect(status.isPidAlive).toBe(true);
      expect(status.lockPath).toBe(TEST_LOCK_PATH);
      expect(status.instanceVerification).toBeDefined();
    });

    it('should include instance verification result', async () => {
      const lock: LockInfo = {
        pid: 99999999, // Dead PID
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        instanceId: 'test-instance-id',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(lock, null, 2));

      const status = await DaemonLockManager.getStatus();

      expect(status.instanceVerification).toBeDefined();
      expect(status.instanceVerification?.isValid).toBe(false);
      expect(status.instanceVerification?.reason).toBe('pid_dead');
    });
  });

  describe('forceClearLock', () => {
    it('should forcefully clear any lock', async () => {
      // Create a lock
      const lock: LockInfo = {
        pid: 1, // init process
        socketPath: '/any/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(lock, null, 2));

      const exists1 = await fsp.access(TEST_LOCK_PATH).then(() => true).catch(() => false);
      expect(exists1).toBe(true);

      // Force clear
      const cleared = await DaemonLockManager.forceClearLock();
      expect(cleared).toBe(true);

      const exists2 = await fsp.access(TEST_LOCK_PATH).then(() => true).catch(() => false);
      expect(exists2).toBe(false);
    });

    it('should return true when no lock exists', async () => {
      const cleared = await DaemonLockManager.forceClearLock();
      expect(cleared).toBe(true);
    });
  });

  describe('getOwnInstanceId', () => {
    it('should return null when no lock exists', async () => {
      const instanceId = await DaemonLockManager.getOwnInstanceId();
      expect(instanceId).toBeNull();
    });

    it('should return null when lock is owned by another process', async () => {
      const lock: LockInfo = {
        pid: 1, // Different PID
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
        instanceId: 'other-instance-id',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(lock, null, 2));

      const instanceId = await DaemonLockManager.getOwnInstanceId();
      expect(instanceId).toBeNull();
    });

    it('should return instanceId when we own the lock', async () => {
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      const instanceId = await DaemonLockManager.getOwnInstanceId();
      expect(instanceId).toBeDefined();
      expect(instanceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('atomic operations', () => {
    it('should not leave temp files on successful acquisition', async () => {
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      // Check for temp files
      const files = await fsp.readdir(TEST_DIR);
      const tempFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tempFiles).toHaveLength(0);
    });

    it('should not leave temp files on failed acquisition', async () => {
      // Create existing lock
      const existingLock: LockInfo = {
        pid: process.pid,
        socketPath: '/existing/socket.sock',
        startTime: Date.now(),
        version: '2.5.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.5.0',
      };

      await fsp.writeFile(TEST_LOCK_PATH, JSON.stringify(existingLock, null, 2));

      // Try to acquire (should fail)
      await DaemonLockManager.acquireLock({
        socketPath: '/new/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      // Check for temp files
      const files = await fsp.readdir(TEST_DIR);
      const tempFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tempFiles).toHaveLength(0);
    });

    it('should not leave temp files on update', async () => {
      await DaemonLockManager.acquireLock({
        socketPath: '/test/socket.sock',
        startTime: Date.now(),
        version: '2.6.0',
        clientCount: 0,
        protocolVersion: 1,
        minClientVersion: '2.6.0',
      });

      await DaemonLockManager.updateLock({ clientCount: 5 });

      // Check for temp files
      const files = await fsp.readdir(TEST_DIR);
      const tempFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tempFiles).toHaveLength(0);
    });
  });
});
