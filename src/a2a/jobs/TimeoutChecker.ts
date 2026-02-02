/**
 * Timeout Checker Background Job with Circuit Breaker
 *
 * Periodically checks for timed-out tasks in the MCPTaskDelegator pending queue.
 * Implements circuit breaker pattern for error recovery and graceful degradation.
 *
 * @module a2a/jobs
 */

import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
import { logger } from '../../utils/logger.js';
import { ErrorCodes, formatErrorMessage } from '../errors/index.js';
import { TIME } from '../constants.js';

/**
 * Circuit Breaker States
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, stop checking
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

/**
 * TimeoutChecker Configuration
 */
interface TimeoutCheckerConfig {
  /** Check interval in milliseconds (default: TIME.TIMEOUT_CHECK_INTERVAL_MS = 60,000ms) */
  intervalMs?: number;
  /** Maximum consecutive errors before opening circuit (default: 5) */
  maxConsecutiveErrors?: number;
  /** Circuit breaker cooldown period in milliseconds (default: 300,000ms = 5 minutes) */
  circuitCooldownMs?: number;
  /** Enable alerting mechanism (default: true) */
  enableAlerting?: boolean;
}

/**
 * TimeoutChecker with Circuit Breaker Pattern
 *
 * Implements error recovery and graceful degradation:
 * - Tracks consecutive errors
 * - Opens circuit after max retries
 * - Provides cooldown period before recovery attempt
 * - Alerts on systematic failures
 *
 * Circuit Breaker States:
 * - CLOSED: Normal operation, all checks proceed
 * - OPEN: Too many failures, checks are skipped for cooldown period
 * - HALF_OPEN: Testing recovery after cooldown
 *
 * @example
 * ```typescript
 * const checker = new TimeoutChecker(delegator, {
 *   intervalMs: 60_000,              // Check every 60 seconds
 *   maxConsecutiveErrors: 5,          // Open circuit after 5 consecutive errors
 *   circuitCooldownMs: 300_000,      // 5 minute cooldown before retry
 *   enableAlerting: true              // Enable alerting on systematic failures
 * });
 *
 * checker.start();
 *
 * // Get statistics
 * const stats = checker.getStatistics();
 * console.log(`Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
 *
 * // Manual recovery
 * checker.resetCircuit();
 * ```
 */
export class TimeoutChecker {
  private delegator: MCPTaskDelegator;
  private intervalId: NodeJS.Timeout | null = null;
  private interval: number;

  // Circuit Breaker State
  private circuitState: CircuitState = CircuitState.CLOSED;
  private consecutiveErrors: number = 0;
  private lastErrorTime: number = 0;
  private circuitOpenedAt: number = 0;

  // Configuration
  private readonly maxConsecutiveErrors: number;
  private readonly circuitCooldownMs: number;
  private readonly enableAlerting: boolean;

  // Statistics
  private totalChecks: number = 0;
  private totalErrors: number = 0;
  private lastSuccessfulCheck: number = 0;

  /**
   * Create a new TimeoutChecker with circuit breaker
   *
   * @param delegator - MCPTaskDelegator instance to check for timeouts
   * @param config - Optional configuration for interval, circuit breaker, and alerting
   */
  constructor(delegator: MCPTaskDelegator, config: TimeoutCheckerConfig = {}) {
    this.delegator = delegator;
    this.interval = config.intervalMs || TIME.TIMEOUT_CHECK_INTERVAL_MS;
    this.maxConsecutiveErrors = config.maxConsecutiveErrors || 5;
    this.circuitCooldownMs = config.circuitCooldownMs || 300_000; // 5 minutes
    this.enableAlerting = config.enableAlerting !== false;
  }

  /**
   * Start the timeout checker with the specified interval
   *
   * Resets all statistics and starts the periodic check loop.
   * If already running, logs a warning and returns without restarting.
   *
   * @param intervalMs - Check interval in milliseconds (default: TIME.TIMEOUT_CHECK_INTERVAL_MS = 60,000ms)
   *
   * @example
   * ```typescript
   * // Start with default interval (60 seconds)
   * checker.start();
   *
   * // Start with custom interval (30 seconds)
   * checker.start(30_000);
   * ```
   */
  start(intervalMs: number = TIME.TIMEOUT_CHECK_INTERVAL_MS): void {
    if (this.intervalId) {
      logger.warn('[TimeoutChecker] Already running');
      return;
    }

    this.interval = intervalMs;
    this.resetStatistics();

    this.intervalId = setInterval(async () => {
      await this.checkWithCircuitBreaker();
    }, intervalMs);

    logger.info('[TimeoutChecker] Started', {
      intervalMs,
      maxConsecutiveErrors: this.maxConsecutiveErrors,
      circuitCooldownMs: this.circuitCooldownMs,
    });
  }

  /**
   * Stop the timeout checker
   *
   * Clears the interval timer and logs final statistics.
   * If not running, this method does nothing.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;

      logger.info('[TimeoutChecker] Stopped', {
        statistics: this.getStatistics(),
      });
    }
  }

  /**
   * Check if the timeout checker is currently running
   *
   * @returns true if running, false otherwise
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get the current check interval
   *
   * @returns Interval in milliseconds
   */
  getInterval(): number {
    return this.interval;
  }

  /**
   * Get circuit breaker statistics
   */
  getStatistics(): {
    circuitState: CircuitState;
    consecutiveErrors: number;
    totalChecks: number;
    totalErrors: number;
    errorRate: number;
    lastSuccessfulCheck: number | null;
  } {
    return {
      circuitState: this.circuitState,
      consecutiveErrors: this.consecutiveErrors,
      totalChecks: this.totalChecks,
      totalErrors: this.totalErrors,
      errorRate: this.totalChecks > 0 ? this.totalErrors / this.totalChecks : 0,
      lastSuccessfulCheck: this.lastSuccessfulCheck || null,
    };
  }

  /**
   * Reset circuit breaker to closed state
   * Should only be called manually for recovery
   */
  resetCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.consecutiveErrors = 0;
    this.circuitOpenedAt = 0;

    logger.info('[TimeoutChecker] Circuit manually reset to CLOSED');
  }

  /**
   * Main check loop with circuit breaker logic
   */
  private async checkWithCircuitBreaker(): Promise<void> {
    this.totalChecks++;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.circuitState === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.circuitOpenedAt >= this.circuitCooldownMs) {
        this.circuitState = CircuitState.HALF_OPEN;
        logger.info('[TimeoutChecker] Circuit transitioning to HALF_OPEN for recovery test');
      } else {
        logger.debug('[TimeoutChecker] Circuit is OPEN, skipping check', {
          cooldownRemaining: Math.ceil(
            (this.circuitCooldownMs - (now - this.circuitOpenedAt)) / 1000
          ),
        });
        return;
      }
    }

    try {
      await this.delegator.checkTimeouts();

      // Success - reset error counter
      this.handleSuccess();
    } catch (error) {
      // Error - increment counter and possibly open circuit
      this.handleError(error);
    }
  }

  /**
   * Handle successful check
   */
  private handleSuccess(): void {
    this.lastSuccessfulCheck = Date.now();

    // If circuit was HALF_OPEN, close it (recovery successful)
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.circuitState = CircuitState.CLOSED;
      logger.info('[TimeoutChecker] Circuit recovered - transitioning to CLOSED', {
        previousErrors: this.consecutiveErrors,
      });
    }

    // Reset error counter
    this.consecutiveErrors = 0;

    logger.debug('[TimeoutChecker] Check completed successfully');
  }

  /**
   * Handle check error
   */
  private handleError(error: unknown): void {
    this.totalErrors++;
    this.consecutiveErrors++;
    this.lastErrorTime = Date.now();

    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('[TimeoutChecker] Check failed', {
      error: errorMessage,
      consecutiveErrors: this.consecutiveErrors,
      maxConsecutiveErrors: this.maxConsecutiveErrors,
      circuitState: this.circuitState,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check if we should open the circuit
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    if (this.circuitState === CircuitState.OPEN) {
      return; // Already open
    }

    this.circuitState = CircuitState.OPEN;
    this.circuitOpenedAt = Date.now();

    const alertMessage = formatErrorMessage(
      ErrorCodes.TIMEOUT_CHECKER_CIRCUIT_OPEN,
      this.consecutiveErrors,
      this.maxConsecutiveErrors
    );

    logger.error('[TimeoutChecker] Circuit breaker OPENED', {
      consecutiveErrors: this.consecutiveErrors,
      maxConsecutiveErrors: this.maxConsecutiveErrors,
      cooldownMs: this.circuitCooldownMs,
      statistics: this.getStatistics(),
    });

    // Send alert if enabled
    if (this.enableAlerting) {
      this.sendAlert(alertMessage);
    }
  }

  /**
   * Send alert for systematic failures
   * In Phase 1.0, this logs at ERROR level
   * In future phases, this could integrate with monitoring systems
   */
  private sendAlert(message: string): void {
    logger.error('[TimeoutChecker] ALERT: Systematic failure detected', {
      message,
      statistics: this.getStatistics(),
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with external alerting system (PagerDuty, Slack, etc.)
    // For now, just ensure it's visible in logs
  }

  /**
   * Reset statistics
   */
  private resetStatistics(): void {
    this.totalChecks = 0;
    this.totalErrors = 0;
    this.consecutiveErrors = 0;
    this.lastSuccessfulCheck = 0;
    this.lastErrorTime = 0;
    this.circuitState = CircuitState.CLOSED;
    this.circuitOpenedAt = 0;
  }
}
