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

  it('should analyze workflow context and generate recommendations', async () => {
    const context = {
      phase: 'code-written' as const,
      filesChanged: ['src/api/users.ts'],
      testsPassing: false,
    };

    const guidance = await engine.analyzeWorkflow(context);

    expect(guidance.recommendations).toBeDefined();
    expect(guidance.recommendations.length).toBeGreaterThan(0);
    expect(guidance.confidence).toBeGreaterThanOrEqual(0);
    expect(guidance.confidence).toBeLessThanOrEqual(1);
  });

  it('should suggest running tests when code written but tests not run', async () => {
    const context = {
      phase: 'code-written' as const,
      filesChanged: ['src/api/users.ts'],
      testsPassing: false,
    };

    const guidance = await engine.analyzeWorkflow(context);

    expect(guidance.recommendations).toContainEqual(
      expect.objectContaining({
        action: 'run-tests',
        priority: 'high',
      })
    );
  });

  it('should suggest code review when tests passing but not reviewed', async () => {
    const context = {
      phase: 'test-complete' as const,
      filesChanged: ['src/api/users.ts'],
      testsPassing: true,
      reviewed: false,
    };

    const guidance = await engine.analyzeWorkflow(context);

    expect(guidance.recommendations).toContainEqual(
      expect.objectContaining({
        action: 'code-review',
      })
    );
  });

  it('should integrate with LearningManager patterns', async () => {
    // Mock successful pattern from past with correct structure
    vi.spyOn(mockLearningManager, 'getPatterns').mockReturnValue([
      {
        type: 'success',
        agentId: 'workflow-guidance',
        taskType: 'workflow-analysis',
        description: 'Successful workflow pattern',
        conditions: {
          context: { phase: 'test-complete' },
          taskComplexity: 'medium',
        },
        action: {
          type: 'adjust_prompt',
          parameters: { priority: 'high' },
        },
        confidence: 0.9,
        observationCount: 10,
        successCount: 9,
        successRate: 0.9,
        lastObserved: new Date(),
        metadata: {},
      },
    ]);

    const context = {
      phase: 'test-complete' as const,
      testsPassing: false,
    };

    const guidance = await engine.analyzeWorkflow(context);

    expect(guidance.learnedFromPatterns).toBe(true);
    expect(guidance.reasoning).toContainEqual(
      expect.stringContaining('learned pattern')
    );
  });

  it('should throw error for null context', async () => {
    await expect(engine.analyzeWorkflow(null as any)).rejects.toThrow(
      'WorkflowContext is required'
    );
  });

  it('should throw error for invalid phase', async () => {
    const context = {
      phase: 'invalid-phase' as any,
    };
    await expect(engine.analyzeWorkflow(context)).rejects.toThrow(
      'Invalid workflow phase'
    );
  });

  it('should distinguish between tests not run vs tests failed', async () => {
    // Tests not run (undefined)
    const contextNotRun = {
      phase: 'code-written' as const,
      testsPassing: undefined,
    };
    const guidanceNotRun = await engine.analyzeWorkflow(contextNotRun);
    expect(guidanceNotRun.recommendations[0].reasoning).toContain(
      'not been run'
    );

    // Tests failed (false)
    const contextFailed = {
      phase: 'code-written' as const,
      testsPassing: false,
    };
    const guidanceFailed = await engine.analyzeWorkflow(contextFailed);
    expect(guidanceFailed.recommendations[0].reasoning).toContain('failing');
  });
});
