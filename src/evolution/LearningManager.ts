/**
 * Learning Manager - Pattern Recognition and Knowledge Extraction
 *
 * Analyzes agent performance to identify successful patterns and anti-patterns
 *
 * Phase 2: Enhanced with context-aware learning, multi-objective optimization, and explainability
 */

import { logger } from '../utils/logger.js';
import type { PerformanceTracker } from './PerformanceTracker.js';
import type {
  PerformanceMetrics,
  LearnedPattern,
  AgentFeedback,
  ContextualPattern,
  PatternExplanation,
  OptimizationCandidate,
  OptimizationObjectives,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { ContextMatcher } from './ContextMatcher.js';
import { MultiObjectiveOptimizer } from './MultiObjectiveOptimizer.js';
import { PatternExplainer } from './PatternExplainer.js';

export interface LearningConfig {
  /**
   * Minimum observations before creating a pattern
   */
  minObservations: number;

  /**
   * Minimum confidence threshold (0-1)
   */
  minConfidence: number;

  /**
   * Success rate threshold for positive patterns
   */
  successRateThreshold: number;

  /**
   * Failure rate threshold for anti-patterns
   */
  failureRateThreshold: number;

  /**
   * Maximum patterns to store per agent
   */
  maxPatternsPerAgent: number;
}

export class LearningManager {
  private patterns: Map<string, LearnedPattern[]> = new Map(); // agentId -> patterns[]
  private feedback: Map<string, AgentFeedback[]> = new Map(); // agentId -> feedback[]
  private config: LearningConfig;
  private performanceTracker: PerformanceTracker;

  // Phase 2: Advanced learning components
  private contextMatcher: ContextMatcher;
  private multiObjectiveOptimizer: MultiObjectiveOptimizer;
  private patternExplainer: PatternExplainer;
  private contextualPatterns: Map<string, ContextualPattern[]> = new Map(); // agentId -> contextual patterns[]

  constructor(
    performanceTracker: PerformanceTracker,
    config?: Partial<LearningConfig>
  ) {
    this.performanceTracker = performanceTracker;
    this.config = {
      minObservations: config?.minObservations || 10,
      minConfidence: config?.minConfidence || 0.7,
      successRateThreshold: config?.successRateThreshold || 0.8,
      failureRateThreshold: config?.failureRateThreshold || 0.3,
      maxPatternsPerAgent: config?.maxPatternsPerAgent || 100,
    };

    // Phase 2: Initialize advanced learning components
    this.contextMatcher = new ContextMatcher();
    this.multiObjectiveOptimizer = new MultiObjectiveOptimizer();
    this.patternExplainer = new PatternExplainer();

    logger.info('Learning manager initialized', this.config);
  }

  /**
   * Analyze performance metrics to extract patterns
   */
  analyzePatterns(agentId: string): LearnedPattern[] {
    const metrics = this.performanceTracker.getMetrics(agentId);

    if (metrics.length < this.config.minObservations) {
      logger.debug('Insufficient data for pattern analysis', {
        agentId,
        count: metrics.length,
        required: this.config.minObservations,
      });
      return [];
    }

    const newPatterns: LearnedPattern[] = [];

    // Group metrics by task type
    const metricsByTask = this.groupByTaskType(metrics);

    for (const [taskType, taskMetrics] of metricsByTask.entries()) {
      // Success patterns
      const successPatterns = this.extractSuccessPatterns(agentId, taskType, taskMetrics);
      newPatterns.push(...successPatterns);

      // Failure patterns (anti-patterns)
      const failurePatterns = this.extractFailurePatterns(agentId, taskType, taskMetrics);
      newPatterns.push(...failurePatterns);

      // Optimization patterns
      const optimizationPatterns = this.extractOptimizationPatterns(
        agentId,
        taskType,
        taskMetrics
      );
      newPatterns.push(...optimizationPatterns);
    }

    // Store new patterns
    this.storePatterns(agentId, newPatterns);

    logger.info('Pattern analysis complete', {
      agentId,
      newPatterns: newPatterns.length,
      totalPatterns: this.patterns.get(agentId)?.length || 0,
    });

    return newPatterns;
  }

  /**
   * Extract successful execution patterns
   */
  private extractSuccessPatterns(
    agentId: string,
    taskType: string,
    metrics: PerformanceMetrics[]
  ): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    const successfulMetrics = metrics.filter(m => m.success);
    const successRate = successfulMetrics.length / metrics.length;

    if (successRate < this.config.successRateThreshold) {
      return patterns; // Not enough success to create pattern
    }

    // Pattern 1: Consistent high quality (works with uniform data)
    const consistentHighQuality = successfulMetrics.filter(
      m => m.qualityScore >= 0.8
    );

    if (consistentHighQuality.length >= this.config.minObservations) {
      const avgCost = consistentHighQuality.reduce((sum, m) => sum + m.cost, 0) / consistentHighQuality.length;

      patterns.push({
        id: uuidv4(),
        type: 'success',
        agentId,
        taskType,
        description: `Consistent high quality (≥0.8) for ${taskType}`,
        conditions: {
          taskComplexity: this.inferComplexity(consistentHighQuality),
        },
        action: {
          type: 'adjust_prompt',
          parameters: {
            strategy: 'quality-focused',
            focusAreas: ['accuracy', 'consistency'],
          },
        },
        confidence: this.calculateConfidence(consistentHighQuality.length, metrics.length),
        observationCount: consistentHighQuality.length,
        successRate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Pattern 2: Cost efficiency (only if there's variation in cost)
    const medianCost = this.getMedianCost(metrics);
    const costVariation = metrics.some(m => Math.abs(m.cost - medianCost) > medianCost * 0.1);

    if (costVariation) {
      const highQualityLowCost = successfulMetrics.filter(
        m => m.qualityScore >= 0.8 && m.cost <= medianCost
      );

      if (highQualityLowCost.length >= this.config.minObservations) {
        patterns.push({
          id: uuidv4(),
          type: 'success',
          agentId,
          taskType,
          description: `High quality (≥0.8) with cost-efficient execution for ${taskType}`,
          conditions: {
            taskComplexity: this.inferComplexity(highQualityLowCost),
          },
          action: {
            type: 'adjust_prompt',
            parameters: {
              strategy: 'efficient',
              focusAreas: ['quality', 'cost-optimization'],
            },
          },
          confidence: this.calculateConfidence(highQualityLowCost.length, metrics.length),
          observationCount: highQualityLowCost.length,
          successRate,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * Extract failure patterns (anti-patterns)
   */
  private extractFailurePatterns(
    agentId: string,
    taskType: string,
    metrics: PerformanceMetrics[]
  ): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    const failedMetrics = metrics.filter(m => !m.success);
    const failureRate = failedMetrics.length / metrics.length;

    if (failureRate < this.config.failureRateThreshold) {
      return patterns; // Not enough failures to create anti-pattern
    }

    // Anti-pattern: Timeout failures
    const timeoutFailures = failedMetrics.filter(
      m => m.durationMs > this.getP95Duration(metrics)
    );

    if (timeoutFailures.length >= this.config.minObservations / 2) {
      patterns.push({
        id: uuidv4(),
        type: 'anti-pattern',
        agentId,
        taskType,
        description: `Timeout failures (P95 duration) for ${taskType}`,
        conditions: {
          taskComplexity: this.inferComplexity(timeoutFailures),
        },
        action: {
          type: 'modify_timeout',
          parameters: {
            timeoutMs: Math.round(this.getP95Duration(metrics) * 1.5),
          },
        },
        confidence: this.calculateConfidence(timeoutFailures.length, failedMetrics.length),
        observationCount: timeoutFailures.length,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Anti-pattern: Low quality output
    const lowQualityMetrics = metrics.filter(
      m => m.success && m.qualityScore < 0.5
    );

    if (lowQualityMetrics.length >= this.config.minObservations / 2) {
      patterns.push({
        id: uuidv4(),
        type: 'anti-pattern',
        agentId,
        taskType,
        description: `Low quality output (<0.5) for ${taskType}`,
        conditions: {
          taskComplexity: this.inferComplexity(lowQualityMetrics),
        },
        action: {
          type: 'adjust_prompt',
          parameters: {
            strategy: 'quality-focused',
            additionalInstructions: 'Prioritize output quality over speed',
          },
        },
        confidence: this.calculateConfidence(lowQualityMetrics.length, metrics.length),
        observationCount: lowQualityMetrics.length,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return patterns;
  }

  /**
   * Extract optimization opportunities
   */
  private extractOptimizationPatterns(
    agentId: string,
    taskType: string,
    metrics: PerformanceMetrics[]
  ): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Opportunity: Cost optimization without quality loss
    const successfulMetrics = metrics.filter(m => m.success && m.qualityScore >= 0.7);
    if (successfulMetrics.length >= this.config.minObservations) {
      const avgCost = successfulMetrics.reduce((sum, m) => sum + m.cost, 0) / successfulMetrics.length;
      const lowCostHighQuality = successfulMetrics.filter(
        m => m.cost < avgCost * 0.8 && m.qualityScore >= 0.8
      );

      if (lowCostHighQuality.length >= this.config.minObservations / 2) {
        patterns.push({
          id: uuidv4(),
          type: 'optimization',
          agentId,
          taskType,
          description: `Cost optimization opportunity: 20% cost reduction with quality ≥0.8 for ${taskType}`,
          conditions: {
            taskComplexity: this.inferComplexity(lowCostHighQuality),
          },
          action: {
            type: 'change_model',
            parameters: {
              targetCostReduction: 0.2,
              minQualityScore: 0.8,
            },
          },
          confidence: this.calculateConfidence(lowCostHighQuality.length, successfulMetrics.length),
          observationCount: lowCostHighQuality.length,
          successRate: lowCostHighQuality.length / successfulMetrics.length,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * Add user feedback
   */
  addFeedback(feedback: Omit<AgentFeedback, 'id' | 'timestamp'>): AgentFeedback {
    const fullFeedback: AgentFeedback = {
      ...feedback,
      id: uuidv4(),
      timestamp: new Date(),
    };

    if (!this.feedback.has(feedback.agentId)) {
      this.feedback.set(feedback.agentId, []);
    }

    this.feedback.get(feedback.agentId)!.push(fullFeedback);

    logger.info('Feedback recorded', {
      agentId: feedback.agentId,
      type: feedback.type,
      rating: feedback.rating,
    });

    return fullFeedback;
  }

  /**
   * Get patterns for an agent
   */
  getPatterns(
    agentId: string,
    filter?: {
      type?: LearnedPattern['type'];
      taskType?: string;
      minConfidence?: number;
    }
  ): LearnedPattern[] {
    let patterns = this.patterns.get(agentId) || [];

    if (filter) {
      if (filter.type) {
        patterns = patterns.filter(p => p.type === filter.type);
      }
      if (filter.taskType) {
        patterns = patterns.filter(p => p.taskType === filter.taskType);
      }
      if (filter.minConfidence !== undefined) {
        patterns = patterns.filter(p => p.confidence >= filter.minConfidence!);
      }
    }

    return patterns;
  }

  /**
   * Get recommendations based on patterns
   */
  getRecommendations(
    agentId: string,
    taskType: string,
    taskComplexity?: 'low' | 'medium' | 'high'
  ): LearnedPattern[] {
    const patterns = this.getPatterns(agentId, {
      taskType,
      minConfidence: this.config.minConfidence,
    });

    // Filter by complexity if provided
    const filtered = taskComplexity
      ? patterns.filter(p => p.conditions.taskComplexity === taskComplexity)
      : patterns;

    // Sort by confidence and success rate
    return filtered.sort((a, b) => {
      const scoreA = a.confidence * a.successRate;
      const scoreB = b.confidence * b.successRate;
      return scoreB - scoreA;
    });
  }

  /**
   * Update pattern based on new observations
   */
  updatePattern(patternId: string, success: boolean): void {
    for (const [agentId, agentPatterns] of this.patterns.entries()) {
      const pattern = agentPatterns.find(p => p.id === patternId);
      if (pattern) {
        pattern.observationCount += 1;
        const successCount = Math.round(pattern.successRate * (pattern.observationCount - 1));
        pattern.successRate = success
          ? (successCount + 1) / pattern.observationCount
          : successCount / pattern.observationCount;

        // Increase confidence as pattern is validated through use
        // Don't recalculate - validated patterns become more confident over time
        pattern.confidence = Math.min(pattern.confidence + 0.02, 1.0);
        pattern.updatedAt = new Date();

        logger.debug('Pattern updated', {
          patternId,
          observationCount: pattern.observationCount,
          successRate: pattern.successRate,
          confidence: pattern.confidence,
        });
        break;
      }
    }
  }

  // Helper methods

  private storePatterns(agentId: string, newPatterns: LearnedPattern[]): void {
    if (!this.patterns.has(agentId)) {
      this.patterns.set(agentId, []);
    }

    const existing = this.patterns.get(agentId)!;
    existing.push(...newPatterns);

    // Trim if exceeds max
    if (existing.length > this.config.maxPatternsPerAgent) {
      // Keep highest confidence patterns
      existing.sort((a, b) => b.confidence - a.confidence);
      this.patterns.set(agentId, existing.slice(0, this.config.maxPatternsPerAgent));
    }
  }

  private groupByTaskType(
    metrics: PerformanceMetrics[]
  ): Map<string, PerformanceMetrics[]> {
    const groups = new Map<string, PerformanceMetrics[]>();

    for (const metric of metrics) {
      if (!groups.has(metric.taskType)) {
        groups.set(metric.taskType, []);
      }
      groups.get(metric.taskType)!.push(metric);
    }

    return groups;
  }

  private getMedianCost(metrics: PerformanceMetrics[]): number {
    const sorted = metrics.map(m => m.cost).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private getMedianDuration(metrics: PerformanceMetrics[]): number {
    const sorted = metrics.map(m => m.durationMs).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private getP95Duration(metrics: PerformanceMetrics[]): number {
    const sorted = metrics.map(m => m.durationMs).sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  private inferComplexity(metrics: PerformanceMetrics[]): 'low' | 'medium' | 'high' {
    const avgDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;

    if (avgDuration < 5000) return 'low';
    if (avgDuration < 15000) return 'medium';
    return 'high';
  }

  private calculateConfidence(observationCount: number, totalSamples: number): number {
    // Wilson score confidence interval for binomial proportion
    // Simplified version: more observations = higher confidence
    const proportion = observationCount / totalSamples;
    const n = totalSamples;

    // Confidence increases with sample size and proportion
    // Use 30 as baseline (reasonable for statistical significance)
    const sampleSizeBonus = Math.min(n / 30, 1); // Max 1.0 at 30+ samples
    const proportionScore = proportion;

    return Math.min(sampleSizeBonus * proportionScore, 1.0);
  }

  /**
   * Clear patterns for an agent
   */
  clearPatterns(agentId: string): void {
    this.patterns.delete(agentId);
    logger.info('Patterns cleared', { agentId });
  }

  /**
   * Get all agents with learned patterns
   */
  getAgentsWithPatterns(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Phase 2: Identify context-aware patterns for an agent
   *
   * @param agentId Agent identifier
   * @returns Array of contextual patterns with rich metadata
   */
  async identifyContextualPatterns(agentId: string): Promise<ContextualPattern[]> {
    const metrics = this.performanceTracker.getMetrics(agentId);

    if (metrics.length < this.config.minObservations) {
      logger.debug('Insufficient data for contextual pattern analysis', {
        agentId,
        count: metrics.length,
        required: this.config.minObservations,
      });
      return [];
    }

    const contextualPatterns: ContextualPattern[] = [];

    // Group metrics by task type
    const metricsByTask = this.groupByTaskType(metrics);

    for (const [taskType, taskMetrics] of metricsByTask.entries()) {
      // Extract context from metadata
      const complexity = this.inferComplexity(taskMetrics);

      // Create contextual pattern for success patterns
      const successfulMetrics = taskMetrics.filter((m) => m.success);
      const successRate = successfulMetrics.length / taskMetrics.length;

      if (
        successfulMetrics.length >= this.config.minObservations &&
        successRate >= this.config.successRateThreshold
      ) {
        const avgDuration = taskMetrics.reduce((sum, m) => sum + m.durationMs, 0) / taskMetrics.length;

        contextualPatterns.push({
          id: uuidv4(),
          type: 'success',
          description: `Successful execution pattern for ${taskType}`,
          confidence: this.calculateConfidence(successfulMetrics.length, taskMetrics.length),
          observations: successfulMetrics.length,
          success_rate: successRate,
          avg_execution_time: avgDuration,
          last_seen: new Date().toISOString(),
          context: {
            agent_type: agentId,
            task_type: taskType,
            complexity,
          },
        });
      }
    }

    // Store contextual patterns
    this.contextualPatterns.set(agentId, contextualPatterns);

    logger.info('Contextual pattern analysis complete', {
      agentId,
      patternsFound: contextualPatterns.length,
    });

    return contextualPatterns;
  }

  /**
   * Phase 2: Find optimal configuration using multi-objective optimization
   *
   * @param agentId Agent identifier
   * @param weights Objective weights (should sum to ~1.0)
   * @returns Best configuration candidate or undefined
   */
  findOptimalConfiguration(
    agentId: string,
    weights: OptimizationObjectives
  ): OptimizationCandidate | undefined {
    const metrics = this.performanceTracker.getMetrics(agentId);

    if (metrics.length === 0) {
      return undefined;
    }

    // Convert metrics to optimization candidates
    const candidates: OptimizationCandidate[] = metrics.map((m) => ({
      id: m.executionId,
      objectives: {
        accuracy: m.qualityScore,
        speed: m.durationMs > 0 ? 1 / (m.durationMs / 1000) : 0, // Inverse of seconds
        cost: m.cost > 0 ? 1 / m.cost : 0, // Inverse of cost (higher is better)
        satisfaction: m.userSatisfaction,
      },
      metadata: m.metadata,
    }));

    // Find Pareto front
    const paretoFront = this.multiObjectiveOptimizer.findParetoFront(candidates);

    // Select best from Pareto front using weights
    const best = this.multiObjectiveOptimizer.selectBest(paretoFront, weights);

    if (best) {
      logger.info('Optimal configuration found', {
        agentId,
        candidateId: best.id,
        objectives: best.objectives,
      });
    }

    return best;
  }

  /**
   * Phase 2: Generate human-readable explanation for a pattern
   *
   * @param patternId Pattern identifier
   * @returns Pattern explanation or undefined if not found
   */
  explainPattern(patternId: string): PatternExplanation | undefined {
    // Search in contextual patterns
    for (const [agentId, patterns] of this.contextualPatterns.entries()) {
      const pattern = patterns.find((p) => p.id === patternId);
      if (pattern) {
        return this.patternExplainer.explain(pattern);
      }
    }

    logger.warn('Pattern not found for explanation', { patternId });
    return undefined;
  }
}
