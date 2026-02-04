/**
 * DaemonBootstrap - Daemon Mode Detection and Initialization
 *
 * Determines whether to run as daemon (first instance) or proxy (subsequent instances).
 * Handles the transition between modes and coordinates startup.
 *
 * Flow:
 * 1. Check if daemon is already running (lock file + IPC check)
 * 2. If running and healthy → start as proxy
 * 3. If not running or unhealthy → become daemon
 * 4. If version mismatch → coordinate upgrade
 */

import { DaemonLockManager, type LockInfo } from './DaemonLockManager.js';
import { IpcTransport } from './IpcTransport.js';
import { PROTOCOL_VERSION } from './DaemonProtocol.js';
import { logger } from '../../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default timeout for daemon health check in milliseconds.
 * If daemon doesn't respond within this time, it's considered unhealthy.
 */
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Quick connection test timeout in milliseconds.
 * Used by shouldRunAsProxy() for early daemon detection.
 */
const QUICK_CONNECTION_TEST_TIMEOUT_MS = 2000;

/**
 * Bootstrap mode
 */
export type BootstrapMode = 'daemon' | 'proxy' | 'standalone';

/**
 * Bootstrap result
 */
export interface BootstrapResult {
  mode: BootstrapMode;
  reason: string;
  existingDaemon?: {
    pid: number;
    version: string;
    socketPath: string;
  };
}

/**
 * Bootstrap configuration
 */
export interface DaemonBootstrapConfig {
  /** Current MeMesh version */
  version: string;

  /** Protocol version */
  protocolVersion?: number;

  /** Timeout for daemon health check (ms) */
  healthCheckTimeout?: number;

  /** Force standalone mode (disable daemon) */
  forceStandalone?: boolean;
}

/**
 * Check if daemon mode is disabled via environment variable
 */
export function isDaemonDisabled(): boolean {
  return process.env.MEMESH_DISABLE_DAEMON === '1' ||
         process.env.MEMESH_DISABLE_DAEMON === 'true';
}

/**
 * DaemonBootstrap - Coordinates daemon/proxy startup
 */
export class DaemonBootstrap {
  private config: Required<DaemonBootstrapConfig>;
  private transport: IpcTransport;

  /**
   * Create a new DaemonBootstrap instance.
   *
   * @param config - Bootstrap configuration options
   */
  constructor(config: DaemonBootstrapConfig) {
    this.config = {
      version: config.version,
      protocolVersion: config.protocolVersion ?? PROTOCOL_VERSION,
      healthCheckTimeout: config.healthCheckTimeout ?? DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
      forceStandalone: config.forceStandalone ?? isDaemonDisabled(),
    };

    this.transport = new IpcTransport();
  }

  /**
   * Determine bootstrap mode.
   *
   * Decision tree:
   * 1. Force standalone? → standalone
   * 2. Lock exists and valid? → check daemon health
   * 3. Daemon healthy? → proxy mode
   * 4. Daemon unhealthy? → clear lock, become daemon
   * 5. No lock? → become daemon
   *
   * @returns Bootstrap result indicating mode and reason
   */
  async determineMode(): Promise<BootstrapResult> {
    // Check if daemon mode is disabled
    if (this.config.forceStandalone) {
      logger.info('[DaemonBootstrap] Daemon mode disabled, running standalone');
      return {
        mode: 'standalone',
        reason: 'Daemon mode disabled via MEMESH_DISABLE_DAEMON',
      };
    }

    // Check lock file
    const lockInfo = await DaemonLockManager.readLock();

    if (!lockInfo) {
      // No lock exists → become daemon
      logger.info('[DaemonBootstrap] No existing daemon, becoming daemon');
      return {
        mode: 'daemon',
        reason: 'No existing daemon found',
      };
    }

    // Lock exists, check if PID is alive
    if (!DaemonLockManager.isPidAlive(lockInfo.pid)) {
      // PID dead → stale lock, become daemon
      logger.warn('[DaemonBootstrap] Stale daemon lock detected (PID dead)', {
        stalePid: lockInfo.pid,
      });
      return {
        mode: 'daemon',
        reason: 'Stale daemon lock (PID not alive)',
        existingDaemon: {
          pid: lockInfo.pid,
          version: lockInfo.version,
          socketPath: lockInfo.socketPath,
        },
      };
    }

    // PID alive, check if daemon is actually responding
    const isHealthy = await this.checkDaemonHealth(lockInfo);

    if (!isHealthy) {
      // PID alive but not responding → zombie, become daemon
      logger.warn('[DaemonBootstrap] Daemon not responding (zombie process)', {
        pid: lockInfo.pid,
      });
      return {
        mode: 'daemon',
        reason: 'Daemon process not responding',
        existingDaemon: {
          pid: lockInfo.pid,
          version: lockInfo.version,
          socketPath: lockInfo.socketPath,
        },
      };
    }

    // Daemon is healthy → connect as proxy
    logger.info('[DaemonBootstrap] Healthy daemon found, connecting as proxy', {
      daemonPid: lockInfo.pid,
      daemonVersion: lockInfo.version,
    });

    return {
      mode: 'proxy',
      reason: 'Healthy daemon already running',
      existingDaemon: {
        pid: lockInfo.pid,
        version: lockInfo.version,
        socketPath: lockInfo.socketPath,
      },
    };
  }

  /**
   * Check if daemon is healthy (can accept connections).
   *
   * Performs a ping to the daemon and checks if the response latency
   * is within the configured health check timeout.
   *
   * @param lockInfo - Lock information containing daemon details
   * @returns true if daemon is responding within acceptable latency
   */
  private async checkDaemonHealth(lockInfo: LockInfo): Promise<boolean> {
    try {
      const latency = await this.transport.ping();

      if (latency === null) {
        return false;
      }

      // Check if latency is reasonable (within configured timeout)
      if (latency > this.config.healthCheckTimeout) {
        logger.warn('[DaemonBootstrap] Daemon responding slowly', { latency });
        return false;
      }

      return true;
    } catch (error) {
      logger.debug('[DaemonBootstrap] Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Acquire daemon lock and prepare for daemon mode.
   *
   * Creates a lock file with daemon information including socket path,
   * version, and protocol version.
   *
   * @returns true if lock was successfully acquired, false otherwise
   */
  async acquireDaemonLock(): Promise<boolean> {
    const socketPath = this.transport.getPath();

    const result = await DaemonLockManager.acquireLock({
      socketPath,
      startTime: Date.now(),
      version: this.config.version,
      clientCount: 0,
      protocolVersion: this.config.protocolVersion,
      minClientVersion: this.calculateMinClientVersion(),
    });

    if (!result.success) {
      logger.error('[DaemonBootstrap] Failed to acquire daemon lock', {
        reason: result.reason,
        existingLock: result.existingLock,
      });
      return false;
    }

    return true;
  }

  /**
   * Calculate minimum compatible client version.
   *
   * Rule: same major.minor is compatible (patch differences OK).
   *
   * @returns Minimum compatible version string (e.g., "2.6.0" for version "2.6.5")
   */
  private calculateMinClientVersion(): string {
    const parts = this.config.version.split('.');
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}.0`;
    }
    return this.config.version;
  }

  /**
   * Get IPC transport for proxy connection.
   *
   * @returns The IPC transport instance used by this bootstrap
   */
  getTransport(): IpcTransport {
    return this.transport;
  }

  /**
   * Get current version.
   *
   * @returns The configured MeMesh version string
   */
  getVersion(): string {
    return this.config.version;
  }

  /**
   * Get protocol version.
   *
   * @returns The protocol version number
   */
  getProtocolVersion(): number {
    return this.config.protocolVersion;
  }
}

/**
 * Quick check if we should run as proxy.
 *
 * Useful for early detection without full bootstrap.
 * Performs a quick connection test with a shorter timeout.
 *
 * @returns true if a healthy daemon is already running
 */
export async function shouldRunAsProxy(): Promise<boolean> {
  if (isDaemonDisabled()) {
    return false;
  }

  const lockInfo = await DaemonLockManager.readLock();

  if (!lockInfo) {
    return false;
  }

  if (!DaemonLockManager.isPidAlive(lockInfo.pid)) {
    return false;
  }

  // Quick connection test
  const transport = new IpcTransport();
  return transport.isRunning(QUICK_CONNECTION_TEST_TIMEOUT_MS);
}

/**
 * Create and run bootstrap.
 *
 * Convenience function that creates a DaemonBootstrap instance and
 * determines the appropriate mode.
 *
 * @param config - Bootstrap configuration options
 * @returns Bootstrap result indicating mode and reason
 */
export async function bootstrap(config: DaemonBootstrapConfig): Promise<BootstrapResult> {
  const bootstrapper = new DaemonBootstrap(config);
  return bootstrapper.determineMode();
}
