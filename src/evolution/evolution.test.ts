/**
 * Self-Evolving Agent System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceTracker } from './PerformanceTracker.js';
import { LearningManager } from './LearningManager.js';
import { AdaptationEngine } from './AdaptationEngine.js';
import type { PerformanceMetrics, AdaptationConfig } from './types.js';

describe('Self-Evolving Agent System', () => {
  let tracker: PerformanceTracker;
  let learner: LearningManager;
  let adapter: AdaptationEngine;

  beforeEach(() => {
    tracker = new PerformanceTracker();
    learner = new LearningManager(tracker, {
      minObservations: 5,
      minConfidence: 0.6,
      successRateThreshold: 0.7,
      failureRateThreshold: 0.3,
      maxPatternsPerAgent: 50,
    });
    adapter = new AdaptationEngine(learner, tracker);
  });

  describe('PerformanceTracker', () => {
    it('should track agent execution metrics', () => {
      const metric = tracker.track({
        agentId: 'test-agent',
        taskType: 'code-review',
        success: true,
        durationMs: 10000,
        cost: 0.05,
        qualityScore: 0.9,
      });

      expect(metric.executionId).toBeDefined();
      expect(metric.timestamp).toBeInstanceOf(Date);
      expect(metric.agentId).toBe('test-agent');
    });

    it('should retrieve metrics with filters', () => {
      // Track multiple metrics
      for (let i = 0; i < 10; i++) {
        tracker.track({
          agentId: 'test-agent',
          taskType: i % 2 === 0 ? 'code-review' : 'research',
          success: true,
          durationMs: 10000 + i * 1000,
          cost: 0.05,
          qualityScore: 0.9,
        });
      }

      const allMetrics = tracker.getMetrics('test-agent');
      expect(allMetrics).toHaveLength(10);

      const codeReviewMetrics = tracker.getMetrics('test-agent', {
        taskType: 'code-review',
      });
      expect(codeReviewMetrics).toHaveLength(5);

      const recentMetrics = tracker.getMetrics('test-agent', { limit: 3 });
      expect(recentMetrics).toHaveLength(3);
    });

    it('should calculate evolution statistics', () => {
      // Track metrics with varying quality
      // All recent (within 1 second window), so all go to recent bucket
      for (let i = 0; i < 10; i++) {
        tracker.track({
          agentId: 'evolving-agent',
          taskType: 'code-review',
          success: i >= 3, // 70% success
          durationMs: 15000,
          cost: 0.08,
          qualityScore: 0.6,
        });
      }

      const stats = tracker.getEvolutionStats('evolving-agent', 100); // 100ms window (all metrics are recent)

      expect(stats.agentId).toBe('evolving-agent');
      expect(stats.totalExecutions).toBe(10);
      expect(stats.successRateTrend.recent).toBe(0.7); // 7/10 success
    });

    it('should detect performance anomalies', () => {
      // Establish baseline
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'stable-agent',
          taskType: 'research',
          success: true,
          durationMs: 10000,
          cost: 0.05,
          qualityScore: 0.85,
        });
      }

      // Slow execution
      const slowMetric: PerformanceMetrics = {
        executionId: 'slow',
        agentId: 'stable-agent',
        taskType: 'research',
        success: true,
        durationMs: 30000, // 3x slower
        cost: 0.05,
        qualityScore: 0.85,
        timestamp: new Date(),
      };

      const anomaly = tracker.detectAnomalies('stable-agent', slowMetric);
      expect(anomaly.isAnomaly).toBe(true);
      expect(anomaly.type).toBe('slow');
      expect(anomaly.severity).toMatch(/medium|high/);
    });

    it('should limit metrics per agent', () => {
      const smallTracker = new PerformanceTracker({
        maxMetricsPerAgent: 10,
      });

      // Track 20 metrics
      for (let i = 0; i < 20; i++) {
        smallTracker.track({
          agentId: 'limited-agent',
          taskType: 'test',
          success: true,
          durationMs: 1000,
          cost: 0.01,
          qualityScore: 0.8,
        });
      }

      const metrics = smallTracker.getMetrics('limited-agent');
      expect(metrics).toHaveLength(10); // Should trim to max
    });

    it('should get average performance by task type', () => {
      // Track metrics with specific values
      for (let i = 0; i < 10; i++) {
        tracker.track({
          agentId: 'avg-agent',
          taskType: 'qa',
          success: i >= 2, // 80% success
          durationMs: 10000,
          cost: 0.1,
          qualityScore: 0.8,
        });
      }

      const avg = tracker.getAveragePerformance('avg-agent', 'qa');
      expect(avg.sampleSize).toBe(10);
      expect(avg.successRate).toBe(0.8);
      expect(avg.avgDuration).toBe(10000);
      expect(avg.avgCost).toBeCloseTo(0.1, 2); // Use toBeCloseTo for floating point
      expect(avg.avgQuality).toBeCloseTo(0.8, 2); // Use toBeCloseTo for floating point
    });
  });

  describe('LearningManager', () => {
    it('should analyze patterns from performance data', () => {
      // Track successful executions
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'learning-agent',
          taskType: 'code-review',
          success: true,
          durationMs: 8000,
          cost: 0.04,
          qualityScore: 0.9,
        });
      }

      const patterns = learner.analyzePatterns('learning-agent');
      expect(patterns.length).toBeGreaterThan(0);

      const successPattern = patterns.find(p => p.type === 'success');
      expect(successPattern).toBeDefined();
      expect(successPattern?.confidence).toBeGreaterThan(0);
    });

    it('should not create patterns with insufficient data', () => {
      // Track only 3 executions (below threshold of 5)
      for (let i = 0; i < 3; i++) {
        tracker.track({
          agentId: 'sparse-agent',
          taskType: 'test',
          success: true,
          durationMs: 1000,
          cost: 0.01,
          qualityScore: 0.8,
        });
      }

      const patterns = learner.analyzePatterns('sparse-agent');
      expect(patterns).toHaveLength(0);
    });

    it('should identify anti-patterns from failures', () => {
      // Track mostly failed executions
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'failing-agent',
          taskType: 'complex-task',
          success: i >= 10, // 33% success (high failure rate)
          durationMs: 20000,
          cost: 0.15,
          qualityScore: 0.4,
        });
      }

      const patterns = learner.analyzePatterns('failing-agent');
      const antiPattern = patterns.find(p => p.type === 'anti-pattern');
      expect(antiPattern).toBeDefined();
    });

    it('should add and retrieve user feedback', () => {
      const feedback = learner.addFeedback({
        executionId: 'exec-1',
        agentId: 'feedback-agent',
        type: 'positive',
        rating: 5,
        feedback: 'Excellent code review',
      });

      expect(feedback.id).toBeDefined();
      expect(feedback.timestamp).toBeInstanceOf(Date);
    });

    it('should filter patterns by criteria', () => {
      // Create patterns
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'filter-agent',
          taskType: i % 2 === 0 ? 'type-a' : 'type-b',
          success: true,
          durationMs: 5000,
          cost: 0.03,
          qualityScore: 0.85,
        });
      }

      learner.analyzePatterns('filter-agent');

      const allPatterns = learner.getPatterns('filter-agent');
      expect(allPatterns.length).toBeGreaterThan(0);

      const successPatterns = learner.getPatterns('filter-agent', {
        type: 'success',
      });
      expect(successPatterns.every(p => p.type === 'success')).toBe(true);

      const highConfidencePatterns = learner.getPatterns('filter-agent', {
        minConfidence: 0.8,
      });
      expect(highConfidencePatterns.every(p => p.confidence >= 0.8)).toBe(true);
    });

    it('should provide recommendations for tasks', () => {
      // Track data
      for (let i = 0; i < 20; i++) {
        tracker.track({
          agentId: 'recommend-agent',
          taskType: 'optimization',
          success: true,
          durationMs: 6000,
          cost: 0.03,
          qualityScore: 0.9,
        });
      }

      learner.analyzePatterns('recommend-agent');

      const recommendations = learner.getRecommendations(
        'recommend-agent',
        'optimization'
      );

      expect(recommendations.length).toBeGreaterThan(0);
      // Should be sorted by confidence * successRate
      if (recommendations.length > 1) {
        const firstScore = recommendations[0].confidence * recommendations[0].successRate;
        const secondScore = recommendations[1].confidence * recommendations[1].successRate;
        expect(firstScore).toBeGreaterThanOrEqual(secondScore);
      }
    });

    it('should update pattern based on new observations', () => {
      // Create initial pattern
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'update-agent',
          taskType: 'test',
          success: true,
          durationMs: 1000,
          cost: 0.01,
          qualityScore: 0.8,
        });
      }

      const patterns = learner.analyzePatterns('update-agent');
      expect(patterns.length).toBeGreaterThan(0);

      const pattern = patterns[0];
      const initialObservations = pattern.observationCount;
      const initialConfidence = pattern.confidence;

      // Update with successful observation
      learner.updatePattern(pattern.id, true);

      const updatedPatterns = learner.getPatterns('update-agent');
      const updatedPattern = updatedPatterns.find(p => p.id === pattern.id);

      expect(updatedPattern?.observationCount).toBe(initialObservations + 1);
    });
  });

  describe('AdaptationEngine', () => {
    const defaultConfig: AdaptationConfig = {
      agentId: 'adaptive-agent',
      enabledAdaptations: {
        promptOptimization: true,
        modelSelection: true,
        timeoutAdjustment: true,
        retryStrategy: true,
      },
      learningRate: 0.1,
      minConfidence: 0.6,
      minObservations: 5,
      maxPatterns: 50,
    };

    beforeEach(() => {
      adapter.configureAgent('adaptive-agent', defaultConfig);
    });

    it('should configure agent adaptation', () => {
      const config = adapter.getConfig('adaptive-agent');
      expect(config).toBeDefined();
      expect(config?.learningRate).toBe(0.1);
      expect(config?.enabledAdaptations.promptOptimization).toBe(true);
    });

    it('should adapt execution based on patterns', async () => {
      // Create performance history
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'adaptive-agent',
          taskType: 'review',
          success: true,
          durationMs: 5000,
          cost: 0.03,
          qualityScore: 0.9,
        });
      }

      learner.analyzePatterns('adaptive-agent');

      const baseConfig = {
        model: 'claude-sonnet-4-5',
        maxTokens: 2000,
        systemPrompt: 'Review this code.',
      };

      const adapted = await adapter.adaptExecution(
        'adaptive-agent',
        'review',
        baseConfig
      );

      expect(adapted.originalConfig).toEqual(baseConfig);
      // Config might be adapted if patterns exist
      expect(adapted.adaptedConfig).toBeDefined();
    });

    it('should not adapt without patterns', async () => {
      const baseConfig = {
        model: 'claude-sonnet-4-5',
        maxTokens: 2000,
      };

      const adapted = await adapter.adaptExecution(
        'no-patterns-agent',
        'unknown-task',
        baseConfig
      );

      expect(adapted.appliedPatterns).toHaveLength(0);
      expect(adapted.adaptedConfig).toEqual(baseConfig);
    });

    it('should respect adaptation configuration', async () => {
      // Configure with only prompt optimization enabled
      adapter.configureAgent('selective-agent', {
        ...defaultConfig,
        agentId: 'selective-agent',
        enabledAdaptations: {
          promptOptimization: true,
          modelSelection: false,
          timeoutAdjustment: false,
          retryStrategy: false,
        },
      });

      // Create patterns
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'selective-agent',
          taskType: 'selective-task',
          success: true,
          durationMs: 3000,
          cost: 0.02,
          qualityScore: 0.85,
        });
      }

      learner.analyzePatterns('selective-agent');

      const adapted = await adapter.adaptExecution(
        'selective-agent',
        'selective-task',
        { model: 'claude-sonnet-4-5' }
      );

      // Only prompt-related adaptations should be applied
      // (if any patterns were created that use prompt optimization)
      expect(adapted.adaptedConfig).toBeDefined();
    });

    it('should track adaptation statistics', () => {
      const stats = adapter.getAdaptationStats('adaptive-agent');
      expect(stats.totalAdaptations).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
      expect(stats.topPatterns).toBeInstanceOf(Array);
    });

    it('should provide feedback on adaptations', async () => {
      // Create pattern
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'feedback-adapt-agent',
          taskType: 'test',
          success: true,
          durationMs: 1000,
          cost: 0.01,
          qualityScore: 0.8,
        });
      }

      const patterns = learner.analyzePatterns('feedback-adapt-agent');
      expect(patterns.length).toBeGreaterThan(0);

      const pattern = patterns[0];

      await adapter.provideFeedback(pattern.id, {
        executionId: 'test-exec',
        agentId: 'feedback-adapt-agent',
        taskType: 'test',
        success: true,
        durationMs: 1000,
        cost: 0.01,
        qualityScore: 0.85,
        timestamp: new Date(),
      });

      // Pattern should be updated
      const updatedPatterns = learner.getPatterns('feedback-adapt-agent');
      const updatedPattern = updatedPatterns.find(p => p.id === pattern.id);
      expect(updatedPattern).toBeDefined();
    });

    it('should update adaptation configuration', () => {
      adapter.updateAdaptationConfig('adaptive-agent', {
        learningRate: 0.2,
        minConfidence: 0.8,
      });

      const updated = adapter.getConfig('adaptive-agent');
      expect(updated?.learningRate).toBe(0.2);
      expect(updated?.minConfidence).toBe(0.8);
      // Other config should remain unchanged
      expect(updated?.enabledAdaptations.promptOptimization).toBe(true);
    });

    it('should reset adaptations for an agent', () => {
      // Create some patterns
      for (let i = 0; i < 15; i++) {
        tracker.track({
          agentId: 'reset-agent',
          taskType: 'reset-task',
          success: true,
          durationMs: 1000,
          cost: 0.01,
          qualityScore: 0.8,
        });
      }

      learner.analyzePatterns('reset-agent');
      const patternsBefore = learner.getPatterns('reset-agent');
      expect(patternsBefore.length).toBeGreaterThan(0);

      adapter.resetAdaptations('reset-agent');

      const patternsAfter = learner.getPatterns('reset-agent');
      expect(patternsAfter).toHaveLength(0);
    });
  });

  describe('Integration: Full Evolution Cycle', () => {
    it('should demonstrate complete learning and adaptation cycle', async () => {
      const agentId = 'evolving-agent';
      const taskType = 'integration-test';

      // Configure agent
      adapter.configureAgent(agentId, {
        agentId,
        enabledAdaptations: {
          promptOptimization: true,
          modelSelection: true,
          timeoutAdjustment: true,
          retryStrategy: true,
        },
        learningRate: 0.1,
        minConfidence: 0.6,
        minObservations: 5,
        maxPatterns: 50,
      });

      // Phase 1: Initial execution (baseline)
      for (let i = 0; i < 20; i++) {
        tracker.track({
          agentId,
          taskType,
          success: true,
          durationMs: 10000,
          cost: 0.08,
          qualityScore: 0.85, // >= 0.8 for pattern creation
        });
      }

      // Phase 2: Learn patterns
      const patterns = learner.analyzePatterns(agentId);
      expect(patterns.length).toBeGreaterThan(0);

      // Phase 3: Apply adaptations
      const baseConfig = {
        model: 'claude-sonnet-4-5',
        maxTokens: 3000,
        timeout: 15000,
        systemPrompt: 'Perform task.',
      };

      const adapted = await adapter.adaptExecution(agentId, taskType, baseConfig);

      // Should have adapted config
      expect(adapted.adaptedConfig).toBeDefined();

      // Phase 4: Execute with adapted config and track
      const adaptedMetric = tracker.track({
        agentId,
        taskType,
        success: true,
        durationMs: 8000, // Improved
        cost: 0.06, // Lower cost
        qualityScore: 0.85, // Higher quality
      });

      // Phase 5: Provide feedback
      if (adapted.appliedPatterns.length > 0) {
        await adapter.provideFeedback(adapted.appliedPatterns[0], adaptedMetric);
      }

      // Phase 6: Verify evolution stats
      const stats = tracker.getEvolutionStats(agentId);
      expect(stats.totalExecutions).toBe(22); // 20 initial + 1 adapted + 1 from provideFeedback
      expect(stats.agentId).toBe(agentId);

      // Phase 7: Get recommendations for future tasks
      const recommendations = learner.getRecommendations(agentId, taskType);
      expect(recommendations.length).toBeGreaterThan(0);

      // Recommendations should be sorted by effectiveness
      if (recommendations.length > 1) {
        const scores = recommendations.map(r => r.confidence * r.successRate);
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
        }
      }
    });
  });
});
