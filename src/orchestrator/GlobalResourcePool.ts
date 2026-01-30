/**
 * GlobalResourcePool - Global Resource Pool
 *
 * Resource coordination across Orchestrator instances
 * Prevents multiple orchestrators from consuming excessive resources simultaneously
 *
 * Core principles:
 * - Singleton pattern (globally unique instance)
 * - E2E test mutual exclusion (only 1 at a time)
 * - Resource slot management (dynamically adjusted based on system resources)
 * - Automatic deadlock cleanup
 */

import { SystemResourceManager, SystemResourcesConfig } from '../utils/SystemResources.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface ResourceSlot {
  type: 'e2e' | 'build' | 'heavy_compute';
  orchestratorId: string;
  acquiredAt: Date;
  pid: number;
}

export interface GlobalResourcePoolConfig extends SystemResourcesConfig {
  // E2E test configuration
  maxConcurrentE2E?: number;        // Maximum concurrent E2E count (default: 1)
  e2eWaitTimeout?: number;          // E2E wait timeout (ms, default: 5 minutes)

  // Build task configuration
  maxConcurrentBuilds?: number;     // Maximum concurrent build count (default: 2)
  buildWaitTimeout?: number;        // Build wait timeout (ms, default: 10 minutes)

  // Deadlock detection
  staleCheckInterval?: number;      // Deadlock check interval (ms, default: 60 seconds)
  staleLockThreshold?: number;      // Deadlock threshold time (ms, default: 30 minutes)
}

export class GlobalResourcePool {
  private static instance: GlobalResourcePool | null = null;

  private resourceManager: SystemResourceManager;
  private config: Required<GlobalResourcePoolConfig>;

  // Resource slots
  private activeE2E: Map<string, ResourceSlot> = new Map();
  private activeBuilds: Map<string, ResourceSlot> = new Map();

  // ✅ FIX HIGH-3: Mutex for E2E slot acquisition to prevent race conditions
  private e2eMutex: Promise<void> = Promise.resolve();

  // Wait queue
  private e2eWaitQueue: Array<{
    orchestratorId: string;
    resolve: () => void;
    reject: (error: Error) => void;
    queuedAt: Date;
  }> = [];

  // Deadlock detection timer
  private staleCheckTimer: NodeJS.Timeout | null = null;

  private constructor(config: GlobalResourcePoolConfig = {}) {
    this.config = {
      // SystemResourcesConfig
      cpuThreshold: config.cpuThreshold ?? 80,
      memoryThreshold: config.memoryThreshold ?? 85,
      threadStrategy: config.threadStrategy ?? 'balanced',
      minThreads: config.minThreads ?? 1,
      maxThreads: config.maxThreads ?? os.cpus().length,
      e2eMaxConcurrent: config.e2eMaxConcurrent ?? 0,

      // GlobalResourcePoolConfig
      maxConcurrentE2E: config.maxConcurrentE2E ?? 1,
      e2eWaitTimeout: config.e2eWaitTimeout ?? 300000,  // 5 min
      maxConcurrentBuilds: config.maxConcurrentBuilds ?? 2,
      buildWaitTimeout: config.buildWaitTimeout ?? 600000,  // 10 min
      staleCheckInterval: config.staleCheckInterval ?? 60000,  // 1 min
      staleLockThreshold: config.staleLockThreshold ?? 1800000,  // 30 min
    };

    this.resourceManager = new SystemResourceManager(this.config);

    // Start deadlock detection
    this.startStaleCheckTimer();
  }

  /**
   * Get global singleton instance
   */
  static getInstance(config?: GlobalResourcePoolConfig): GlobalResourcePool {
    if (!GlobalResourcePool.instance) {
      GlobalResourcePool.instance = new GlobalResourcePool(config);
    }
    return GlobalResourcePool.instance;
  }

  /**
   * Reset instance (for testing only)
   */
  static resetInstance(): void {
    if (GlobalResourcePool.instance) {
      GlobalResourcePool.instance.cleanup();
      GlobalResourcePool.instance = null;
    }
  }

  /**
   * Request E2E test slot
   *
   * ✅ FIX HIGH-3: Proper mutex implementation to prevent race conditions
   *
   * If other E2E tests are currently running, will wait until:
   * - Other tests complete and release slots
   * - Or timeout
   */
  async acquireE2ESlot(orchestratorId: string): Promise<void> {
    // ✅ FIX HIGH-3: Acquire mutex lock before any checks
    const release = await this.acquireMutex();

    try {
      // Check if already holding slot
      if (this.activeE2E.has(orchestratorId)) {
        logger.warn(`Orchestrator ${orchestratorId} already holds E2E slot`);
        return;
      }

      // Atomic check-and-set within mutex
      if (this.activeE2E.size < this.config.maxConcurrentE2E) {
        // Acquire slot (now truly atomic)
        this.activeE2E.set(orchestratorId, {
          type: 'e2e',
          orchestratorId,
          acquiredAt: new Date(),
          pid: process.pid,
        });

        logger.info(
          `[ResourcePool] E2E slot acquired by ${orchestratorId} (${this.activeE2E.size}/${this.config.maxConcurrentE2E})`
        );
        return;
      }

      // Slots full, join wait queue
      logger.info(
        `[ResourcePool] E2E slot full, ${orchestratorId} waiting... (queue: ${this.e2eWaitQueue.length})`
      );
    } finally {
      // Release mutex before waiting in queue
      release();
    }

    // Wait in queue (outside mutex to allow other operations)
    return new Promise((resolve, reject) => {
      const queuedAt = new Date();
      const timeoutId = setTimeout(() => {
        // Timeout, remove from queue and reject
        const index = this.e2eWaitQueue.findIndex(
          item => item.orchestratorId === orchestratorId
        );
        if (index !== -1) {
          this.e2eWaitQueue.splice(index, 1);
        }

        reject(
          new Error(
            `E2E slot acquisition timeout for ${orchestratorId} after ${this.config.e2eWaitTimeout}ms`
          )
        );
      }, this.config.e2eWaitTimeout);

      this.e2eWaitQueue.push({
        orchestratorId,
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        queuedAt,
      });
    });
  }

  /**
   * ✅ FIX HIGH-3: Promise-based mutex implementation
   *
   * Returns a release function that must be called to release the lock.
   * Uses promise chaining to create a queue of lock acquirers.
   */
  private async acquireMutex(): Promise<() => void> {
    let release: (() => void) | undefined;

    // Create a new promise that will be resolved when this lock is released
    const newMutex = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Wait for previous lock to be released
    const previousMutex = this.e2eMutex;
    this.e2eMutex = previousMutex.then(() => newMutex);

    await previousMutex;

    // Return release function
    return release!;
  }

  /**
   * Release E2E test slot
   */
  releaseE2ESlot(orchestratorId: string): void {
    if (!this.activeE2E.has(orchestratorId)) {
      logger.warn(`Orchestrator ${orchestratorId} does not hold E2E slot`);
      return;
    }

    this.activeE2E.delete(orchestratorId);
    logger.info(
      `[ResourcePool] E2E slot released by ${orchestratorId} (${this.activeE2E.size}/${this.config.maxConcurrentE2E})`
    );

    // Check wait queue
    this.processE2EWaitQueue();
  }

  /**
   * Process E2E wait queue
   */
  private processE2EWaitQueue(): void {
    while (
      this.e2eWaitQueue.length > 0 &&
      this.activeE2E.size < this.config.maxConcurrentE2E
    ) {
      const next = this.e2eWaitQueue.shift();
      if (!next) break;

      // Allocate slot
      this.activeE2E.set(next.orchestratorId, {
        type: 'e2e',
        orchestratorId: next.orchestratorId,
        acquiredAt: new Date(),
        pid: process.pid,
      });

      logger.info(
        `[ResourcePool] E2E slot assigned to ${next.orchestratorId} from queue (waited ${Date.now() - next.queuedAt.getTime()}ms)`
      );

      // Notify waiter
      next.resolve();
    }
  }

  /**
   * Check if system resources allow E2E test execution
   */
  async canRunE2E(count: number = 1): Promise<{
    canRun: boolean;
    reason?: string;
    recommendation?: string;
  }> {
    // Check slots
    const availableSlots = this.config.maxConcurrentE2E - this.activeE2E.size;
    if (count > availableSlots) {
      return {
        canRun: false,
        reason: `Insufficient E2E slots (need ${count}, available ${availableSlots})`,
        recommendation: `Wait for ${count - availableSlots} E2E test(s) to complete`,
      };
    }

    // Check system resources
    return this.resourceManager.canRunE2E(count);
  }

  /**
   * Get current status
   */
  getStatus(): {
    e2e: {
      active: number;
      max: number;
      waiting: number;
      slots: ResourceSlot[];
    };
    builds: {
      active: number;
      max: number;
      slots: ResourceSlot[];
    };
    systemResources?: unknown;
  } {
    return {
      e2e: {
        active: this.activeE2E.size,
        max: this.config.maxConcurrentE2E,
        waiting: this.e2eWaitQueue.length,
        slots: Array.from(this.activeE2E.values()),
      },
      builds: {
        active: this.activeBuilds.size,
        max: this.config.maxConcurrentBuilds,
        slots: Array.from(this.activeBuilds.values()),
      },
    };
  }

  /**
   * Generate status report
   */
  async generateReport(): Promise<string> {
    const status = this.getStatus();
    const resources = await this.resourceManager.getResources();

    let report = '╔═══════════════════════════════════════════════════════════╗\n';
    report += '║         GLOBAL RESOURCE POOL STATUS                     ║\n';
    report += '╠═══════════════════════════════════════════════════════════╣\n';
    report += `║ E2E Tests:       ${status.e2e.active}/${status.e2e.max} active, ${status.e2e.waiting} waiting ${' '.repeat(19)}║\n`;
    report += `║ Build Tasks:     ${status.builds.active}/${status.builds.max} active ${' '.repeat(29)}║\n`;
    report += '╠═══════════════════════════════════════════════════════════╣\n';
    report += `║ CPU Usage:       ${resources.cpuUsage.toFixed(1)}% ${' '.repeat(34)}║\n`;
    report += `║ Memory Usage:    ${resources.memoryUsage.toFixed(1)}% ${' '.repeat(34)}║\n`;
    report += `║ Recommended:     ${resources.recommendedThreads} threads, ${resources.recommendedE2E} E2E ${' '.repeat(20)}║\n`;
    report += '╚═══════════════════════════════════════════════════════════╝\n';

    if (status.e2e.slots.length > 0) {
      report += '\n🔴 Active E2E Tests:\n';
      for (const slot of status.e2e.slots) {
        const duration = Date.now() - slot.acquiredAt.getTime();
        report += `  - ${slot.orchestratorId} (${Math.floor(duration / 1000)}s ago, PID: ${slot.pid})\n`;
      }
    }

    return report;
  }

  /**
   * Deadlock detection
   */
  private async checkStaleLocks(): Promise<void> {
    const now = Date.now();

    // Check E2E slots
    for (const [orchestratorId, slot] of this.activeE2E.entries()) {
      const age = now - slot.acquiredAt.getTime();

      if (age > this.config.staleLockThreshold) {
        logger.warn(
          `[ResourcePool] Stale E2E slot detected: ${orchestratorId} (${Math.floor(age / 1000)}s old)`
        );

        // Check if PID is still alive
        try {
          process.kill(slot.pid, 0);  // Signal 0 only checks, does not send signal
          logger.warn(`  PID ${slot.pid} still alive, keeping lock`);
        } catch (error) {
          // PID is dead, clean up slot
          logger.warn(`  PID ${slot.pid} dead, releasing stale lock`);
          this.activeE2E.delete(orchestratorId);
          this.processE2EWaitQueue();
        }
      }
    }
  }

  /**
   * Start deadlock detection timer
   */
  private startStaleCheckTimer(): void {
    this.staleCheckTimer = setInterval(() => {
      this.checkStaleLocks().catch(error => {
        logger.error('[ResourcePool] Stale check error:', error);
      });
    }, this.config.staleCheckInterval);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }

    // Reject all pending requests
    for (const waiting of this.e2eWaitQueue) {
      waiting.reject(new Error('GlobalResourcePool is shutting down'));
    }
    this.e2eWaitQueue = [];

    this.activeE2E.clear();
    this.activeBuilds.clear();
  }
}

// Export convenience functions
export async function acquireE2ESlot(orchestratorId: string): Promise<void> {
  const pool = GlobalResourcePool.getInstance();
  return pool.acquireE2ESlot(orchestratorId);
}

export function releaseE2ESlot(orchestratorId: string): void {
  const pool = GlobalResourcePool.getInstance();
  pool.releaseE2ESlot(orchestratorId);
}

export async function canRunE2E(count: number = 1): Promise<ReturnType<GlobalResourcePool['canRunE2E']>> {
  const pool = GlobalResourcePool.getInstance();
  return pool.canRunE2E(count);
}
