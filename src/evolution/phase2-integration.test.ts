/**
 * Phase 2 Integration Test - End-to-End Advanced Learning Features
 *
 * Tests the complete learning cycle:
 * 1. Performance tracking
 * 2. Context-aware pattern learning
 * 3. Pattern storage and retrieval
 * 4. Multi-objective optimization
 * 5. Pattern explainability
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceTracker } from './PerformanceTracker.js';
import { LearningManager } from './LearningManager.js';
import type { PerformanceMetrics } from './types.js';

describe('Phase 2 Integration: Advanced Learning System', () => {
  let performanceTracker: PerformanceTracker;
  let learningManager: LearningManager;

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
    learningManager = new LearningManager(performanceTracker, {
      minObservations: 3,
      minConfidence: 0.6,
      successRateThreshold: 0.7,
      failureRateThreshold: 0.3,
      maxPatternsPerAgent: 100,
    });
  });

  it('should complete full learning and adaptation cycle', async () => {
    // === Phase 1: Track Performance ===
    const agentId = 'full-stack-developer';

    // Track multiple executions with varying contexts
    const executions: Partial<PerformanceMetrics>[] = [
      // High complexity tasks - slow but high quality
      {
        executionId: 'exec-1',
        agentId,
        taskType: 'implement_feature',
        success: true,
        durationMs: 15000,
        cost: 0.05,
        qualityScore: 0.95,
        timestamp: new Date(),
        metadata: { context: { complexity: 'high', files_changed: 10 } },
      },
      {
        executionId: 'exec-2',
        agentId,
        taskType: 'implement_feature',
        success: true,
        durationMs: 14800,
        cost: 0.048,
        qualityScore: 0.92,
        timestamp: new Date(),
        metadata: { context: { complexity: 'high', files_changed: 12 } },
      },
      {
        executionId: 'exec-3',
        agentId,
        taskType: 'implement_feature',
        success: true,
        durationMs: 15200,
        cost: 0.052,
        qualityScore: 0.94,
        timestamp: new Date(),
        metadata: { context: { complexity: 'high', files_changed: 8 } },
      },

      // Medium complexity tasks - faster but lower quality
      {
        executionId: 'exec-4',
        agentId,
        taskType: 'fix_bug',
        success: true,
        durationMs: 2000,
        cost: 0.02,
        qualityScore: 0.85,
        timestamp: new Date(),
        metadata: { context: { complexity: 'medium', files_changed: 2 } },
      },
      {
        executionId: 'exec-5',
        agentId,
        taskType: 'fix_bug',
        success: true,
        durationMs: 1800,
        cost: 0.018,
        qualityScore: 0.82,
        timestamp: new Date(),
        metadata: { context: { complexity: 'medium', files_changed: 1 } },
      },
      {
        executionId: 'exec-6',
        agentId,
        taskType: 'fix_bug',
        success: true,
        durationMs: 2200,
        cost: 0.022,
        qualityScore: 0.88,
        timestamp: new Date(),
        metadata: { context: { complexity: 'medium', files_changed: 3 } },
      },
    ];

    executions.forEach((exec) =>
      performanceTracker.track(exec as PerformanceMetrics)
    );

    // === Phase 2: Learn Context-Aware Patterns ===
    const patterns = await learningManager.identifyContextualPatterns(agentId);

    // Should identify patterns for both task types
    expect(patterns.length).toBeGreaterThanOrEqual(2);

    // Find patterns
    const featurePattern = patterns.find(
      (p) => p.context.task_type === 'implement_feature'
    );
    const bugfixPattern = patterns.find(
      (p) => p.context.task_type === 'fix_bug'
    );

    // Verify feature implementation pattern
    expect(featurePattern).toBeDefined();
    expect(featurePattern!.type).toBe('success');
    expect(featurePattern!.context.complexity).toBe('high');
    expect(featurePattern!.success_rate).toBeGreaterThan(0.95);
    expect(featurePattern!.observations).toBeGreaterThanOrEqual(3);
    expect(featurePattern!.avg_execution_time).toBeCloseTo(15000, -2);

    // Verify bugfix pattern
    expect(bugfixPattern).toBeDefined();
    expect(bugfixPattern!.type).toBe('success');
    expect(bugfixPattern!.context.complexity).toBe('low');
    expect(bugfixPattern!.success_rate).toBeGreaterThan(0.95);
    expect(bugfixPattern!.observations).toBeGreaterThanOrEqual(3);
    expect(bugfixPattern!.avg_execution_time).toBeCloseTo(2000, -2);

    // === Phase 3: Multi-Objective Optimization ===
    // Scenario: User wants high quality, balanced speed and cost
    const qualityFocused = learningManager.findOptimalConfiguration(agentId, {
      accuracy: 0.7, // High weight on quality
      speed: 0.15,
      cost: 0.15,
    });

    expect(qualityFocused).toBeDefined();
    expect(qualityFocused!.objectives.accuracy).toBeGreaterThan(0.8);

    // Scenario: User wants fast execution, balanced quality and cost
    const speedFocused = learningManager.findOptimalConfiguration(agentId, {
      accuracy: 0.15,
      speed: 0.7, // High weight on speed
      cost: 0.15,
    });

    expect(speedFocused).toBeDefined();
    // Speed is 1/duration, so shorter duration = higher speed
    // If same candidate is optimal for both, speed will be equal
    expect(speedFocused!.objectives.speed).toBeGreaterThanOrEqual(
      qualityFocused!.objectives.speed
    );

    // === Phase 4: Pattern Explainability ===
    const featureExplanation = learningManager.explainPattern(
      featurePattern!.id
    );

    expect(featureExplanation).toBeDefined();

    // Summary should mention the agent and task type
    expect(featureExplanation!.summary).toContain('full-stack-developer');
    expect(featureExplanation!.summary).toContain('implement_feature');

    // Reasoning should explain observations and confidence
    expect(featureExplanation!.reasoning.length).toBeGreaterThan(0);
    expect(
      featureExplanation!.reasoning.some((r) => r.includes('observed'))
    ).toBe(true);
    expect(
      featureExplanation!.reasoning.some((r) => r.includes('confidence'))
    ).toBe(true);

    // Recommendation should be actionable
    expect(featureExplanation!.recommendation).toBeDefined();
    expect(featureExplanation!.recommendation.length).toBeGreaterThan(0);

    // Confidence explanation should interpret the confidence level
    expect(featureExplanation!.confidence_explanation).toContain('confidence');

    // Context description should describe when pattern applies
    expect(featureExplanation!.context_description).toContain(
      'full-stack-developer'
    );
    expect(featureExplanation!.context_description).toContain(
      'implement_feature'
    );
  });

  it('should handle mixed success/failure patterns', async () => {
    const agentId = 'test-automator';

    // Create LearningManager with lower threshold for this test
    const testPerformanceTracker = new PerformanceTracker();
    const testLearningManager = new LearningManager(testPerformanceTracker, {
      minObservations: 3,
      minConfidence: 0.6,
      successRateThreshold: 0.6, // Lower threshold to allow 60% success rate
      failureRateThreshold: 0.3,
      maxPatternsPerAgent: 100,
    });

    // Track executions with some failures
    const executions: Partial<PerformanceMetrics>[] = [
      // Successful test runs
      {
        executionId: 'test-1',
        agentId,
        taskType: 'run_tests',
        success: true,
        durationMs: 3000,
        cost: 0.03,
        qualityScore: 0.9,
        timestamp: new Date(),
        metadata: { context: { test_suite: 'unit', files: 50 } },
      },
      {
        executionId: 'test-2',
        agentId,
        taskType: 'run_tests',
        success: true,
        durationMs: 2800,
        cost: 0.028,
        qualityScore: 0.88,
        timestamp: new Date(),
        metadata: { context: { test_suite: 'unit', files: 45 } },
      },
      {
        executionId: 'test-3',
        agentId,
        taskType: 'run_tests',
        success: true,
        durationMs: 3200,
        cost: 0.032,
        qualityScore: 0.92,
        timestamp: new Date(),
        metadata: { context: { test_suite: 'unit', files: 55 } },
      },

      // Failed test runs (below threshold)
      {
        executionId: 'test-4',
        agentId,
        taskType: 'run_tests',
        success: false,
        durationMs: 1000,
        cost: 0.01,
        qualityScore: 0.3,
        timestamp: new Date(),
        metadata: { context: { test_suite: 'unit', files: 100 } },
      },
      {
        executionId: 'test-5',
        agentId,
        taskType: 'run_tests',
        success: false,
        durationMs: 1200,
        cost: 0.012,
        qualityScore: 0.35,
        timestamp: new Date(),
        metadata: { context: { test_suite: 'unit', files: 120 } },
      },
    ];

    executions.forEach((exec) =>
      testPerformanceTracker.track(exec as PerformanceMetrics)
    );

    const patterns = await testLearningManager.identifyContextualPatterns(agentId);

    // Should identify success pattern (3 successes meet threshold)
    expect(patterns.length).toBeGreaterThanOrEqual(1);

    const successPattern = patterns.find((p) => p.type === 'success');
    expect(successPattern).toBeDefined();
    expect(successPattern!.success_rate).toBeCloseTo(0.6, 1); // 3/5 = 0.6
    expect(successPattern!.observations).toBe(3);
  });

  it('should preserve patterns across multiple learning cycles', async () => {
    const agentId = 'data-analyst';

    // First learning cycle
    for (let i = 0; i < 3; i++) {
      performanceTracker.track({
        executionId: `cycle1-${i}`,
        agentId,
        taskType: 'analyze_data',
        success: true,
        durationMs: 4000,
        cost: 0.04,
        qualityScore: 0.9,
        timestamp: new Date(),
      });
    }

    const patterns1 = await learningManager.identifyContextualPatterns(
      agentId
    );
    expect(patterns1.length).toBe(1);
    const pattern1Id = patterns1[0].id;

    // Second learning cycle (more data)
    for (let i = 0; i < 2; i++) {
      performanceTracker.track({
        executionId: `cycle2-${i}`,
        agentId,
        taskType: 'analyze_data',
        success: true,
        durationMs: 3800,
        cost: 0.038,
        qualityScore: 0.92,
        timestamp: new Date(),
      });
    }

    const patterns2 = await learningManager.identifyContextualPatterns(
      agentId
    );
    expect(patterns2.length).toBe(1);

    // Pattern should be updated with more observations
    const updatedPattern = patterns2[0];
    expect(updatedPattern.observations).toBe(5); // 3 + 2
    expect(updatedPattern.context.task_type).toBe('analyze_data');

    // Can still explain the pattern
    const explanation = learningManager.explainPattern(updatedPattern.id);
    expect(explanation).toBeDefined();
    expect(explanation!.reasoning.some((r) => r.includes('5 times'))).toBe(
      true
    );
  });
});
