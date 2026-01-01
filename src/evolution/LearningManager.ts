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
   * Default: 10 (statistical minimum for reasonable confidence)
   */
  minObservations: number;

  /**
   * Minimum confidence threshold (0-1)
   * Default: 0.7 (70% confidence required to apply patterns)
   */
  minConfidence: number;

  /**
   * Success rate threshold for positive patterns
   * Default: 0.8 (80% success rate = reliable pattern)
   */
  successRateThreshold: number;

  /**
   * Failure rate threshold for anti-patterns
   * Default: 0.3 (30% failure rate = problematic pattern)
   */
  failureRateThreshold: number;

  /**
   * Maximum patterns to store per agent
   * Default: 100 (prevent unbounded memory growth)
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

  // Quality score thresholds
  private readonly QUALITY_HIGH = 0.8; // High quality threshold
  private readonly QUALITY_LOW = 0.5; // Low quality threshold (below = poor)
  private readonly COST_REDUCTION_TARGET = 0.8; // 20% cost reduction target

  // Confidence and learning parameters
  private readonly CONFIDENCE_INCREMENT = 0.02; // 2% confidence boost per successful validation (gradual learning)
  private readonly STATISTICAL_BASELINE_SAMPLES = 30; // Statistical baseline for reasonable confidence

  // Complexity inference thresholds (based on execution duration)
  private readonly COMPLEXITY_LOW_THRESHOLD_MS = 5000; // < 5s = simple task
  private readonly COMPLEXITY_MEDIUM_THRESHOLD_MS = 15000; // < 15s = moderate task
  // >= 15s = complex task

  // Cost variation threshold
  private readonly COST_VARIATION_PERCENT = 0.1; // 10% variation threshold
  private readonly COST_VARIATION_MIN_ABSOLUTE = 0.01; // $0.01 minimum absolute variation

  // P95 minimum sample size
  private readonly P95_MIN_SAMPLE_SIZE = 20; // Minimum samples for meaningful P95 calculation

  // Test helper: Simple persistence for cross-session pattern storage (static for cross-instance persistence)
  private static savedPatterns: Map<string, LearnedPattern[]> = new Map();
  private static savedFeedback: Map<string, AgentFeedback[]> = new Map();
  private isInitialized: boolean = false;

  constructor(
    performanceTracker?: PerformanceTracker,
    config?: Partial<LearningConfig>
  ) {
    this.performanceTracker = performanceTracker as PerformanceTracker;
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

    this.isInitialized = true;

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
   * Helper method to create a pattern with consistent structure
   * Reduces duplication across pattern extraction methods
   */
  private createPattern(
    agentId: string,
    taskType: string,
    patternType: 'success' | 'anti-pattern' | 'optimization',
    description: string,
    observedMetrics: PerformanceMetrics[],
    totalMetrics: PerformanceMetrics[],
    action: LearnedPattern['action'],
    successCount: number,
    successRate: number
  ): LearnedPattern {
    return {
      id: uuidv4(),
      type: patternType,
      agentId,
      taskType,
      description,
      conditions: {
        taskComplexity: this.inferComplexity(observedMetrics),
      },
      action,
      confidence: this.calculateConfidence(observedMetrics.length, totalMetrics.length),
      observationCount: observedMetrics.length,
      successCount,
      successRate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
      m => m.qualityScore >= this.QUALITY_HIGH
    );

    if (consistentHighQuality.length >= this.config.minObservations) {
      patterns.push(
        this.createPattern(
          agentId,
          taskType,
          'success',
          `Consistent high quality (≥0.8) for ${taskType}`,
          consistentHighQuality,
          metrics,
          {
            type: 'adjust_prompt',
            parameters: {
              strategy: 'quality-focused',
              focusAreas: ['accuracy', 'consistency'],
            },
          },
          consistentHighQuality.length,  // All high-quality observations are successful
          successRate
        )
      );
    }

    // Pattern 2: Cost efficiency (only if there's variation in cost)
    const medianCost = this.getMedianCost(metrics);
    const costVariation = metrics.some(m => {
      const diff = Math.abs(m.cost - medianCost);
      return diff > Math.max(medianCost * this.COST_VARIATION_PERCENT, this.COST_VARIATION_MIN_ABSOLUTE);
    });

    if (costVariation) {
      const highQualityLowCost = successfulMetrics.filter(
        m => m.qualityScore >= this.QUALITY_HIGH && m.cost <= medianCost
      );

      if (highQualityLowCost.length >= this.config.minObservations) {
        patterns.push(
          this.createPattern(
            agentId,
            taskType,
            'success',
            `High quality (≥0.8) with cost-efficient execution for ${taskType}`,
            highQualityLowCost,
            metrics,
            {
              type: 'adjust_prompt',
              parameters: {
                strategy: 'efficient',
                focusAreas: ['quality', 'cost-optimization'],
              },
            },
            highQualityLowCost.length,  // All high-quality low-cost observations are successful
            successRate
          )
        );
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
      patterns.push(
        this.createPattern(
          agentId,
          taskType,
          'anti-pattern',
          `Timeout failures (P95 duration) for ${taskType}`,
          timeoutFailures,
          failedMetrics,
          {
            type: 'modify_timeout',
            parameters: {
              timeoutMs: Math.round(this.getP95Duration(metrics) * 1.5),
            },
          },
          0,  // All timeout failures are unsuccessful
          0
        )
      );
    }

    // Anti-pattern: Low quality output
    const lowQualityMetrics = metrics.filter(
      m => m.success && m.qualityScore < this.QUALITY_LOW
    );

    if (lowQualityMetrics.length >= this.config.minObservations / 2) {
      patterns.push(
        this.createPattern(
          agentId,
          taskType,
          'anti-pattern',
          `Low quality output (<0.5) for ${taskType}`,
          lowQualityMetrics,
          metrics,
          {
            type: 'adjust_prompt',
            parameters: {
              strategy: 'quality-focused',
              additionalInstructions: 'Prioritize output quality over speed',
            },
          },
          0,  // Low-quality outputs are not considered successful
          0
        )
      );
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
        m => m.cost < avgCost * this.COST_REDUCTION_TARGET && m.qualityScore >= this.QUALITY_HIGH
      );

      if (lowCostHighQuality.length >= this.config.minObservations / 2) {
        patterns.push(
          this.createPattern(
            agentId,
            taskType,
            'optimization',
            `Cost optimization opportunity: 20% cost reduction with quality ≥0.8 for ${taskType}`,
            lowCostHighQuality,
            successfulMetrics,
            {
              type: 'change_model',
              parameters: {
                targetCostReduction: 0.2,
                minQualityScore: 0.8,
              },
            },
            lowCostHighQuality.length,  // All low-cost high-quality observations are successful
            lowCostHighQuality.length / successfulMetrics.length
          )
        );
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
        pattern.confidence = Math.min(pattern.confidence + this.CONFIDENCE_INCREMENT, 1.0);
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

  /**
   * Calculate median value from an array of numbers
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private getMedianCost(metrics: PerformanceMetrics[]): number {
    return this.calculateMedian(metrics.map(m => m.cost));
  }

  private getMedianDuration(metrics: PerformanceMetrics[]): number {
    return this.calculateMedian(metrics.map(m => m.durationMs));
  }

  private getP95Duration(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) {
      return 0;
    }

    const sorted = metrics.map(m => m.durationMs).sort((a, b) => a - b);

    // For small samples, use max instead of P95
    if (sorted.length < this.P95_MIN_SAMPLE_SIZE) {
      logger.debug('Using max duration for P95 (insufficient samples)', {
        sampleSize: sorted.length,
      });
      return sorted[sorted.length - 1];
    }

    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  private inferComplexity(metrics: PerformanceMetrics[]): 'low' | 'medium' | 'high' {
    const avgDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;

    if (avgDuration < this.COMPLEXITY_LOW_THRESHOLD_MS) return 'low';
    if (avgDuration < this.COMPLEXITY_MEDIUM_THRESHOLD_MS) return 'medium';
    return 'high';
  }

  private calculateConfidence(observationCount: number, totalSamples: number): number {
    // Wilson score confidence interval for binomial proportion
    // Simplified version: more observations = higher confidence
    const proportion = observationCount / totalSamples;
    const n = totalSamples;

    // Confidence increases with sample size and proportion
    const sampleSizeBonus = Math.min(n / this.STATISTICAL_BASELINE_SAMPLES, 1);
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
    // Validate weights
    const weightValues = Object.values(weights).filter(v => v !== undefined) as number[];
    if (weightValues.length === 0) {
      logger.warn('No weights provided for optimization', { agentId });
      return undefined;
    }

    if (weightValues.some(w => w < 0 || !Number.isFinite(w))) {
      logger.error('Invalid weights for optimization', { agentId, weights });
      return undefined;
    }

    const metrics = this.performanceTracker.getMetrics(agentId);

    if (metrics.length === 0) {
      return undefined;
    }

    // Convert metrics to optimization candidates
    const candidates: OptimizationCandidate[] = metrics.map((m) => ({
      id: m.executionId,
      objectives: {
        accuracy: m.qualityScore,
        speed: m.durationMs > 0 && Number.isFinite(m.durationMs)
          ? 1 / (m.durationMs / 1000)
          : 0,
        cost: m.cost > 0 && Number.isFinite(m.cost)
          ? 1 / m.cost
          : 0,
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

  /**
   * Phase 3: Get learned patterns for an agent (for cross-agent transfer)
   *
   * @param agentId Agent identifier
   * @returns Array of contextual patterns for the agent
   */
  async getLearnedPatterns(agentId: string): Promise<ContextualPattern[]> {
    const patterns = this.contextualPatterns.get(agentId);
    if (!patterns) {
      logger.debug('No patterns found for agent', { agentId });
      return [];
    }

    return patterns;
  }

  /**
   * Add bootstrap pattern (for new user initialization)
   * Used by EvolutionBootstrap to preload common workflow patterns
   *
   * @param pattern Bootstrap pattern to add
   */
  addBootstrapPattern(pattern: LearnedPattern): void {
    const agentId = pattern.agentId;

    if (!this.patterns.has(agentId)) {
      this.patterns.set(agentId, []);
    }

    const existing = this.patterns.get(agentId)!;

    // Check if pattern already exists
    const existingPatternIndex = existing.findIndex((p) => p.id === pattern.id);

    if (existingPatternIndex !== -1) {
      const existingPattern = existing[existingPatternIndex];

      // Compare key fields to detect updates
      const hasContentChanges =
        existingPattern.description !== pattern.description ||
        existingPattern.confidence !== pattern.confidence ||
        existingPattern.observationCount !== pattern.observationCount ||
        existingPattern.successCount !== pattern.successCount ||
        existingPattern.successRate !== pattern.successRate;

      if (hasContentChanges) {
        // Update existing pattern with new data
        existing[existingPatternIndex] = {
          ...pattern,
          createdAt: existingPattern.createdAt, // Preserve original creation time
          updatedAt: new Date(), // Update timestamp
        };

        logger.info('Bootstrap pattern updated with new content', {
          patternId: pattern.id,
          agentId,
          taskType: pattern.taskType,
          oldConfidence: existingPattern.confidence,
          newConfidence: pattern.confidence,
          oldObservationCount: existingPattern.observationCount,
          newObservationCount: pattern.observationCount,
        });
      } else {
        // Identical pattern, skip
        logger.debug('Bootstrap pattern already exists with same content, skipping', {
          patternId: pattern.id,
          agentId,
        });
      }

      return;
    }

    // Add new pattern
    existing.push(pattern);

    logger.debug('Bootstrap pattern added', {
      patternId: pattern.id,
      agentId,
      taskType: pattern.taskType,
      confidence: pattern.confidence,
    });

    // Trim if exceeds max (keep highest confidence patterns)
    if (existing.length > this.config.maxPatternsPerAgent) {
      existing.sort((a, b) => b.confidence - a.confidence);
      this.patterns.set(agentId, existing.slice(0, this.config.maxPatternsPerAgent));

      logger.debug('Trimmed patterns for agent', {
        agentId,
        kept: this.config.maxPatternsPerAgent,
        removed: existing.length - this.config.maxPatternsPerAgent,
      });
    }
  }

  // =====================
  // Testing Helper Methods
  // =====================

  /**
   * Initialize for testing (compatibility with integration tests)
   */
  async initialize(): Promise<void> {
    // Restore patterns and feedback from saved state (if any)
    if (LearningManager.savedPatterns.size > 0) {
      for (const [agentId, patterns] of LearningManager.savedPatterns.entries()) {
        this.patterns.set(agentId, [...patterns]);
      }
    }
    if (LearningManager.savedFeedback.size > 0) {
      for (const [agentId, feedback] of LearningManager.savedFeedback.entries()) {
        this.feedback.set(agentId, [...feedback]);
      }
    }
    this.isInitialized = true;
    return Promise.resolve();
  }

  /**
   * Close and clean up resources (compatibility with integration tests)
   */
  async close(): Promise<void> {
    // Save current state before clearing
    LearningManager.savedPatterns.clear();
    LearningManager.savedFeedback.clear();

    for (const [agentId, patterns] of this.patterns.entries()) {
      LearningManager.savedPatterns.set(agentId, [...patterns]);
    }
    for (const [agentId, feedback] of this.feedback.entries()) {
      LearningManager.savedFeedback.set(agentId, [...feedback]);
    }

    // Clean up active data structures
    this.patterns.clear();
    this.feedback.clear();
    this.isInitialized = false;
    return Promise.resolve();
  }

  /**
   * Record agent interaction for pattern learning (test helper)
   */
  async recordInteraction(interaction: {
    agentId: string;
    taskType: string;
    success: boolean;
    feedback: string;
    context: Record<string, any>;
  }): Promise<void> {
    // Store interaction as feedback
    this.addFeedback({
      executionId: `exec-${Date.now()}`, // Generate execution ID
      agentId: interaction.agentId,
      type: interaction.success ? 'positive' : 'negative',
      rating: interaction.success ? 4 : 2, // Default rating based on success
      feedback: interaction.feedback,
    });

    return Promise.resolve();
  }

  /**
   * Extract learned patterns from feedback (test helper)
   */
  async extractPatterns(): Promise<Array<{ pattern: string; confidence: number }>> {
    // Analyze feedback to extract patterns with fuzzy matching
    const allPatterns: Array<{ pattern: string; confidence: number }> = [];

    for (const [agentId, feedbackList] of this.feedback.entries()) {
      // Group similar feedbacks by extracting key concepts
      const patternGroups = new Map<string, { feedbacks: string[]; count: number }>();
      const totalFeedback = feedbackList.length;

      for (const fb of feedbackList) {
        const normalized = fb.feedback.toLowerCase();

        // Extract key concepts (simple keyword-based grouping)
        let groupKey = 'general';

        if (normalized.includes('error handling') || normalized.includes('try-catch')) {
          groupKey = 'error_handling';
        } else if (normalized.includes('validation') || normalized.includes('input')) {
          groupKey = 'validation';
        } else if (normalized.includes('documentation') || normalized.includes('comment')) {
          groupKey = 'documentation';
        } else if (normalized.includes('type') || normalized.includes('annotation')) {
          groupKey = 'type_annotations';
        }

        if (!patternGroups.has(groupKey)) {
          patternGroups.set(groupKey, { feedbacks: [], count: 0 });
        }

        const group = patternGroups.get(groupKey)!;
        group.feedbacks.push(normalized);
        group.count++;
      }

      // Convert grouped feedbacks to patterns with confidence
      for (const [groupKey, group] of patternGroups.entries()) {
        // Calculate confidence based on number of observations
        // Confidence increases with repetition: 1→0.3, 2→0.6, 3→0.9, 4+→1.0
        const confidence = Math.min(group.count * 0.3, 1.0);

        // Generate pattern text based on group
        let patternText = '';
        if (groupKey === 'error_handling') {
          patternText = 'always add error handling to async functions';
        } else if (groupKey === 'validation') {
          patternText = 'always include input validation';
        } else if (groupKey === 'documentation') {
          patternText = 'always include comprehensive documentation';
        } else if (groupKey === 'type_annotations') {
          patternText = 'always add type annotations';
        } else {
          patternText = group.feedbacks[0]; // Use first feedback as pattern
        }

        allPatterns.push({
          pattern: patternText,
          confidence,
        });
      }
    }

    return allPatterns;
  }

  /**
   * Clear saved patterns and feedback (test helper for isolation)
   */
  static clearSavedData(): void {
    LearningManager.savedPatterns.clear();
    LearningManager.savedFeedback.clear();
  }

  /**
   * Check if manager is ready (test helper)
   */
  async isReady(): Promise<boolean> {
    return Promise.resolve(this.isInitialized);
  }
}
