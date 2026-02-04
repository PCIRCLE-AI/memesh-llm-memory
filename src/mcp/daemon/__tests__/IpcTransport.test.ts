/**
 * IpcTransport Tests
 *
 * Tests for cross-platform IPC communication:
 * - Path generation (Unix socket vs Windows named pipe)
 * - Server creation and listening
 * - Client connection
 * - Connection timeout handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'net';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { IpcTransport, createIpcTransport } from '../IpcTransport.js';

// Test in a temporary directory
const TEST_DIR = path.join(os.tmpdir(), 'memesh-ipc-test-' + process.pid);

// Mock the PathResolver to use test directory
vi.mock('../../../utils/PathResolver.js', () => ({
  getDataDirectory: () => TEST_DIR,
}));

describe('IpcTransport', () => {
  let transport: IpcTransport;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    transport = new IpcTransport({ socketName: 'test' });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('getPath', () => {
    it('should return Unix socket path on non-Windows', () => {
      if (process.platform !== 'win32') {
        const ipcPath = transport.getPath();
        expect(ipcPath).toBe(path.join(TEST_DIR, 'test.sock'));
      }
    });

    it('should return Windows named pipe path on Windows', () => {
      if (process.platform === 'win32') {
        const ipcPath = transport.getPath();
        const username = os.userInfo().username.replace(/[^a-zA-Z0-9_-]/g, '_');
        expect(ipcPath).toBe(`\\\\.\\pipe\\memesh-test-${username}`);
      }
    });

    it('should use default socket name "daemon"', () => {
      const defaultTransport = new IpcTransport();
      const ipcPath = defaultTransport.getPath();

      if (process.platform !== 'win32') {
        expect(ipcPath).toContain('daemon.sock');
      } else {
        expect(ipcPath).toContain('memesh-daemon-');
      }
    });
  });

  describe('isWindows', () => {
    it('should correctly detect platform', () => {
      expect(transport.isWindows()).toBe(process.platform === 'win32');
    });
  });

  describe('cleanup', () => {
    it('should remove stale socket file on Unix', () => {
      if (process.platform !== 'win32') {
        const socketPath = transport.getPath();

        // Create a fake socket file
        fs.writeFileSync(socketPath, '');
        expect(fs.existsSync(socketPath)).toBe(true);

        // Cleanup should remove it
        transport.cleanup();
        expect(fs.existsSync(socketPath)).toBe(false);
      }
    });

    it('should not throw on Windows', () => {
      if (process.platform === 'win32') {
        expect(() => transport.cleanup()).not.toThrow();
      }
    });
  });

  describe('createServer', () => {
    it('should create a net.Server instance', () => {
      const server = transport.createServer();
      expect(server).toBeInstanceOf(net.Server);
      server.close();
    });
  });

  describe('listen and connect', () => {
    let server: net.Server;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should start server and accept connections', async () => {
      server = transport.createServer();

      // Track connections
      const connections: net.Socket[] = [];
      server.on('connection', (socket) => {
        connections.push(socket);
      });

      // Start listening
      await transport.listen(server);

      // Connect as client
      const client = await transport.connect({ timeout: 2000 });
      expect(client).toBeInstanceOf(net.Socket);

      // Wait a bit for server to receive connection
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(connections.length).toBe(1);

      // Cleanup
      client.destroy();
      connections.forEach((c) => c.destroy());
    });

    it('should handle multiple client connections', async () => {
      server = transport.createServer();

      const connections: net.Socket[] = [];
      server.on('connection', (socket) => {
        connections.push(socket);
      });

      await transport.listen(server);

      // Connect multiple clients
      const clients = await Promise.all([
        transport.connect({ timeout: 2000 }),
        transport.connect({ timeout: 2000 }),
        transport.connect({ timeout: 2000 }),
      ]);

      expect(clients.length).toBe(3);

      // Wait for server to receive connections
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(connections.length).toBe(3);

      // Cleanup
      clients.forEach((c) => c.destroy());
      connections.forEach((c) => c.destroy());
    });

    it('should fail to connect when no server running', async () => {
      await expect(transport.connect({ timeout: 500 })).rejects.toThrow();
    });

    it('should timeout on connection', async () => {
      // Don't start server - connection should timeout
      await expect(transport.connect({ timeout: 100 })).rejects.toThrow();
    });

    it('should send and receive data', async () => {
      server = transport.createServer();

      // Echo server
      server.on('connection', (socket) => {
        socket.on('data', (data) => {
          socket.write(`echo: ${data.toString()}`);
        });
      });

      await transport.listen(server);

      const client = await transport.connect({ timeout: 2000 });

      // Send data and wait for response
      const response = await new Promise<string>((resolve) => {
        client.once('data', (data) => {
          resolve(data.toString());
        });
        client.write('hello');
      });

      expect(response).toBe('echo: hello');

      client.destroy();
    });
  });

  describe('isRunning', () => {
    let server: net.Server;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should return true when server is running', async () => {
      server = transport.createServer();
      await transport.listen(server);

      const isRunning = await transport.isRunning(1000);
      expect(isRunning).toBe(true);
    });

    it('should return false when no server is running', async () => {
      const isRunning = await transport.isRunning(500);
      expect(isRunning).toBe(false);
    });
  });

  describe('ping', () => {
    let server: net.Server;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should return latency when server is running', async () => {
      server = transport.createServer();
      await transport.listen(server);

      const latency = await transport.ping();
      expect(latency).not.toBeNull();
      expect(latency).toBeGreaterThanOrEqual(0);
      expect(latency).toBeLessThan(1000); // Should be fast for local connection
    });

    it('should return null when no server is running', async () => {
      const latency = await transport.ping();
      expect(latency).toBeNull();
    });
  });

  describe('getPathInfo', () => {
    it('should return correct path info', () => {
      const info = transport.getPathInfo();

      expect(info.platform).toBe(process.platform);
      expect(info.type).toBe(process.platform === 'win32' ? 'pipe' : 'socket');
      expect(info.path).toBe(transport.getPath());
    });
  });

  describe('createIpcTransport factory', () => {
    it('should create IpcTransport instance', () => {
      const instance = createIpcTransport({ socketName: 'factory-test' });
      expect(instance).toBeInstanceOf(IpcTransport);
    });
  });

  describe('connection with retry', () => {
    let server: net.Server;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should retry connection on failure', async () => {
      // Start server after a delay
      setTimeout(async () => {
        server = transport.createServer();
        await transport.listen(server);
      }, 200);

      // Connect with retry enabled
      const client = await transport.connect({
        timeout: 500,
        retry: true,
        maxRetries: 3,
        retryDelay: 100,
      });

      expect(client).toBeInstanceOf(net.Socket);
      client.destroy();
    });

    it('should fail after max retries', async () => {
      // Don't start server - all retries should fail
      await expect(
        transport.connect({
          timeout: 100,
          retry: true,
          maxRetries: 2,
          retryDelay: 50,
        })
      ).rejects.toThrow();
    });
  });
});
