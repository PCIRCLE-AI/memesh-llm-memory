/**
 * Performance Tracker - Agent Performance Monitoring
 *
 * Tracks agent execution metrics to identify improvement opportunities
 */

import { logger } from '../utils/logger.js';
import type { PerformanceMetrics, EvolutionStats } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics[]> = new Map(); // agentId -> metrics[]
  private maxMetricsPerAgent: number = 1000;
  private maxTotalMetrics: number = 10000; // Global limit across all agents
  private totalMetricsCount: number = 0;

  constructor(config?: { maxMetricsPerAgent?: number; maxTotalMetrics?: number }) {
    this.maxMetricsPerAgent = config?.maxMetricsPerAgent || 1000;
    this.maxTotalMetrics = config?.maxTotalMetrics || 10000;
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
      throw new Error('agentId must be a non-empty string');
    }
    if (!metrics.taskType || typeof metrics.taskType !== 'string' || metrics.taskType.trim() === '') {
      throw new Error('taskType must be a non-empty string');
    }
    if (typeof metrics.durationMs !== 'number' || metrics.durationMs < 0) {
      throw new Error('durationMs must be a non-negative number');
    }
    if (typeof metrics.cost !== 'number' || metrics.cost < 0) {
      throw new Error('cost must be a non-negative number');
    }
    if (typeof metrics.qualityScore !== 'number' || metrics.qualityScore < 0 || metrics.qualityScore > 1) {
      throw new Error('qualityScore must be a number between 0 and 1');
    }
    if (typeof metrics.success !== 'boolean') {
      throw new Error('success must be a boolean');
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
    agentMetrics.push(fullMetrics);
    this.totalMetricsCount++;

    // Enforce per-agent limit
    if (agentMetrics.length > this.maxMetricsPerAgent) {
      agentMetrics.shift();
      this.totalMetricsCount--;
    }

    // Enforce global limit (LRU eviction across all agents)
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
   * Uses LRU (Least Recently Used) eviction strategy:
   * 1. Scan all agents to find the one with the oldest metric (first in array)
   * 2. Remove that oldest metric (oldest across all agents)
   * 3. Repeat until total count is within limit
   *
   * This ensures fair eviction across agents - no single agent monopolizes memory.
   */
  private enforceGlobalLimit(): void {
    while (this.totalMetricsCount > this.maxTotalMetrics) {
      // Find agent with oldest metric by comparing first (oldest) metric in each agent's array
      let oldestAgentId: string | null = null;
      let oldestTimestamp: Date | null = null;

      for (const [agentId, agentMetrics] of this.metrics.entries()) {
        if (agentMetrics.length > 0) {
          const firstMetric = agentMetrics[0]; // First = oldest (metrics appended to end)
          if (!oldestTimestamp || firstMetric.timestamp < oldestTimestamp) {
            oldestTimestamp = firstMetric.timestamp;
            oldestAgentId = agentId;
          }
        }
      }

      // Remove oldest metric (shift from front of array)
      if (oldestAgentId) {
        const agentMetrics = this.metrics.get(oldestAgentId)!;
        agentMetrics.shift(); // Remove first (oldest) element
        this.totalMetricsCount--;

        // Clean up empty agent entries to free memory
        if (agentMetrics.length === 0) {
          this.metrics.delete(oldestAgentId);
        }

        logger.debug('Evicted oldest metric due to global limit', {
          agentId: oldestAgentId,
          totalMetrics: this.totalMetricsCount,
          maxTotalMetrics: this.maxTotalMetrics,
        });
      } else {
        // Should never happen (totalMetricsCount > 0 but no metrics found)
        // Break to prevent infinite loop
        logger.error('Unable to enforce global limit: no metrics found');
        break;
      }
    }
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
      throw new Error('agentId must be a non-empty string');
    }
    if (filter?.limit !== undefined && (typeof filter.limit !== 'number' || filter.limit <= 0)) {
      throw new Error('filter.limit must be a positive number');
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
      throw new Error('agentId must be a non-empty string');
    }
    if (typeof recentWindowMs !== 'number' || recentWindowMs <= 0) {
      throw new Error('recentWindowMs must be a positive number');
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
      throw new Error('agentId must be a non-empty string');
    }
    if (!taskType || typeof taskType !== 'string' || taskType.trim() === '') {
      throw new Error('taskType must be a non-empty string');
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
      throw new Error('agentId must be a non-empty string');
    }
    if (!metric || typeof metric !== 'object') {
      throw new Error('metric must be a valid PerformanceMetrics object');
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
      throw new Error('agentId must be a non-empty string');
    }

    const agentMetrics = this.metrics.get(agentId);
    if (agentMetrics) {
      this.totalMetricsCount -= agentMetrics.length;
      this.metrics.delete(agentId);
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
