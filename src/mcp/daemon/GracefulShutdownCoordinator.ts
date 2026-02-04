/**
 * GracefulShutdownCoordinator - Graceful Shutdown Manager for Daemon
 *
 * Coordinates graceful shutdown during daemon upgrades and termination.
 * Tracks in-flight requests and ensures they complete before shutdown,
 * or times out after a configurable duration.
 *
 * Features:
 * - Request tracking with client attribution
 * - Graceful shutdown with wait-for-completion
 * - Timeout-based force shutdown
 * - Upgrade coordination with client notifications
 * - Metrics for monitoring
 */

import {
  MessageType,
  type ShutdownMessage,
  type UpgradePendingMessage,
} from './DaemonProtocol.js';
import { logger } from '../../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types and Interfaces
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Information about an in-flight request
 */
export interface RequestInfo {
  /** Unique request identifier */
  requestId: string;

  /** Client that sent the request */
  clientId: string;

  /** When the request was received */
  startTime: number;
}

/**
 * Reasons for initiating shutdown
 */
export enum ShutdownReason {
  /** Daemon upgrade requested by newer client */
  UPGRADE = 'upgrade',

  /** User-initiated shutdown */
  USER_REQUESTED = 'user_requested',

  /** Idle timeout reached */
  IDLE_TIMEOUT = 'idle_timeout',

  /** Error condition requiring shutdown */
  ERROR = 'error',
}

/**
 * Shutdown notification message type
 */
type ShutdownNotification = {
  type: 'shutdown';
  reason: ShutdownReason;
  gracePeriod: number;
  timestamp: number;
};

/**
 * Upgrade pending notification message type
 */
type UpgradePendingNotification = {
  type: 'upgrade_pending';
  newVersion: string;
  estimatedShutdownTime: number;
  initiatorClientId: string;
  timestamp: number;
};

/**
 * Union type for all notification messages
 */
export type CoordinatorNotification = ShutdownNotification | UpgradePendingNotification;

/**
 * Configuration for graceful shutdown behavior
 */
export interface ShutdownConfig {
  /** Maximum time to wait for pending requests (ms) */
  maxWaitTime: number;

  /** Interval to check for pending request completion (ms) */
  checkInterval: number;

  /** Callback to notify all connected clients */
  notifyClients: (message: CoordinatorNotification) => Promise<void>;
}

/**
 * Metrics about shutdown coordinator state
 */
export interface ShutdownMetrics {
  /** Total requests tracked since startup */
  totalRequestsTracked: number;

  /** Total requests completed */
  totalRequestsCompleted: number;

  /** Current pending request count */
  currentPending: number;

  /** Pending requests by client ID */
  requestsByClient: Record<string, number>;

  /** Whether force shutdown was triggered */
  forceShutdown: boolean;

  /** Request IDs that were force-killed */
  forceKilledRequests: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: ShutdownConfig = {
  maxWaitTime: 30000, // 30 seconds
  checkInterval: 100, // 100ms
  notifyClients: async () => {
    // No-op default
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GracefulShutdownCoordinator Class
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manages graceful shutdown for the daemon.
 *
 * Ensures in-flight requests complete before shutdown, with timeout protection.
 * Coordinates upgrade flow by notifying clients before shutdown.
 *
 * @example
 * ```typescript
 * const coordinator = new GracefulShutdownCoordinator({
 *   maxWaitTime: 30000,
 *   notifyClients: async (msg) => broadcastToClients(msg),
 * });
 *
 * // Track requests
 * coordinator.trackRequest('req-123', 'client-1');
 * // ... process request ...
 * coordinator.completeRequest('req-123');
 *
 * // Initiate graceful shutdown
 * await coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);
 * ```
 */
export class GracefulShutdownCoordinator {
  private readonly config: ShutdownConfig;

  // Request tracking
  private pendingRequests: Map<string, RequestInfo> = new Map();

  // Metrics
  private totalTracked = 0;
  private totalCompleted = 0;
  private forceShutdownTriggered = false;
  private forceKilledRequestIds: string[] = [];

  // Shutdown state
  private shuttingDown = false;
  private pendingUpgrade = false;
  private upgradeVersion: string | null = null;
  private upgradeInitiator: string | null = null;

  // Timer tracking for cleanup
  private waitTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create a new GracefulShutdownCoordinator
   *
   * @param config - Partial configuration (uses defaults for missing values)
   */
  constructor(config: Partial<ShutdownConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Validate checkInterval is at least 10ms to prevent excessive CPU usage
    if (this.config.checkInterval < 10) {
      throw new Error('checkInterval must be at least 10ms');
    }

    logger.debug('GracefulShutdownCoordinator initialized', {
      maxWaitTime: this.config.maxWaitTime,
      checkInterval: this.config.checkInterval,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Request Tracking
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Track a new in-flight request
   *
   * @param requestId - Unique request identifier
   * @param clientId - Client that sent the request
   * @throws Error if shutdown is in progress
   */
  trackRequest(requestId: string, clientId: string): void {
    if (!this.canAcceptRequest()) {
      throw new Error('Cannot accept new requests: shutdown in progress');
    }

    // Ignore duplicate request IDs
    if (this.pendingRequests.has(requestId)) {
      logger.warn('Duplicate request ID ignored', { requestId, clientId });
      return;
    }

    const requestInfo: RequestInfo = {
      requestId,
      clientId,
      startTime: Date.now(),
    };

    this.pendingRequests.set(requestId, requestInfo);
    this.totalTracked++;

    logger.debug('Request tracked', {
      requestId,
      clientId,
      pendingCount: this.pendingRequests.size,
    });
  }

  /**
   * Mark a request as completed
   *
   * @param requestId - Request ID to mark as complete
   */
  completeRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);

    if (!request) {
      logger.debug('Complete called for non-existent request', { requestId });
      return;
    }

    this.pendingRequests.delete(requestId);
    this.totalCompleted++;

    const duration = Date.now() - request.startTime;
    logger.debug('Request completed', {
      requestId,
      clientId: request.clientId,
      durationMs: duration,
      pendingCount: this.pendingRequests.size,
    });
  }

  /**
   * Get list of all pending requests
   *
   * @returns Copy of pending request information
   */
  getPendingRequests(): RequestInfo[] {
    return Array.from(this.pendingRequests.values());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Status Accessors
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Whether shutdown is in progress
   */
  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  /**
   * Whether an upgrade is pending
   */
  get isPendingUpgrade(): boolean {
    return this.pendingUpgrade;
  }

  /**
   * Check if new requests can be accepted.
   *
   * Returns false when:
   * - Shutdown is in progress (shuttingDown is true)
   * - An upgrade is pending (pendingUpgrade is true)
   *
   * Use this method to gate incoming requests before tracking them.
   *
   * @returns true if requests can be accepted, false if daemon is shutting down or upgrading
   *
   * @example
   * ```typescript
   * if (!coordinator.canAcceptRequest()) {
   *   throw new Error('Server is shutting down, please reconnect');
   * }
   * coordinator.trackRequest(requestId, clientId);
   * ```
   */
  canAcceptRequest(): boolean {
    return !this.shuttingDown && !this.pendingUpgrade;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Shutdown Flow
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initiate graceful shutdown
   *
   * Stops accepting new requests, waits for pending requests to complete,
   * and times out after maxWaitTime.
   *
   * @param reason - Why shutdown is being initiated
   * @throws Error if shutdown is already in progress
   */
  async initiateShutdown(reason: ShutdownReason): Promise<void> {
    if (this.shuttingDown) {
      throw new Error('Shutdown already in progress');
    }

    this.shuttingDown = true;

    logger.info('Initiating graceful shutdown', {
      reason,
      pendingRequests: this.pendingRequests.size,
      maxWaitTime: this.config.maxWaitTime,
    });

    // Notify clients about shutdown
    await this.notifyShutdown(reason);

    // Wait for pending requests or timeout
    await this.waitForPendingRequests();

    logger.info('Graceful shutdown complete', {
      reason,
      forceShutdown: this.forceShutdownTriggered,
      forceKilledCount: this.forceKilledRequestIds.length,
    });
  }

  /**
   * Initiate upgrade flow
   *
   * Sends upgrade pending notification to all clients, then initiates shutdown.
   *
   * @param newVersion - Version being upgraded to
   * @param initiatorClientId - Client that initiated the upgrade
   */
  async initiateUpgrade(newVersion: string, initiatorClientId: string): Promise<void> {
    this.pendingUpgrade = true;
    this.upgradeVersion = newVersion;
    this.upgradeInitiator = initiatorClientId;

    logger.info('Initiating upgrade', {
      newVersion,
      initiatorClientId,
      pendingRequests: this.pendingRequests.size,
    });

    // Notify clients about pending upgrade
    await this.notifyUpgradePending(newVersion, initiatorClientId);

    // Proceed with shutdown (using upgrade reason)
    await this.initiateShutdown(ShutdownReason.UPGRADE);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Metrics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current metrics
   *
   * @returns Snapshot of coordinator metrics
   */
  getMetrics(): ShutdownMetrics {
    const requestsByClient: Record<string, number> = {};

    for (const request of this.pendingRequests.values()) {
      requestsByClient[request.clientId] = (requestsByClient[request.clientId] || 0) + 1;
    }

    return {
      totalRequestsTracked: this.totalTracked,
      totalRequestsCompleted: this.totalCompleted,
      currentPending: this.pendingRequests.size,
      requestsByClient,
      forceShutdown: this.forceShutdownTriggered,
      forceKilledRequests: [...this.forceKilledRequestIds],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Wait for all pending requests to complete or timeout
   */
  private async waitForPendingRequests(): Promise<void> {
    const startTime = Date.now();

    return new Promise<void>((resolve) => {
      const checkComplete = (): void => {
        // Clear any previous timeout tracking
        this.waitTimeoutId = null;

        const elapsed = Date.now() - startTime;

        // Check if all requests completed
        if (this.pendingRequests.size === 0) {
          logger.debug('All pending requests completed', { elapsedMs: elapsed });
          resolve();
          return;
        }

        // Check for timeout
        if (elapsed >= this.config.maxWaitTime) {
          this.forceShutdownTriggered = true;
          this.forceKilledRequestIds = Array.from(this.pendingRequests.keys());

          logger.warn('Force shutdown triggered - timeout reached', {
            elapsedMs: elapsed,
            pendingCount: this.pendingRequests.size,
            forceKilledRequests: this.forceKilledRequestIds,
          });

          // Clear pending requests on force shutdown
          this.pendingRequests.clear();
          resolve();
          return;
        }

        // Schedule next check and track the timer ID for cleanup
        this.waitTimeoutId = setTimeout(checkComplete, this.config.checkInterval);
      };

      // Start checking
      checkComplete();
    });
  }

  /**
   * Cancel any pending wait timeout.
   * Call this if you need to abort the shutdown wait early.
   */
  cancelWaitTimeout(): void {
    if (this.waitTimeoutId !== null) {
      clearTimeout(this.waitTimeoutId);
      this.waitTimeoutId = null;
      logger.debug('Wait timeout cancelled');
    }
  }

  /**
   * Notify clients about shutdown
   */
  private async notifyShutdown(reason: ShutdownReason): Promise<void> {
    const message: ShutdownNotification = {
      type: 'shutdown',
      reason,
      gracePeriod: this.config.maxWaitTime,
      timestamp: Date.now(),
    };

    try {
      await this.config.notifyClients(message);
      logger.debug('Shutdown notification sent', { reason });
    } catch (error) {
      logger.error('Failed to send shutdown notification', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue shutdown even if notification fails
    }
  }

  /**
   * Notify clients about pending upgrade
   */
  private async notifyUpgradePending(
    newVersion: string,
    initiatorClientId: string
  ): Promise<void> {
    const message: UpgradePendingNotification = {
      type: 'upgrade_pending',
      newVersion,
      estimatedShutdownTime: this.config.maxWaitTime,
      initiatorClientId,
      timestamp: Date.now(),
    };

    try {
      await this.config.notifyClients(message);
      logger.debug('Upgrade pending notification sent', {
        newVersion,
        initiatorClientId,
      });
    } catch (error) {
      logger.error('Failed to send upgrade pending notification', {
        newVersion,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue upgrade even if notification fails
    }
  }
}
