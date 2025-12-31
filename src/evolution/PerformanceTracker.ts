/**
 * Performance Tracker - Agent Performance Monitoring
 *
 * Tracks agent execution metrics to identify improvement opportunities
 */

import { logger } from '../utils/logger.js';
import { MinHeap } from '../utils/MinHeap.js';
import type { PerformanceMetrics, EvolutionStats } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../errors/index.js';

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

  constructor(config?: { maxMetricsPerAgent?: number; maxTotalMetrics?: number }) {
    this.maxMetricsPerAgent = config?.maxMetricsPerAgent || 1000;
    this.maxTotalMetrics = config?.maxTotalMetrics || 10000;

    // Initialize min-heap with timestamp comparison (oldest first)
    this.evictionHeap = new MinHeap<HeapEntry>((a, b) => {
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    logger.info('Performance tracker initialized', {
      maxMetricsPerAgent: this.maxMetricsPerAgent,
      maxTotalMetrics: this.maxTotalMetrics,
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

    logger.debug('Performance tracked', {
      agentId: metrics.agentId,
      taskType: metrics.taskType,
      success: metrics.success,
      durationMs: metrics.durationMs,
      cost: metrics.cost,
      qualityScore: metrics.qualityScore,
      totalMetrics: this.totalMetricsCount,
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
   * @param agentId - Agent whose heap entry needs updating
   */
  private updateHeapForAgent(agentId: string): void {
    // Rebuild heap to reflect new oldest metrics
    // TODO: Optimize by tracking heap indices for O(log N) update
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
   * Calculate evolution statistics
   *
   * Analyzes agent performance trends by comparing recent vs historical metrics.
   * Calculates success rate, cost efficiency, and quality score improvements.
   *
   * @param agentId - Agent identifier
   * @param recentWindowMs - Time window in milliseconds for "recent" metrics (default: 7 days)
   * @returns Evolution statistics with historical vs recent trends
   * @throws Error if parameters are invalid
   */
  getEvolutionStats(agentId: string, recentWindowMs: number = 7 * 24 * 60 * 60 * 1000): EvolutionStats {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new ValidationError('agentId must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'getEvolutionStats',
        providedValue: agentId,
        constraint: 'non-empty string',
      });
    }
    if (typeof recentWindowMs !== 'number' || recentWindowMs <= 0) {
      throw new ValidationError('recentWindowMs must be a positive number', {
        component: 'PerformanceTracker',
        method: 'getEvolutionStats',
        providedValue: recentWindowMs,
        constraint: 'recentWindowMs > 0',
      });
    }

    const allMetrics = this.metrics.get(agentId) || [];

    if (allMetrics.length === 0) {
      return {
        agentId,
        totalExecutions: 0,
        successRateTrend: { historical: 0, recent: 0, improvement: 0 },
        costEfficiencyTrend: { historical: 0, recent: 0, improvement: 0 },
        qualityScoreTrend: { historical: 0, recent: 0, improvement: 0 },
        learnedPatterns: 0,
        appliedAdaptations: 0,
        lastLearningDate: new Date(),
      };
    }

    const now = Date.now();
    const recentCutoff = new Date(now - recentWindowMs);

    const recentMetrics = allMetrics.filter(m => m.timestamp >= recentCutoff);
    const historicalMetrics = allMetrics.filter(m => m.timestamp < recentCutoff);

    // Success rate
    const historicalSuccess = historicalMetrics.length > 0
      ? historicalMetrics.filter(m => m.success).length / historicalMetrics.length
      : 0;
    const recentSuccess = recentMetrics.length > 0
      ? recentMetrics.filter(m => m.success).length / recentMetrics.length
      : 0;
    const successImprovement = recentSuccess - historicalSuccess;

    // Cost efficiency (quality / cost)
    const historicalCostEfficiency = historicalMetrics.length > 0
      ? historicalMetrics.reduce((sum, m) => sum + (m.qualityScore / (m.cost || 0.01)), 0) / historicalMetrics.length
      : 0;
    const recentCostEfficiency = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + (m.qualityScore / (m.cost || 0.01)), 0) / recentMetrics.length
      : 0;
    const costEfficiencyImprovement = recentCostEfficiency - historicalCostEfficiency;

    // Quality score
    const historicalQuality = historicalMetrics.length > 0
      ? historicalMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / historicalMetrics.length
      : 0;
    const recentQuality = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / recentMetrics.length
      : 0;
    const qualityImprovement = recentQuality - historicalQuality;

    return {
      agentId,
      totalExecutions: allMetrics.length,
      successRateTrend: {
        historical: historicalSuccess,
        recent: recentSuccess,
        improvement: successImprovement,
      },
      costEfficiencyTrend: {
        historical: historicalCostEfficiency,
        recent: recentCostEfficiency,
        improvement: costEfficiencyImprovement,
      },
      qualityScoreTrend: {
        historical: historicalQuality,
        recent: recentQuality,
        improvement: qualityImprovement,
      },
      learnedPatterns: 0, // Will be set by LearningManager
      appliedAdaptations: 0, // Will be set by AdaptationEngine
      lastLearningDate: allMetrics[allMetrics.length - 1].timestamp,
    };
  }

  /**
   * Get average performance by task type
   *
   * @param agentId - Agent identifier
   * @param taskType - Task type to analyze
   * @returns Average performance statistics
   * @throws Error if parameters are invalid
   */
  getAveragePerformance(agentId: string, taskType: string): {
    avgDuration: number;
    avgCost: number;
    avgQuality: number;
    successRate: number;
    sampleSize: number;
  } {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new ValidationError('agentId must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'compareTaskPerformance',
        providedValue: agentId,
        constraint: 'non-empty string',
      });
    }
    if (!taskType || typeof taskType !== 'string' || taskType.trim() === '') {
      throw new ValidationError('taskType must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'compareTaskPerformance',
        providedValue: taskType,
        constraint: 'non-empty string',
      });
    }

    const metrics = this.getMetrics(agentId, { taskType });

    if (metrics.length === 0) {
      return {
        avgDuration: 0,
        avgCost: 0,
        avgQuality: 0,
        successRate: 0,
        sampleSize: 0,
      };
    }

    const avgDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;
    const avgCost = metrics.reduce((sum, m) => sum + m.cost, 0) / metrics.length;
    const avgQuality = metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;
    const successRate = metrics.filter(m => m.success).length / metrics.length;

    return {
      avgDuration,
      avgCost,
      avgQuality,
      successRate,
      sampleSize: metrics.length,
    };
  }

  /**
   * Identify performance anomalies
   *
   * @param agentId - Agent identifier
   * @param metric - Performance metric to check
   * @returns Anomaly detection result
   * @throws Error if parameters are invalid
   */
  detectAnomalies(agentId: string, metric: PerformanceMetrics): {
    isAnomaly: boolean;
    type?: 'slow' | 'expensive' | 'low-quality' | 'failure';
    severity: 'low' | 'medium' | 'high';
    message: string;
  } {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new ValidationError('agentId must be a non-empty string', {
        component: 'PerformanceTracker',
        method: 'predictOptimalStrategy',
        providedValue: agentId,
        constraint: 'non-empty string',
      });
    }
    if (!metric || typeof metric !== 'object') {
      throw new ValidationError('metric must be a valid PerformanceMetrics object', {
        component: 'PerformanceTracker',
        method: 'predictOptimalStrategy',
        providedValue: metric,
        constraint: 'valid PerformanceMetrics object',
      });
    }

    const avg = this.getAveragePerformance(agentId, metric.taskType);

    if (avg.sampleSize < 10) {
      return { isAnomaly: false, severity: 'low', message: 'Insufficient data' };
    }

    // Check duration
    if (metric.durationMs > avg.avgDuration * 2) {
      return {
        isAnomaly: true,
        type: 'slow',
        severity: metric.durationMs > avg.avgDuration * 3 ? 'high' : 'medium',
        message: `Execution ${metric.durationMs.toFixed(0)}ms vs avg ${avg.avgDuration.toFixed(0)}ms`,
      };
    }

    // Check cost
    if (metric.cost > avg.avgCost * 2) {
      return {
        isAnomaly: true,
        type: 'expensive',
        severity: metric.cost > avg.avgCost * 3 ? 'high' : 'medium',
        message: `Cost $${metric.cost.toFixed(4)} vs avg $${avg.avgCost.toFixed(4)}`,
      };
    }

    // Check quality
    if (metric.qualityScore < avg.avgQuality * 0.7) {
      return {
        isAnomaly: true,
        type: 'low-quality',
        severity: metric.qualityScore < avg.avgQuality * 0.5 ? 'high' : 'medium',
        message: `Quality ${metric.qualityScore.toFixed(2)} vs avg ${avg.avgQuality.toFixed(2)}`,
      };
    }

    // Check failure
    if (!metric.success && avg.successRate > 0.8) {
      return {
        isAnomaly: true,
        type: 'failure',
        severity: 'high',
        message: `Failed execution (${(avg.successRate * 100).toFixed(0)}% success rate)`,
      };
    }

    return { isAnomaly: false, severity: 'low', message: 'Normal performance' };
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
      // TODO: Optimize by tracking heap indices for direct removal
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
