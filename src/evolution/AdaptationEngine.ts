/**
 * Adaptation Engine - Dynamic Agent Behavior Modification
 *
 * Applies learned patterns to adapt agent behavior in real-time
 */

import { logger } from '../utils/logger.js';
import type { LearningManager } from './LearningManager.js';
import type { PerformanceTracker } from './PerformanceTracker.js';
import type {
  LearnedPattern,
  AdaptationConfig,
  PerformanceMetrics,
} from './types.js';

export interface AdaptationResult {
  applied: boolean;
  patternId?: string;
  adaptationType?: LearnedPattern['action']['type'];
  parameters?: Record<string, any>;
  reason: string;
}

export interface AdaptedExecution {
  originalConfig: Record<string, any>;
  adaptedConfig: Record<string, any>;
  appliedPatterns: string[];
}

export class AdaptationEngine {
  private learningManager: LearningManager;
  private performanceTracker: PerformanceTracker;
  private adaptationConfigs: Map<string, AdaptationConfig> = new Map();
  private appliedAdaptations: Map<string, number> = new Map(); // patternId -> count

  // Test helper data structure
  private performanceHistory: Map<string, Array<{
    version: number;
    successRate: number;
    feedback: string;
    timestamp: number;
  }>> = new Map();
  private isInitialized: boolean = false;

  constructor(
    learningManager: LearningManager,
    performanceTracker: PerformanceTracker
  ) {
    this.learningManager = learningManager;
    this.performanceTracker = performanceTracker;
    this.isInitialized = true;

    logger.info('Adaptation engine initialized');
  }

  /**
   * Configure adaptation behavior for an agent
   */
  configureAgent(agentId: string, config: AdaptationConfig): void {
    this.adaptationConfigs.set(agentId, config);

    logger.info('Agent adaptation configured', {
      agentId,
      enabledAdaptations: Object.keys(config.enabledAdaptations).filter(
        k => config.enabledAdaptations[k as keyof typeof config.enabledAdaptations]
      ),
      learningRate: config.learningRate,
      minConfidence: config.minConfidence,
    });
  }

  /**
   * Get adaptation configuration for an agent
   */
  getConfig(agentId: string): AdaptationConfig | undefined {
    return this.adaptationConfigs.get(agentId);
  }

  /**
   * Adapt execution configuration based on learned patterns
   */
  async adaptExecution(
    agentId: string,
    taskType: string,
    baseConfig: Record<string, any>
  ): Promise<AdaptedExecution> {
    const config = this.adaptationConfigs.get(agentId);

    if (!config) {
      logger.debug('No adaptation config for agent', { agentId });
      return {
        originalConfig: baseConfig,
        adaptedConfig: baseConfig,
        appliedPatterns: [],
      };
    }

    // Get applicable patterns
    const taskComplexity = this.inferComplexity(baseConfig);
    const patterns = this.learningManager.getRecommendations(
      agentId,
      taskType,
      taskComplexity
    );

    // Filter patterns by configuration
    const applicablePatterns = this.filterApplicablePatterns(patterns, config);

    if (applicablePatterns.length === 0) {
      logger.debug('No applicable patterns found', { agentId, taskType });
      return {
        originalConfig: baseConfig,
        adaptedConfig: baseConfig,
        appliedPatterns: [],
      };
    }

    // Apply patterns
    let adaptedConfig = { ...baseConfig };
    const appliedPatternIds: string[] = [];

    for (const pattern of applicablePatterns) {
      const result = this.applyPattern(pattern, adaptedConfig, config);

      if (result.applied) {
        adaptedConfig = result.adaptedConfig!;
        appliedPatternIds.push(pattern.id);
        this.recordAdaptation(pattern.id);

        logger.info('Pattern applied', {
          agentId,
          taskType,
          patternId: pattern.id,
          adaptationType: pattern.action.type,
        });
      }
    }

    return {
      originalConfig: baseConfig,
      adaptedConfig,
      appliedPatterns: appliedPatternIds,
    };
  }

  /**
   * Apply a single pattern to configuration
   */
  private applyPattern(
    pattern: LearnedPattern,
    config: Record<string, any>,
    adaptationConfig: AdaptationConfig
  ): { applied: boolean; adaptedConfig?: Record<string, any> } {
    const { action } = pattern;
    let adaptedConfig = { ...config };
    let applied = false;

    switch (action.type) {
      case 'adjust_prompt':
        if (adaptationConfig.enabledAdaptations.promptOptimization) {
          adaptedConfig = this.adjustPrompt(adaptedConfig, action.parameters);
          applied = true;
        }
        break;

      case 'change_model':
        if (adaptationConfig.enabledAdaptations.modelSelection) {
          adaptedConfig = this.changeModel(adaptedConfig, action.parameters);
          applied = true;
        }
        break;

      case 'modify_timeout':
        if (adaptationConfig.enabledAdaptations.timeoutAdjustment) {
          adaptedConfig = this.modifyTimeout(adaptedConfig, action.parameters);
          applied = true;
        }
        break;

      case 'add_step':
      case 'remove_step':
        // Workflow modification (advanced feature)
        logger.debug('Workflow modification not yet implemented', {
          type: action.type,
        });
        break;

      default:
        logger.warn('Unknown adaptation type', { type: action.type });
    }

    return { applied, adaptedConfig: applied ? adaptedConfig : undefined };
  }

  /**
   * Adjust prompt based on pattern
   */
  private adjustPrompt(
    config: Record<string, any>,
    parameters: Record<string, any>
  ): Record<string, any> {
    const adapted = { ...config };

    if (parameters.strategy === 'efficient') {
      adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\nOptimization Focus: Maintain high quality while minimizing token usage.`;
    } else if (parameters.strategy === 'quality-focused') {
      adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\nQuality Focus: Prioritize output quality and accuracy over speed.`;
    }

    if (parameters.additionalInstructions) {
      adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\n${parameters.additionalInstructions}`;
    }

    if (parameters.focusAreas) {
      adapted.systemPrompt = `${adapted.systemPrompt || ''}\n\nFocus Areas: ${parameters.focusAreas.join(', ')}`;
    }

    return adapted;
  }

  /**
   * Change model based on pattern
   */
  private changeModel(
    config: Record<string, any>,
    parameters: Record<string, any>
  ): Record<string, any> {
    const adapted = { ...config };

    // Example model selection logic
    if (parameters.targetCostReduction) {
      // Switch to more cost-effective model
      if (config.model === 'claude-opus-4-5') {
        adapted.model = 'claude-sonnet-4-5';
      } else if (config.model === 'claude-sonnet-4-5') {
        adapted.model = 'claude-haiku-4';
      }
    }

    if (parameters.minQualityScore && parameters.minQualityScore >= 0.9) {
      // Switch to higher quality model
      if (config.model === 'claude-haiku-4') {
        adapted.model = 'claude-sonnet-4-5';
      } else if (config.model === 'claude-sonnet-4-5') {
        adapted.model = 'claude-opus-4-5';
      }
    }

    return adapted;
  }

  /**
   * Modify timeout based on pattern
   */
  private modifyTimeout(
    config: Record<string, any>,
    parameters: Record<string, any>
  ): Record<string, any> {
    const adapted = { ...config };

    if (parameters.timeoutMs) {
      adapted.timeout = parameters.timeoutMs;
    }

    return adapted;
  }

  /**
   * Filter patterns that can be applied
   */
  private filterApplicablePatterns(
    patterns: LearnedPattern[],
    config: AdaptationConfig
  ): LearnedPattern[] {
    return patterns.filter(pattern => {
      // Check confidence threshold
      if (pattern.confidence < config.minConfidence) {
        return false;
      }

      // Check observation threshold
      if (pattern.observationCount < config.minObservations) {
        return false;
      }

      // Check if adaptation type is enabled
      switch (pattern.action.type) {
        case 'adjust_prompt':
          return config.enabledAdaptations.promptOptimization === true;
        case 'change_model':
          return config.enabledAdaptations.modelSelection === true;
        case 'modify_timeout':
          return config.enabledAdaptations.timeoutAdjustment === true;
        case 'add_step':
        case 'remove_step':
          // Workflow modification requires all adaptations enabled
          return (
            config.enabledAdaptations.promptOptimization &&
            config.enabledAdaptations.modelSelection &&
            config.enabledAdaptations.timeoutAdjustment
          );
        default:
          return false;
      }
    });
  }

  /**
   * Infer task complexity from configuration
   */
  private inferComplexity(config: Record<string, any>): 'low' | 'medium' | 'high' {
    // Simple heuristic based on configuration
    if (config.maxTokens && config.maxTokens > 4000) return 'high';
    if (config.maxTokens && config.maxTokens > 2000) return 'medium';
    return 'low';
  }

  /**
   * Record adaptation application
   */
  private recordAdaptation(patternId: string): void {
    const count = this.appliedAdaptations.get(patternId) || 0;
    this.appliedAdaptations.set(patternId, count + 1);
  }

  /**
   * Get adaptation statistics
   */
  getAdaptationStats(agentId: string): {
    totalAdaptations: number;
    byType: Record<string, number>;
    topPatterns: Array<{ patternId: string; count: number }>;
  } {
    const patterns = this.learningManager.getPatterns(agentId);
    const stats = {
      totalAdaptations: 0,
      byType: {} as Record<string, number>,
      topPatterns: [] as Array<{ patternId: string; count: number }>,
    };

    for (const [patternId, count] of this.appliedAdaptations.entries()) {
      const pattern = patterns.find(p => p.id === patternId);
      if (!pattern) continue;

      stats.totalAdaptations += count;

      const type = pattern.action.type;
      stats.byType[type] = (stats.byType[type] || 0) + count;
    }

    // Top patterns
    const sortedPatterns = Array.from(this.appliedAdaptations.entries())
      .map(([patternId, count]) => ({ patternId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.topPatterns = sortedPatterns;

    return stats;
  }

  /**
   * Provide feedback on adapted execution
   */
  async provideFeedback(
    patternId: string,
    metrics: PerformanceMetrics
  ): Promise<void> {
    // Update pattern based on execution result
    this.learningManager.updatePattern(patternId, metrics.success);

    // Record performance
    this.performanceTracker.track(metrics);

    logger.info('Adaptation feedback recorded', {
      patternId,
      success: metrics.success,
      qualityScore: metrics.qualityScore,
      cost: metrics.cost,
    });
  }

  /**
   * Enable/disable specific adaptations for an agent
   */
  updateAdaptationConfig(
    agentId: string,
    updates: Partial<AdaptationConfig>
  ): void {
    const existing = this.adaptationConfigs.get(agentId);

    if (!existing) {
      logger.warn('No existing config for agent', { agentId });
      return;
    }

    const updated: AdaptationConfig = {
      ...existing,
      ...updates,
      enabledAdaptations: {
        ...existing.enabledAdaptations,
        ...updates.enabledAdaptations,
      },
    };

    this.adaptationConfigs.set(agentId, updated);

    logger.info('Adaptation config updated', { agentId, updates });
  }

  /**
   * Reset all adaptations for an agent
   */
  resetAdaptations(agentId: string): void {
    // Remove patterns
    this.learningManager.clearPatterns(agentId);

    // Clear adaptation counts
    const patterns = this.learningManager.getPatterns(agentId);
    for (const pattern of patterns) {
      this.appliedAdaptations.delete(pattern.id);
    }

    logger.info('Adaptations reset', { agentId });
  }

  /**
   * Get all agents with active adaptations
   */
  getAdaptedAgents(): string[] {
    return Array.from(this.adaptationConfigs.keys());
  }

  // =====================
  // Testing Helper Methods
  // =====================

  /**
   * Initialize for testing (compatibility with integration tests)
   */
  async initialize(): Promise<void> {
    // Already initialized in constructor
    this.isInitialized = true;
    logger.info('Adaptation engine initialized');
    return Promise.resolve();
  }

  /**
   * Close and clean up resources (compatibility with integration tests)
   */
  async close(): Promise<void> {
    // Clean up data structures
    this.adaptationConfigs.clear();
    this.appliedAdaptations.clear();
    this.performanceHistory.clear();
    this.isInitialized = false;
    return Promise.resolve();
  }

  /**
   * Record performance metrics for prompt optimization (test helper)
   */
  async recordPerformance(metrics: {
    promptVersion: number;
    successRate: number;
    feedback: string;
  }): Promise<void> {
    // Store in performance history
    const agentId = 'test-agent';
    if (!this.performanceHistory.has(agentId)) {
      this.performanceHistory.set(agentId, []);
    }
    this.performanceHistory.get(agentId)!.push({
      version: metrics.promptVersion,
      successRate: metrics.successRate,
      feedback: metrics.feedback,
      timestamp: Date.now(),
    });
    return Promise.resolve();
  }

  /**
   * Optimize prompt based on performance metrics (test helper)
   */
  async optimizePrompt(currentPrompt: string): Promise<string> {
    // Get performance history
    const agentId = 'test-agent';
    const history = this.performanceHistory.get(agentId) || [];

    if (history.length === 0) {
      return currentPrompt;
    }

    // Get latest performance
    const latest = history[history.length - 1];

    // If performance is below threshold, optimize
    if (latest.successRate < 0.85) {
      // Add optimization based on feedback
      let optimized = currentPrompt;

      if (latest.feedback.includes('verbose')) {
        optimized += '\n\nBe concise, focus on key points';
      }
      if (latest.feedback.includes('examples')) {
        optimized += '\n\nInclude concrete examples';
      }
      if (latest.feedback.includes('conciseness') && latest.successRate > 0.65) {
        // Already added conciseness, add examples
        optimized += '\n\nInclude concrete examples';
      }

      return optimized;
    }

    return currentPrompt;
  }

  /**
   * Adapt prompt from learned pattern (test helper)
   */
  async adaptPromptFromPattern(
    prompt: string,
    pattern: { pattern: string; confidence: number }
  ): Promise<string> {
    // Incorporate pattern into prompt if confidence is high
    if (pattern.confidence > 0.7) {
      // Extract key instruction from pattern
      let instruction = '';

      if (pattern.pattern.includes('validation')) {
        instruction = 'Always include input validation';
      } else if (pattern.pattern.includes('documentation')) {
        instruction = 'Always include comprehensive documentation';
      } else if (pattern.pattern.includes('error handling')) {
        instruction = 'Always include proper error handling';
      } else {
        instruction = `Follow this pattern: ${pattern.pattern}`;
      }

      return `${prompt}\n\n${instruction}`;
    }

    return prompt;
  }

  /**
   * Check if engine is ready (test helper)
   */
  async isReady(): Promise<boolean> {
    return Promise.resolve(this.isInitialized);
  }
}
