/**
 * Performance Tracker - Simplified
 *
 * Stores and retrieves agent performance metrics.
 * Intelligence (trend analysis, anomaly detection, performance comparison) delegated to LLM via MCP tool descriptions.
 *
 * Features:
 * - Store performance metrics with SQLite persistence
 * - Retrieve metrics with filtering
 * - Memory limit enforcement (per-agent and global)
 * - Basic statistics
 *
 * Removed (delegated to LLM):
 * - Evolution trend analysis (historical vs recent comparison)
 * - Average performance calculation
 * - Anomaly detection
 */

import { logger } from '../utils/logger.js';
import { MinHeap } from '../utils/MinHeap.js';
import type { PerformanceMetrics } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../errors/index.js';
import { PerformanceMetricsRepository } from './storage/repositories/PerformanceMetricsRepository.js';

/**
 * Heap entry for tracking oldest metrics across agents
 */
interface HeapEntry {
  agentId: string;
  timestamp: Date;
}

export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics[]> = new Map(); // agentId -> metrics[]
  private maxMetricsPerAgent: number = 1000;
  private maxTotalMetrics: number = 10000; // Global limit across all agents
  private totalMetricsCount: number = 0;
  // Min-heap for O(log N) eviction of oldest metrics
  private evictionHeap: MinHeap<HeapEntry>;
  // SQLite persistence repository (optional - graceful degradation if not provided)
  private repository?: PerformanceMetricsRepository;

  constructor(config?: {
    maxMetricsPerAgent?: number;
    maxTotalMetrics?: number;
    repository?: PerformanceMetricsRepository;
  }) {
    this.maxMetricsPerAgent = config?.maxMetricsPerAgent || 1000;
    this.maxTotalMetrics = config?.maxTotalMetrics || 10000;
    this.repository = config?.repository;

    // Initialize min-heap with timestamp comparison (oldest first)
    this.evictionHeap = new MinHeap<HeapEntry>((a, b) => {
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // If repository provided, ensure schema and load existing metrics
    if (this.repository) {
      try {
        this.repository.ensureSchema();
        this.loadFromRepository();
        logger.info('Performance tracker initialized with SQLite persistence', {
          maxMetricsPerAgent: this.maxMetricsPerAgent,
          maxTotalMetrics: this.maxTotalMetrics,
          loadedMetrics: this.totalMetricsCount,
        });
      } catch (error) {
        logger.warn('Failed to initialize SQLite persistence, falling back to in-memory only', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.repository = undefined;
      }
    } else {
      logger.info('Performance tracker initialized (in-memory only)', {
        maxMetricsPerAgent: this.maxMetricsPerAgent,
        maxTotalMetrics: this.maxTotalMetrics,
      });
    }
  }

  /**
   * Load metrics from SQLite repository on startup
   */
  private loadFromRepository(): void {
    if (!this.repository) return;

    const agentIds = this.repository.getAgentIds();
    for (const agentId of agentIds) {
      const metrics = this.repository.getByAgentId(agentId, this.maxMetricsPerAgent);
      if (metrics.length > 0) {
        // Sort by timestamp ascending (oldest first)
        metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        this.metrics.set(agentId, metrics);
        this.totalMetricsCount += metrics.length;

        // Add oldest metric to eviction heap
        this.evictionHeap.push({
          agentId,
          timestamp: metrics[0].timestamp,
        });
      }
    }

    logger.debug('Loaded metrics from SQLite', {
      agentCount: agentIds.length,
      totalMetrics: this.totalMetricsCount,
    });
  }

  /**
   * Track agent execution
   *
   * Records performance metrics for an agent execution with automatic ID generation
   * and timestamp. Enforces per-agent and global memory limits with LRU eviction.
   *
   * @param metrics - Performance metrics without executionId and timestamp (auto-generated)
   * @returns Complete performance metrics with generated ID and timestamp
   * @throws Error if required fields are invalid
   */
  track(metrics: Omit<PerformanceMetrics, 'executionId' | 'timestamp'>): PerformanceMetrics {
    // Validate required fields
    if (!metrics.agentId || typeof metrics.agentId !== 'string' || metrics.agentId.trim() === '') {
      throw new ValidationError('agentId must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'recordMetric',
        providedValue: metrics.agentId,
        constraint: 'non-empty string',
      });
    }
    if (!metrics.taskType || typeof metrics.taskType !== 'string' || metrics.taskType.trim() === '') {
      throw new ValidationError('taskType must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'recordMetric',
        providedValue: metrics.taskType,
        constraint: 'non-empty string',
      });
    }
    if (typeof metrics.durationMs !== 'number' || metrics.durationMs < 0) {
      throw new ValidationError('durationMs must be a non-negative number', {
        component: 'PerformanceTracker',
        method: 'recordMetric',
        providedValue: metrics.durationMs,
        constraint: 'durationMs >= 0',
      });
    }
    if (typeof metrics.cost !== 'number' || metrics.cost < 0) {
      throw new ValidationError('cost must be a non-negative number', {
        component: 'PerformanceTracker',
        method: 'recordMetric',
        providedValue: metrics.cost,
        constraint: 'cost >= 0',
      });
    }
    if (typeof metrics.qualityScore !== 'number' || metrics.qualityScore < 0 || metrics.qualityScore > 1) {
      throw new ValidationError('qualityScore must be a number between 0 and 1', {
        component: 'PerformanceTracker',
        method: 'recordMetric',
        providedValue: metrics.qualityScore,
        constraint: '0 <= qualityScore <= 1',
      });
    }
    if (typeof metrics.success !== 'boolean') {
      throw new ValidationError('success must be a boolean', {
        component: 'PerformanceTracker',
        method: 'recordMetric',
        providedValue: metrics.success,
        constraint: 'boolean type',
      });
    }

    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      executionId: uuidv4(),
      timestamp: new Date(),
    };

    // Get or create metrics array for agent
    if (!this.metrics.has(metrics.agentId)) {
      this.metrics.set(metrics.agentId, []);
    }

    const agentMetrics = this.metrics.get(metrics.agentId)!;
    const isFirstMetricForAgent = agentMetrics.length === 0;
    agentMetrics.push(fullMetrics);
    this.totalMetricsCount++;

    // Add to heap if this is the first metric for this agent
    // (heap tracks the oldest metric per agent)
    if (isFirstMetricForAgent) {
      this.evictionHeap.push({
        agentId: metrics.agentId,
        timestamp: fullMetrics.timestamp,
      });
    }

    // Enforce per-agent limit
    if (agentMetrics.length > this.maxMetricsPerAgent) {
      agentMetrics.shift();
      this.totalMetricsCount--;
      // Update heap with new oldest metric for this agent
      this.updateHeapForAgent(metrics.agentId);
    }

    // Enforce global limit (O(log N) eviction using min-heap)
    this.enforceGlobalLimit();

    // Persist to SQLite if repository available
    if (this.repository) {
      try {
        this.repository.save(fullMetrics);
      } catch (error) {
        logger.warn('Failed to persist metric to SQLite', {
          executionId: fullMetrics.executionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.debug('Performance tracked', {
      agentId: metrics.agentId,
      taskType: metrics.taskType,
      success: metrics.success,
      durationMs: metrics.durationMs,
      cost: metrics.cost,
      qualityScore: metrics.qualityScore,
      totalMetrics: this.totalMetricsCount,
      persisted: !!this.repository,
    });

    return fullMetrics;
  }

  /**
   * Enforce global memory limit by evicting oldest metrics
   *
   * Uses LRU (Least Recently Used) eviction strategy with O(log N) min-heap:
   * 1. Extract min from heap to find agent with oldest metric - O(log N)
   * 2. Remove that oldest metric from agent's array - O(1)
   * 3. Update heap with next oldest metric for that agent - O(log N)
   * 4. Repeat until total count is within limit
   *
   * This ensures fair eviction across agents - no single agent monopolizes memory.
   * Time Complexity: O(log N) per eviction, where N = number of agents
   */
  private enforceGlobalLimit(): void {
    while (this.totalMetricsCount > this.maxTotalMetrics) {
      const oldest = this.evictionHeap.pop();

      if (!oldest) {
        // Should never happen (totalMetricsCount > 0 but heap empty)
        logger.error('Unable to enforce global limit: heap is empty');
        break;
      }

      const agentMetrics = this.metrics.get(oldest.agentId);
      if (!agentMetrics || agentMetrics.length === 0) {
        // Stale heap entry (agent was cleared), skip and continue
        continue;
      }

      // Verify heap entry matches actual oldest metric (defensive check)
      const actualOldest = agentMetrics[0];
      if (actualOldest.timestamp.getTime() !== oldest.timestamp.getTime()) {
        // Heap is out of sync, rebuild it
        logger.warn('Heap out of sync, rebuilding', {
          agentId: oldest.agentId,
          heapTimestamp: oldest.timestamp,
          actualTimestamp: actualOldest.timestamp,
        });
        this.rebuildHeap();
        continue;
      }

      // Remove oldest metric from agent's array
      agentMetrics.shift();
      this.totalMetricsCount--;

      // Update heap with next oldest metric for this agent, or remove if empty
      if (agentMetrics.length === 0) {
        this.metrics.delete(oldest.agentId);
      } else {
        // Push updated oldest metric for this agent back into heap
        this.evictionHeap.push({
          agentId: oldest.agentId,
          timestamp: agentMetrics[0].timestamp,
        });
      }

      logger.debug('Evicted oldest metric due to global limit', {
        agentId: oldest.agentId,
        timestamp: oldest.timestamp,
        totalMetrics: this.totalMetricsCount,
        maxTotalMetrics: this.maxTotalMetrics,
      });
    }
  }

  /**
   * Update heap entry for an agent after removing its oldest metric
   *
   * Called when per-agent limit is enforced (shift() removes oldest)
   *
   * Time Complexity: O(N log N) via full heap rebuild
   *
   * Potential Optimization (tracked in issue #7):
   * - Track heap indices in a Map<agentId, heapIndex>
   * - Update to O(log N) by bubbling up/down the affected node
   * - Trade-off: Added complexity vs negligible real-world impact
   *   (typical N < 100 agents, rebuild cost ~1-2ms)
   *
   * Current approach chosen for:
   * - Simpler implementation and maintenance
   * - Minimal performance impact in practice
   * - Easier to reason about and debug
   *
   * @param _agentId - Agent whose heap entry needs updating
   */
  private updateHeapForAgent(_agentId: string): void {
    // Rebuild heap to reflect new oldest metrics
    this.rebuildHeap();
  }

  /**
   * Rebuild the eviction heap from current metrics
   *
   * Time Complexity: O(N log N) where N = number of agents
   * Called when heap becomes out of sync with actual metrics
   */
  private rebuildHeap(): void {
    this.evictionHeap.clear();

    for (const [agentId, agentMetrics] of this.metrics.entries()) {
      if (agentMetrics.length > 0) {
        this.evictionHeap.push({
          agentId,
          timestamp: agentMetrics[0].timestamp,
        });
      }
    }

    logger.debug('Eviction heap rebuilt', {
      heapSize: this.evictionHeap.size,
      totalAgents: this.metrics.size,
    });
  }

  /**
   * Get metrics for an agent
   *
   * @param agentId - Agent identifier
   * @param filter - Optional filters for taskType, time range, and result limit
   * @returns Array of performance metrics matching the filters
   * @throws Error if parameters are invalid
   */
  getMetrics(agentId: string, filter?: {
    taskType?: string;
    since?: Date;
    limit?: number;
  }): PerformanceMetrics[] {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new ValidationError('agentId must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'getMetrics',
        providedValue: agentId,
        constraint: 'non-empty string',
      });
    }
    if (filter?.limit !== undefined && (typeof filter.limit !== 'number' || filter.limit <= 0)) {
      throw new ValidationError('filter.limit must be a positive number', {
        component: 'PerformanceTracker',
        method: 'getMetrics',
        providedValue: filter.limit,
        constraint: 'limit > 0',
      });
    }

    let metrics = this.metrics.get(agentId) || [];

    if (filter) {
      if (filter.taskType) {
        metrics = metrics.filter(m => m.taskType === filter.taskType);
      }

      if (filter.since) {
        metrics = metrics.filter(m => m.timestamp >= filter.since!);
      }

      if (filter.limit) {
        metrics = metrics.slice(-filter.limit);
      }
    }

    return metrics;
  }

  /**
   * Clear metrics for an agent
   *
   * @param agentId - Agent identifier
   * @throws Error if agentId is invalid
   */
  clearMetrics(agentId: string): void {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new ValidationError('agentId must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'clearMetrics',
        providedValue: agentId,
        constraint: 'non-empty string',
      });
    }

    const agentMetrics = this.metrics.get(agentId);
    if (agentMetrics) {
      this.totalMetricsCount -= agentMetrics.length;
      this.metrics.delete(agentId);

      // Rebuild heap to remove this agent's entry
      // Time Complexity: O(N log N)
      // Optimization tracked in issue #7 - see updateHeapForAgent() for analysis
      this.rebuildHeap();

      logger.info('Metrics cleared', {
        agentId,
        clearedCount: agentMetrics.length,
        totalMetrics: this.totalMetricsCount,
      });
    }
  }

  /**
   * Get all tracked agents
   */
  getTrackedAgents(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get total task count across all agents
   * Used for bootstrap eligibility check
   */
  getTotalTaskCount(): number {
    let total = 0;
    for (const metrics of this.metrics.values()) {
      total += metrics.length;
    }
    return total;
  }
}
