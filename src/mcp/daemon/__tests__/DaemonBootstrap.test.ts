/**
 * DaemonBootstrap Tests
 *
 * Tests for daemon mode detection and initialization:
 * - Mode determination (daemon/proxy/standalone)
 * - Health checking
 * - Lock acquisition
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import crypto from 'crypto';
import {
  DaemonBootstrap,
  isDaemonDisabled,
  shouldRunAsProxy,
  bootstrap,
  type BootstrapResult,
} from '../DaemonBootstrap.js';
import { DaemonLockManager, type LockInfo } from '../DaemonLockManager.js';
import { IpcTransport } from '../IpcTransport.js';

// Test directory paths - initialized in beforeEach for unique isolation
let TEST_DIR: string;
let TEST_LOCK_PATH: string;
let TEST_SOCKET_PATH: string;

// Mock the PathResolver to use test directory
vi.mock('../../../utils/PathResolver.js', () => ({
  getDataDirectory: () => TEST_DIR,
}));

describe('DaemonBootstrap', () => {
  let mockServer: net.Server | null = null;

  beforeEach(() => {
    // Create unique temporary directory for test isolation using crypto.randomUUID
    TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), `memesh-bootstrap-test-${crypto.randomUUID().slice(0, 8)}-`));
    TEST_LOCK_PATH = path.join(TEST_DIR, 'daemon.lock');
    TEST_SOCKET_PATH = path.join(TEST_DIR, 'daemon.sock');

    // Reset environment
    delete process.env.MEMESH_DISABLE_DAEMON;
  });

  afterEach(async () => {
    // Close mock server if running
    if (mockServer) {
      await new Promise<void>((resolve) => {
        mockServer!.close(() => resolve());
      });
      mockServer = null;
    }

    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  // Helper to create a mock daemon server
  async function startMockDaemon(): Promise<net.Server> {
    const transport = new IpcTransport();
    const server = net.createServer();

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(transport.getPath(), () => resolve());
    });

    return server;
  }

  // Helper to create a lock file
  function createLockFile(overrides: Partial<LockInfo> = {}): LockInfo {
    const lockInfo: LockInfo = {
      pid: process.pid, // Default to current process (alive)
      socketPath: TEST_SOCKET_PATH,
      startTime: Date.now(),
      version: '2.6.0',
      clientCount: 0,
      protocolVersion: 1,
      minClientVersion: '2.6.0',
      ...overrides,
    };

    fs.writeFileSync(TEST_LOCK_PATH, JSON.stringify(lockInfo, null, 2));
    return lockInfo;
  }

  describe('isDaemonDisabled', () => {
    it('should return false by default', () => {
      expect(isDaemonDisabled()).toBe(false);
    });

    it('should return true when MEMESH_DISABLE_DAEMON=1', () => {
      process.env.MEMESH_DISABLE_DAEMON = '1';
      expect(isDaemonDisabled()).toBe(true);
    });

    it('should return true when MEMESH_DISABLE_DAEMON=true', () => {
      process.env.MEMESH_DISABLE_DAEMON = 'true';
      expect(isDaemonDisabled()).toBe(true);
    });

    it('should return false for other values', () => {
      process.env.MEMESH_DISABLE_DAEMON = '0';
      expect(isDaemonDisabled()).toBe(false);

      process.env.MEMESH_DISABLE_DAEMON = 'false';
      expect(isDaemonDisabled()).toBe(false);
    });
  });

  describe('determineMode', () => {
    it('should return standalone when daemon is disabled', async () => {
      process.env.MEMESH_DISABLE_DAEMON = '1';

      const bootstrapper = new DaemonBootstrap({ version: '2.6.0' });
      const result = await bootstrapper.determineMode();

      expect(result.mode).toBe('standalone');
      expect(result.reason).toContain('disabled');
    });

    it('should return daemon mode when no lock exists', async () => {
      const bootstrapper = new DaemonBootstrap({ version: '2.6.0' });
      const result = await bootstrapper.determineMode();

      expect(result.mode).toBe('daemon');
      expect(result.reason).toContain('No existing daemon');
    });

    it('should return daemon mode when lock exists but PID is dead', async () => {
      // Create lock with non-existent PID
      createLockFile({ pid: 99999999 });

      const bootstrapper = new DaemonBootstrap({ version: '2.6.0' });
      const result = await bootstrapper.determineMode();

      expect(result.mode).toBe('daemon');
      expect(result.reason).toContain('Stale');
      expect(result.existingDaemon?.pid).toBe(99999999);
    });

    it('should return daemon mode when lock exists and PID alive but not responding', async () => {
      // Create lock with current PID (alive) but no server running
      createLockFile({ pid: process.pid });

      const bootstrapper = new DaemonBootstrap({
        version: '2.6.0',
        healthCheckTimeout: 500,
      });
      const result = await bootstrapper.determineMode();

      expect(result.mode).toBe('daemon');
      expect(result.reason).toContain('not responding');
    });

    it('should return proxy mode when healthy daemon is running', async () => {
      // Start mock daemon server
      mockServer = await startMockDaemon();

      // Create lock with current PID
      createLockFile({ pid: process.pid });

      const bootstrapper = new DaemonBootstrap({ version: '2.6.0' });
      const result = await bootstrapper.determineMode();

      expect(result.mode).toBe('proxy');
      expect(result.reason).toContain('Healthy daemon');
      expect(result.existingDaemon?.pid).toBe(process.pid);
    });

    it('should handle forceStandalone config option', async () => {
      const bootstrapper = new DaemonBootstrap({
        version: '2.6.0',
        forceStandalone: true,
      });
      const result = await bootstrapper.determineMode();

      expect(result.mode).toBe('standalone');
    });
  });

  describe('acquireDaemonLock', () => {
    it('should acquire lock when none exists', async () => {
      const bootstrapper = new DaemonBootstrap({ version: '2.6.0' });
      const success = await bootstrapper.acquireDaemonLock();

      expect(success).toBe(true);
      expect(fs.existsSync(TEST_LOCK_PATH)).toBe(true);

      // Verify lock content
      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo?.pid).toBe(process.pid);
      expect(lockInfo?.version).toBe('2.6.0');
    });

    it('should fail to acquire lock when valid lock exists', async () => {
      // First acquisition
      const bootstrapper1 = new DaemonBootstrap({ version: '2.6.0' });
      await bootstrapper1.acquireDaemonLock();

      // Read the lock to get the instanceId
      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo).not.toBeNull();

      // Start a mock server that responds to instance verification
      // This simulates an actual daemon running on the socket
      const transport = new IpcTransport();
      mockServer = net.createServer((socket) => {
        socket.on('data', (data) => {
          const message = JSON.parse(data.toString().trim());
          if (message.type === 'verify_instance') {
            // Respond with the correct instance ID to indicate valid daemon
            socket.write(JSON.stringify({ instanceId: lockInfo!.instanceId, verified: true }) + '\n');
          }
        });
      });

      await new Promise<void>((resolve, reject) => {
        mockServer!.once('error', reject);
        mockServer!.listen(transport.getPath(), () => resolve());
      });

      // Second acquisition should fail because daemon is "running"
      const bootstrapper2 = new DaemonBootstrap({ version: '2.6.0' });
      const success = await bootstrapper2.acquireDaemonLock();

      expect(success).toBe(false);
    });

    it('should set correct minClientVersion', async () => {
      const bootstrapper = new DaemonBootstrap({ version: '2.6.5' });
      await bootstrapper.acquireDaemonLock();

      const lockInfo = await DaemonLockManager.readLock();
      expect(lockInfo?.minClientVersion).toBe('2.6.0');
    });
  });

  describe('getters', () => {
    it('should return transport', () => {
      const bootstrapper = new DaemonBootstrap({ version: '2.6.0' });
      const transport = bootstrapper.getTransport();
      expect(transport).toBeInstanceOf(IpcTransport);
    });

    it('should return version', () => {
      const bootstrapper = new DaemonBootstrap({ version: '2.6.0' });
      expect(bootstrapper.getVersion()).toBe('2.6.0');
    });

    it('should return protocol version', () => {
      const bootstrapper = new DaemonBootstrap({
        version: '2.6.0',
        protocolVersion: 2,
      });
      expect(bootstrapper.getProtocolVersion()).toBe(2);
    });
  });

  describe('shouldRunAsProxy', () => {
    it('should return false when daemon disabled', async () => {
      process.env.MEMESH_DISABLE_DAEMON = '1';
      const result = await shouldRunAsProxy();
      expect(result).toBe(false);
    });

    it('should return false when no lock exists', async () => {
      const result = await shouldRunAsProxy();
      expect(result).toBe(false);
    });

    it('should return false when PID is dead', async () => {
      createLockFile({ pid: 99999999 });
      const result = await shouldRunAsProxy();
      expect(result).toBe(false);
    });

    it('should return true when healthy daemon is running', async () => {
      mockServer = await startMockDaemon();
      createLockFile({ pid: process.pid });

      const result = await shouldRunAsProxy();
      expect(result).toBe(true);
    });
  });

  describe('bootstrap helper', () => {
    it('should return bootstrap result', async () => {
      const result = await bootstrap({ version: '2.6.0' });
      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('reason');
    });
  });
});
