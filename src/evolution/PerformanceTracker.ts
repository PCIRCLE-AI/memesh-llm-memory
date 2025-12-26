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

  constructor(config?: { maxMetricsPerAgent?: number }) {
    this.maxMetricsPerAgent = config?.maxMetricsPerAgent || 1000;
    logger.info('Performance tracker initialized');
  }

  /**
   * Track agent execution
   */
  track(metrics: Omit<PerformanceMetrics, 'executionId' | 'timestamp'>): PerformanceMetrics {
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

    // Trim if exceeds max
    if (agentMetrics.length > this.maxMetricsPerAgent) {
      agentMetrics.shift();
    }

    logger.debug('Performance tracked', {
      agentId: metrics.agentId,
      taskType: metrics.taskType,
      success: metrics.success,
      durationMs: metrics.durationMs,
      cost: metrics.cost,
      qualityScore: metrics.qualityScore,
    });

    return fullMetrics;
  }

  /**
   * Get metrics for an agent
   */
  getMetrics(agentId: string, filter?: {
    taskType?: string;
    since?: Date;
    limit?: number;
  }): PerformanceMetrics[] {
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
   */
  getEvolutionStats(agentId: string, recentWindowMs: number = 7 * 24 * 60 * 60 * 1000): EvolutionStats {
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
   */
  getAveragePerformance(agentId: string, taskType: string): {
    avgDuration: number;
    avgCost: number;
    avgQuality: number;
    successRate: number;
    sampleSize: number;
  } {
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
   */
  detectAnomalies(agentId: string, metric: PerformanceMetrics): {
    isAnomaly: boolean;
    type?: 'slow' | 'expensive' | 'low-quality' | 'failure';
    severity: 'low' | 'medium' | 'high';
    message: string;
  } {
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
   */
  clearMetrics(agentId: string): void {
    this.metrics.delete(agentId);
    logger.info('Metrics cleared', { agentId });
  }

  /**
   * Get all tracked agents
   */
  getTrackedAgents(): string[] {
    return Array.from(this.metrics.keys());
  }
}
