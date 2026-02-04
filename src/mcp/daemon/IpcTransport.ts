/**
 * IpcTransport - Cross-Platform IPC Abstraction
 *
 * Provides unified IPC communication using:
 * - Unix Domain Socket on macOS/Linux (~/.memesh/daemon.sock)
 * - Named Pipe on Windows (\\.\pipe\memesh-daemon-{username})
 *
 * Node.js's net module handles the platform differences internally,
 * so we just need to provide the correct path format.
 */

import net from 'net';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getDataDirectory } from '../../utils/PathResolver.js';
import { logger } from '../../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Default connection timeout in milliseconds */
const DEFAULT_CONNECT_TIMEOUT_MS = 5000;

/** Default keepalive initial delay in milliseconds */
const DEFAULT_KEEPALIVE_INITIAL_DELAY_MS = 10000;

/** Default max pending connections for server */
const DEFAULT_SERVER_BACKLOG = 50;

/** Default retry delay in milliseconds */
const DEFAULT_RETRY_DELAY_MS = 1000;

/** Default max retry attempts */
const DEFAULT_MAX_RETRIES = 3;

/** Timeout for stale socket connection test in milliseconds */
const STALE_SOCKET_TEST_TIMEOUT_MS = 500;

/** Timeout for isRunning check in milliseconds */
const IS_RUNNING_DEFAULT_TIMEOUT_MS = 2000;

/** Timeout for ping check in milliseconds */
const PING_DEFAULT_TIMEOUT_MS = 2000;

/**
 * IPC Transport configuration
 */
export interface IpcTransportConfig {
  /** Socket/pipe name (default: 'daemon') */
  socketName?: string;

  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;

  /** Enable keepalive (default: true) */
  keepAlive?: boolean;

  /** Keepalive initial delay in ms (default: 10000) */
  keepAliveInitialDelay?: number;
}

/**
 * Connection options for client connections
 */
export interface ConnectOptions {
  /** Connection timeout override */
  timeout?: number;

  /** Retry on failure */
  retry?: boolean;

  /** Max retry attempts */
  maxRetries?: number;

  /** Retry delay in ms */
  retryDelay?: number;
}

/**
 * Server options for daemon server
 */
export interface ServerOptions {
  /** Max pending connections (default: 50) */
  backlog?: number;

  /** Exclusive bind (default: true) */
  exclusive?: boolean;
}

/**
 * IpcTransport - Unified cross-platform IPC.
 *
 * Provides a consistent API for IPC communication across platforms,
 * handling Unix domain sockets on macOS/Linux and named pipes on Windows.
 *
 * @example
 * ```typescript
 * const transport = new IpcTransport({ socketName: 'daemon' });
 *
 * // As a server (daemon)
 * const server = transport.createServer();
 * await transport.listen(server);
 *
 * // As a client (proxy)
 * const socket = await transport.connect();
 * ```
 */
export class IpcTransport {
  private config: Required<IpcTransportConfig>;

  /**
   * Create a new IpcTransport instance.
   *
   * @param config - Transport configuration options
   */
  constructor(config: IpcTransportConfig = {}) {
    this.config = {
      socketName: config.socketName ?? 'daemon',
      connectTimeout: config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_MS,
      keepAlive: config.keepAlive ?? true,
      keepAliveInitialDelay: config.keepAliveInitialDelay ?? DEFAULT_KEEPALIVE_INITIAL_DELAY_MS,
    };
  }

  /**
   * Get the IPC path for current platform
   *
   * - Unix: ~/.memesh/{socketName}.sock
   * - Windows: \\.\pipe\memesh-{socketName}-{username}
   */
  getPath(): string {
    if (process.platform === 'win32') {
      // Windows Named Pipe
      // Format: \\.\pipe\memesh-{name}-{username}
      // Username is sanitized to remove special characters
      const username = os.userInfo().username.replace(/[^a-zA-Z0-9_-]/g, '_');
      return `\\\\.\\pipe\\memesh-${this.config.socketName}-${username}`;
    } else {
      // Unix Domain Socket
      return path.join(getDataDirectory(), `${this.config.socketName}.sock`);
    }
  }

  /**
   * Check if this is a Windows system.
   *
   * @returns true if running on Windows
   */
  isWindows(): boolean {
    return process.platform === 'win32';
  }

  /**
   * Clean up stale socket file (Unix only).
   *
   * On Unix, socket files persist after process exit.
   * This removes the file unconditionally if it exists.
   *
   * Note: Use cleanupStaleSocket() for safe cleanup that verifies
   * the socket is actually stale before removing.
   */
  cleanup(): void {
    if (this.isWindows()) {
      // Named pipes are automatically cleaned up by Windows
      return;
    }

    const socketPath = this.getPath();

    if (fs.existsSync(socketPath)) {
      try {
        fs.unlinkSync(socketPath);
        logger.debug('[IpcTransport] Cleaned up socket file', { socketPath });
      } catch (error) {
        logger.warn('[IpcTransport] Failed to clean up socket file', {
          socketPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Clean up stale socket file with connection test (Unix only).
   *
   * This method safely removes a socket file only if:
   * 1. The socket file exists
   * 2. Attempting to connect to it fails (no server listening)
   *
   * This prevents accidentally removing a socket that's being used
   * by another daemon process.
   *
   * @returns true if a stale socket was cleaned up, false otherwise
   *
   * @example
   * ```typescript
   * // Call during daemon startup before listening
   * const transport = new IpcTransport();
   * const wasStale = await transport.cleanupStaleSocket();
   * if (wasStale) {
   *   logger.info('Cleaned up stale socket from previous daemon');
   * }
   * ```
   */
  async cleanupStaleSocket(): Promise<boolean> {
    if (this.isWindows()) {
      // Named pipes are automatically cleaned up by Windows
      return false;
    }

    const socketPath = this.getPath();

    // Check if socket file exists
    if (!fs.existsSync(socketPath)) {
      logger.debug('[IpcTransport] No socket file to clean up', { socketPath });
      return false;
    }

    // Try to connect briefly to test if a server is listening
    const isAlive = await this.testSocketConnection(socketPath);

    if (isAlive) {
      // Socket is alive, don't remove it
      logger.debug('[IpcTransport] Socket is alive, not cleaning up', { socketPath });
      return false;
    }

    // Socket exists but is stale, remove it
    try {
      fs.unlinkSync(socketPath);
      logger.info('[IpcTransport] Cleaned up stale socket file', { socketPath });
      return true;
    } catch (error) {
      logger.warn('[IpcTransport] Failed to clean up stale socket file', {
        socketPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Test if a socket has an active server listening.
   *
   * @param socketPath - Path to the socket file
   * @returns true if connection succeeded (server is alive), false otherwise
   */
  private testSocketConnection(socketPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.connect({ path: socketPath });

      const timeoutId = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, STALE_SOCKET_TEST_TIMEOUT_MS);

      socket.once('connect', () => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve(true);
      });

      socket.once('error', () => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Create an IPC server.
   *
   * @param options - Server options including backlog and exclusive settings
   * @returns net.Server instance ready to listen
   */
  createServer(options: ServerOptions = {}): net.Server {
    const server = net.createServer();

    // Apply server options
    server.maxConnections = options.backlog ?? DEFAULT_SERVER_BACKLOG;

    return server;
  }

  /**
   * Start listening on the IPC path.
   *
   * Cleans up any stale socket file before binding (Unix only).
   * Sets restrictive file permissions (0o600) on the socket file after binding (Unix only).
   *
   * @param server - Server instance to start
   * @param options - Server options
   * @returns Promise that resolves when listening
   * @throws Error if IPC path is already in use or binding fails
   */
  async listen(server: net.Server, options: ServerOptions = {}): Promise<void> {
    const ipcPath = this.getPath();

    // Clean up stale socket on Unix before binding (safe - only removes if not in use)
    if (!this.isWindows()) {
      await this.cleanupStaleSocket();
    }

    return new Promise((resolve, reject) => {
      server.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`IPC path already in use: ${ipcPath}`));
        } else {
          reject(error);
        }
      });

      server.once('listening', () => {
        // SECURITY FIX (MAJOR-001): Set socket file permissions to owner read/write only
        // This prevents other users on the system from connecting to the daemon socket
        if (!this.isWindows()) {
          try {
            // 0o600 = owner read/write only (rw-------)
            fs.chmodSync(ipcPath, 0o600);
            logger.debug('[IpcTransport] Socket file permissions set to 0600', { ipcPath });
          } catch (error) {
            // Log warning but don't fail - the server is already listening
            // This could fail if the socket path is not a regular file (edge case)
            logger.warn('[IpcTransport] Failed to set socket file permissions', {
              ipcPath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        logger.info('[IpcTransport] Server listening', { ipcPath });
        resolve();
      });

      server.listen({
        path: ipcPath,
        exclusive: options.exclusive ?? true,
        backlog: options.backlog ?? DEFAULT_SERVER_BACKLOG,
      });
    });
  }

  /**
   * Connect to the daemon server.
   *
   * @param options - Connection options including timeout and retry settings
   * @returns Promise that resolves with the connected socket
   * @throws Error if connection fails after all retries
   */
  connect(options: ConnectOptions = {}): Promise<net.Socket> {
    const timeout = options.timeout ?? this.config.connectTimeout;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS;

    return this.connectWithRetry(timeout, options.retry ? maxRetries : 0, retryDelay);
  }

  /**
   * Internal connect with retry logic.
   *
   * Implements exponential backoff on retries (delay doubles each attempt).
   *
   * @param timeout - Connection timeout in ms
   * @param retriesLeft - Number of retries remaining
   * @param retryDelay - Current retry delay in ms (doubles on each retry)
   * @returns Promise that resolves with the connected socket
   */
  private async connectWithRetry(
    timeout: number,
    retriesLeft: number,
    retryDelay: number
  ): Promise<net.Socket> {
    const ipcPath = this.getPath();

    try {
      return await this.connectOnce(ipcPath, timeout);
    } catch (error) {
      if (retriesLeft > 0) {
        logger.debug('[IpcTransport] Connection failed, retrying...', {
          retriesLeft,
          retryDelay,
        });

        await this.sleep(retryDelay);
        return this.connectWithRetry(timeout, retriesLeft - 1, retryDelay * 2);
      }

      throw error;
    }
  }

  /**
   * Single connection attempt.
   *
   * @param ipcPath - Path to the IPC endpoint
   * @param timeout - Connection timeout in ms
   * @returns Promise that resolves with the connected socket
   * @throws Error if connection fails or times out
   */
  private connectOnce(ipcPath: string, timeout: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = net.connect({ path: ipcPath });

      // Set timeout
      const timeoutId = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      socket.once('connect', () => {
        clearTimeout(timeoutId);

        // Configure socket
        if (this.config.keepAlive) {
          socket.setKeepAlive(true, this.config.keepAliveInitialDelay);
        }

        logger.debug('[IpcTransport] Connected to daemon', { ipcPath });
        resolve(socket);
      });

      socket.once('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeoutId);
        // Explicitly destroy socket before rejecting to ensure proper cleanup
        socket.destroy();

        if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
          reject(new Error(`Daemon not running (${error.code}): ${ipcPath}`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Check if daemon is running and responding.
   *
   * Attempts a quick connection to verify the daemon is accessible.
   *
   * @param timeout - Timeout for connection attempt in ms (default: 2000ms)
   * @returns true if daemon is accessible, false otherwise
   */
  async isRunning(timeout?: number): Promise<boolean> {
    try {
      const socket = await this.connect({ timeout: timeout ?? IS_RUNNING_DEFAULT_TIMEOUT_MS });
      socket.destroy();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ping daemon and measure latency.
   *
   * Measures the time to establish a connection to the daemon.
   *
   * @returns Latency in milliseconds, or null if daemon is not running
   */
  async ping(): Promise<number | null> {
    const startTime = Date.now();

    try {
      const socket = await this.connect({ timeout: PING_DEFAULT_TIMEOUT_MS });
      const latency = Date.now() - startTime;
      socket.destroy();
      return latency;
    } catch {
      return null;
    }
  }

  /**
   * Get IPC path info for diagnostics.
   *
   * @returns Object containing path, platform, type, and existence info
   */
  getPathInfo(): {
    path: string;
    platform: string;
    type: 'socket' | 'pipe';
    exists: boolean;
  } {
    const ipcPath = this.getPath();

    return {
      path: ipcPath,
      platform: process.platform,
      type: this.isWindows() ? 'pipe' : 'socket',
      exists: this.isWindows() ? true : fs.existsSync(ipcPath), // Named pipes don't have file representation
    };
  }

  /**
   * Sleep helper for retry delays.
   *
   * @param ms - Duration to sleep in milliseconds
   * @returns Promise that resolves after the specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a default IPC transport instance.
 *
 * @param config - Optional transport configuration
 * @returns New IpcTransport instance
 */
export function createIpcTransport(config?: IpcTransportConfig): IpcTransport {
  return new IpcTransport(config);
}
