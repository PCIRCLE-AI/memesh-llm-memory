import { describe, it, expect, beforeEach } from 'vitest';
import { DevelopmentButler } from '../../src/agents/DevelopmentButler.js';
import { CheckpointDetector } from '../../src/core/CheckpointDetector.js';
import { MCPToolInterface } from '../../src/core/MCPToolInterface.js';
import { LearningManager } from '../../src/evolution/LearningManager.js';
import type { PerformanceTracker } from '../../src/evolution/PerformanceTracker.js';

describe('DevelopmentButler - Context Monitor Integration', () => {
  let butler: DevelopmentButler;
  let checkpointDetector: CheckpointDetector;
  let toolInterface: MCPToolInterface;
  let learningManager: LearningManager;

  beforeEach(() => {
    checkpointDetector = new CheckpointDetector();
    toolInterface = new MCPToolInterface();

    // Create learning manager with mock performance tracker
    const mockTracker = {} as PerformanceTracker;
    learningManager = new LearningManager(mockTracker);

    butler = new DevelopmentButler(checkpointDetector, toolInterface, learningManager);
  });

  it('should initialize session token tracking', () => {
    const tokenTracker = butler.getTokenTracker();
    expect(tokenTracker).toBeDefined();
    expect(tokenTracker.getTotalTokens()).toBe(0);
  });

  it('should initialize context monitor', () => {
    const contextMonitor = butler.getContextMonitor();
    expect(contextMonitor).toBeDefined();
  });

  it('should trigger context monitoring on checkpoints', async () => {
    // Simulate high token usage (80%)
    butler.getTokenTracker().recordUsage({ inputTokens: 160000, outputTokens: 0 });

    const result = await butler.processCheckpoint('code-written', {
      filesChanged: ['src/test.ts'],
    });

    expect(result.sessionHealth).toBeDefined();
    expect(result.sessionHealth.status).toBe('warning');
  });

  it('should recommend CLAUDE.md reload at critical threshold', async () => {
    // Simulate critical token usage (90%)
    butler.getTokenTracker().recordUsage({ inputTokens: 180000, outputTokens: 0 });

    const result = await butler.processCheckpoint('code-written', {
      filesChanged: ['src/test.ts'],
    });

    expect(result.sessionHealth.status).toBe('critical');
    expect(result.sessionHealth.recommendations).toContainEqual(
      expect.objectContaining({
        action: 'reload-claude-md',
        priority: 'critical',
      })
    );
  });

  it('should execute CLAUDE.md reload when user confirms', async () => {
    butler.getTokenTracker().recordUsage({ inputTokens: 180000, outputTokens: 0 });

    const result = await butler.processCheckpoint('code-written', {
      filesChanged: ['src/test.ts'],
    });

    // Simulate user confirming reload
    const reloadResult = await butler.executeContextReload(result.requestId);

    expect(reloadResult.success).toBe(true);
    expect(reloadResult.resourceUpdate).toMatchObject({
      method: 'resources/updated',
    });
  });

  it('should respect reload cooldown', async () => {
    // First reload
    const firstReload = await butler.executeContextReload('test-request-1');
    expect(firstReload.success).toBe(true);

    // Immediate second reload should fail
    const secondReload = await butler.executeContextReload('test-request-2');
    expect(secondReload.success).toBe(false);
    expect(secondReload.error).toContain('cooldown');
  });

  it('should include critical warnings in formatted request', async () => {
    // Simulate critical token usage
    butler.getTokenTracker().recordUsage({ inputTokens: 185000, outputTokens: 0 });

    const result = await butler.processCheckpoint('code-written', {
      filesChanged: ['src/test.ts'],
    });

    expect(result.formattedRequest).toContain('🚨 CRITICAL SESSION ALERTS');
    expect(result.formattedRequest).toContain('⚠️');
  });
});
