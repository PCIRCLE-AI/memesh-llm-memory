/**
 * A2A Protocol Metrics Infrastructure
 *
 * Basic metrics instrumentation for A2A protocol operations.
 * Phase 1.0: Simple counter/gauge pattern with console logging.
 * Future: Can be replaced with proper metrics system (Prometheus, StatsD, etc.)
 *
 * @module a2a/metrics
 */

import { logger } from '../../utils/logger.js';

/**
 * Metric types supported
 */
export type MetricType = 'counter' | 'gauge' | 'histogram';

/**
 * Metric value structure
 */
export interface MetricValue {
  /** Metric type */
  type: MetricType;
  /** Current value */
  value: number;
  /** Labels for metric filtering */
  labels: Record<string, string>;
  /** Last update timestamp */
  timestamp: number;
}

/**
 * A2A Metrics Registry
 *
 * Tracks key metrics for A2A protocol operations:
 * - Tasks submitted, completed, failed, timed out
 * - Task execution duration
 * - Queue size and depth
 * - Heartbeat success/failure
 *
 * @example
 * ```typescript
 * const metrics = A2AMetrics.getInstance();
 *
 * // Increment counter
 * metrics.incrementCounter('a2a.tasks.submitted', { agentId: 'agent-1' });
 *
 * // Set gauge
 * metrics.setGauge('a2a.queue.size', 5, { agentId: 'agent-1' });
 *
 * // Record histogram
 * metrics.recordHistogram('a2a.task.duration_ms', 1500, { agentId: 'agent-1', status: 'completed' });
 *
 * // Get metrics snapshot
 * const snapshot = metrics.getSnapshot();
 * ```
 */
export class A2AMetrics {
  private static instance: A2AMetrics | null = null;
  private metrics: Map<string, MetricValue>;
  private enabled: boolean;

  private constructor() {
    this.metrics = new Map();
    this.enabled = process.env.A2A_METRICS_ENABLED !== 'false';

    if (this.enabled) {
      logger.info('[A2A Metrics] Metrics collection enabled');
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): A2AMetrics {
    if (!A2AMetrics.instance) {
      A2AMetrics.instance = new A2AMetrics();
    }
    return A2AMetrics.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    A2AMetrics.instance = null;
  }

  /**
   * Increment a counter metric
   *
   * @param name Metric name (e.g., 'a2a.tasks.submitted')
   * @param labels Optional labels for filtering
   * @param value Value to increment by (default: 1)
   *
   * @example
   * ```typescript
   * metrics.incrementCounter('a2a.tasks.submitted', { agentId: 'agent-1' });
   * metrics.incrementCounter('a2a.tasks.failed', { agentId: 'agent-1', reason: 'timeout' });
   * ```
   */
  incrementCounter(
    name: string,
    labels: Record<string, string> = {},
    value: number = 1
  ): void {
    if (!this.enabled) return;

    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        type: 'counter',
        value,
        labels,
        timestamp: Date.now(),
      });
    }

    logger.debug(`[A2A Metrics] Counter ${name} = ${this.metrics.get(key)?.value}`, labels);
  }

  /**
   * Set a gauge metric (absolute value)
   *
   * @param name Metric name (e.g., 'a2a.queue.size')
   * @param value Absolute value to set
   * @param labels Optional labels for filtering
   *
   * @example
   * ```typescript
   * metrics.setGauge('a2a.queue.size', 5, { agentId: 'agent-1' });
   * metrics.setGauge('a2a.agents.active', 3);
   * ```
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.enabled) return;

    const key = this.getKey(name, labels);
    this.metrics.set(key, {
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });

    logger.debug(`[A2A Metrics] Gauge ${name} = ${value}`, labels);
  }

  /**
   * Record a histogram value (for duration, size, etc.)
   *
   * @param name Metric name (e.g., 'a2a.task.duration_ms')
   * @param value Value to record
   * @param labels Optional labels for filtering
   *
   * @example
   * ```typescript
   * metrics.recordHistogram('a2a.task.duration_ms', 1500, {
   *   agentId: 'agent-1',
   *   status: 'completed'
   * });
   * ```
   */
  recordHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    if (!this.enabled) return;

    // Phase 1.0: Simple histogram = store last value
    // Future: Track min/max/avg/percentiles
    const key = this.getKey(name, labels);
    this.metrics.set(key, {
      type: 'histogram',
      value,
      labels,
      timestamp: Date.now(),
    });

    logger.debug(`[A2A Metrics] Histogram ${name} = ${value}`, labels);
  }

  /**
   * Get current value of a metric
   *
   * @param name Metric name
   * @param labels Optional labels for filtering
   * @returns Current metric value or undefined if not found
   */
  getValue(name: string, labels: Record<string, string> = {}): number | undefined {
    const key = this.getKey(name, labels);
    return this.metrics.get(key)?.value;
  }

  /**
   * Get full snapshot of all metrics
   *
   * @returns Map of all current metrics
   */
  getSnapshot(): Map<string, MetricValue> {
    return new Map(this.metrics);
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics.clear();
    logger.debug('[A2A Metrics] All metrics cleared');
  }

  /**
   * Enable/disable metrics collection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info(`[A2A Metrics] Metrics collection ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Generate unique key for metric + labels
   */
  private getKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return labelStr ? `${name}{${labelStr}}` : name;
  }
}

/**
 * Standard A2A metric names
 */
export const METRIC_NAMES = {
  // Task lifecycle metrics
  TASKS_SUBMITTED: 'a2a.tasks.submitted',
  TASKS_COMPLETED: 'a2a.tasks.completed',
  TASKS_FAILED: 'a2a.tasks.failed',
  TASKS_TIMEOUT: 'a2a.tasks.timeout',
  TASKS_CANCELED: 'a2a.tasks.canceled',

  // Task duration metrics
  TASK_DURATION_MS: 'a2a.task.duration_ms',

  // Queue metrics
  QUEUE_SIZE: 'a2a.queue.size',
  QUEUE_DEPTH: 'a2a.queue.depth',

  // Heartbeat metrics
  HEARTBEAT_SUCCESS: 'a2a.heartbeat.success',
  HEARTBEAT_FAILURE: 'a2a.heartbeat.failure',

  // Agent metrics
  AGENTS_ACTIVE: 'a2a.agents.active',
  AGENTS_STALE: 'a2a.agents.stale',
} as const;
