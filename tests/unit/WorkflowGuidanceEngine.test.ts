// tests/unit/WorkflowGuidanceEngine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowGuidanceEngine } from '../../src/core/WorkflowGuidanceEngine.js';
import { LearningManager } from '../../src/evolution/LearningManager.js';
import type { PerformanceTracker } from '../../src/evolution/PerformanceTracker.js';

describe('WorkflowGuidanceEngine', () => {
  let engine: WorkflowGuidanceEngine;
  let mockLearningManager: LearningManager;

  beforeEach(() => {
    const mockTracker = {} as PerformanceTracker;
    mockLearningManager = new LearningManager(mockTracker);
    engine = new WorkflowGuidanceEngine(mockLearningManager);
  });

  it('should analyze workflow context and generate recommendations', () => {
    const context = {
      phase: 'code-written' as const,
      filesChanged: ['src/api/users.ts'],
      testsPassing: false,
    };

    const guidance = engine.analyzeWorkflow(context);

    expect(guidance.recommendations).toBeDefined();
    expect(guidance.recommendations.length).toBeGreaterThan(0);
    expect(guidance.confidence).toBeGreaterThanOrEqual(0);
    expect(guidance.confidence).toBeLessThanOrEqual(1);
  });

  it('should suggest running tests when code written but tests not run', () => {
    const context = {
      phase: 'code-written' as const,
      filesChanged: ['src/api/users.ts'],
      testsPassing: false,
    };

    const guidance = engine.analyzeWorkflow(context);

    expect(guidance.recommendations).toContainEqual(
      expect.objectContaining({
        action: 'run-tests',
        priority: 'high',
      })
    );
  });

  it('should suggest code review when tests passing but not reviewed', () => {
    const context = {
      phase: 'test-complete' as const,
      filesChanged: ['src/api/users.ts'],
      testsPassing: true,
      reviewed: false,
    };

    const guidance = engine.analyzeWorkflow(context);

    expect(guidance.recommendations).toContainEqual(
      expect.objectContaining({
        action: 'code-review',
      })
    );
  });

  it('should integrate with LearningManager patterns', () => {
    // Mock successful pattern from past
    vi.spyOn(mockLearningManager, 'getPatterns').mockReturnValue([
      {
        agentId: 'test-automator',
        patternType: 'success',
        conditions: ['tests-failing'],
        actions: ['fix-tests', 'run-again'],
        successRate: 0.9,
        observationCount: 10,
        lastObserved: new Date(),
      },
    ]);

    const context = {
      phase: 'test-complete' as const,
      testsPassing: false,
    };

    const guidance = engine.analyzeWorkflow(context);

    expect(guidance.recommendations).toContainEqual(
      expect.objectContaining({
        reasoning: expect.stringContaining('learned pattern'),
      })
    );
  });
});
