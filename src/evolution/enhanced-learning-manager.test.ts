import { describe, it, expect, beforeEach } from 'vitest';
import { LearningManager } from './LearningManager.js';
import { PerformanceTracker } from './PerformanceTracker.js';

describe('Enhanced LearningManager', () => {
  let learningManager: LearningManager;
  let performanceTracker: PerformanceTracker;

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

  it('should learn context-aware patterns', async () => {
    // Track multiple executions with different contexts
    for (let i = 0; i < 5; i++) {
      performanceTracker.track({
        executionId: `exec-${i}`,
        agentId: 'code-reviewer',
        taskType: 'review_large_pr',
        success: true,
        durationMs: 5000,
        cost: 0.05,
        qualityScore: 0.9,
        timestamp: new Date(),
        metadata: {
          context: {
            complexity: 'high',
            files_changed: 50,
          },
        },
      });
    }

    const patterns = await learningManager.identifyContextualPatterns(
      'code-reviewer'
    );

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].context).toBeDefined();
    expect(patterns[0].context.task_type).toBe('review_large_pr');
  });

  it('should optimize for multiple objectives', async () => {
    // Add varied performance data
    performanceTracker.track({
      executionId: 'exec-fast',
      agentId: 'agent-1',
      taskType: 'task-1',
      success: true,
      durationMs: 1000, // Fast
      cost: 0.1, // Expensive
      qualityScore: 0.7, // OK quality
      timestamp: new Date(),
    });

    performanceTracker.track({
      executionId: 'exec-quality',
      agentId: 'agent-1',
      taskType: 'task-1',
      success: true,
      durationMs: 3000, // Slow
      cost: 0.01, // Cheap
      qualityScore: 0.95, // High quality
      timestamp: new Date(),
    });

    const optimized = learningManager.findOptimalConfiguration('agent-1', {
      accuracy: 0.6, // Prefer accuracy
      speed: 0.2,
      cost: 0.2,
    });

    expect(optimized).toBeDefined();
    expect(optimized!.objectives.accuracy).toBeGreaterThan(0.8);
  });

  it('should generate explanations for patterns', async () => {
    // Track enough data to learn a pattern
    for (let i = 0; i < 5; i++) {
      performanceTracker.track({
        executionId: `exec-debug-${i}`,
        agentId: 'debugger',
        taskType: 'fix_bug',
        success: true,
        durationMs: 2000,
        cost: 0.02,
        qualityScore: 0.85,
        timestamp: new Date(),
      });
    }

    const patterns = await learningManager.identifyContextualPatterns(
      'debugger'
    );
    const pattern = patterns[0];

    expect(pattern).toBeDefined();

    const explanation = learningManager.explainPattern(pattern.id);

    expect(explanation).toBeDefined();
    expect(explanation!.summary).toBeDefined();
    expect(explanation!.reasoning.length).toBeGreaterThan(0);
  });
});
