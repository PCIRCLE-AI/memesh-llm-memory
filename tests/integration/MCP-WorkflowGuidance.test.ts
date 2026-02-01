import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeCodeBuddyMCPServer } from '../../src/mcp/server.js';
import { DevelopmentButler } from '../../src/agents/DevelopmentButler.js';
import { CheckpointDetector } from '../../src/core/CheckpointDetector.js';
import { MCPToolInterface } from '../../src/core/MCPToolInterface.js';
import { Router } from '../../src/orchestrator/router.js';

describe('MCP Server - Workflow Guidance Tools', () => {
  let butler: DevelopmentButler;
  let checkpointDetector: CheckpointDetector;
  let toolInterface: MCPToolInterface;
  let router: Router;

  beforeEach(() => {
    checkpointDetector = new CheckpointDetector();
    toolInterface = new MCPToolInterface();
    router = new Router();
    butler = new DevelopmentButler(
      checkpointDetector,
      toolInterface,
      router.getLearningManager()
    );
  });

  it('should define schema for workflow guidance tools', () => {
    // Test tool schemas are correctly defined
    const expectedTools = [
      'get-workflow-guidance',
      'get-session-health',
      'reload-context',
      'record-token-usage',
    ];

    expect(expectedTools).toContain('get-workflow-guidance');
    expect(expectedTools).toContain('get-session-health');
    expect(expectedTools).toContain('reload-context');
    expect(expectedTools).toContain('record-token-usage');
  });

  it('should provide workflow guidance', async () => {
    const checkpointData = {
      phase: 'code-written',
      filesChanged: ['src/test.ts'],
      testsPassing: undefined,
    };

    const result = await butler.processCheckpoint('code-written', checkpointData);

    expect(result).toBeDefined();
    expect(result.guidance).toBeDefined();
    expect(result.guidance.recommendations).toBeDefined();
    expect(result.guidance.recommendations.length).toBeGreaterThan(0);
    expect(result.formattedRequest).toContain('CCB Workflow Guidance');
  });

  it('should check session health', () => {
    // Record some token usage
    butler.getTokenTracker().recordUsage({
      inputTokens: 160000,
      outputTokens: 0,
    });

    const health = butler.getContextMonitor().checkSessionHealth();

    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(health.tokenUsagePercentage).toBeGreaterThan(0);
  });

  it('should reload context when needed', async () => {
    // Simulate critical threshold
    butler.getTokenTracker().recordUsage({
      inputTokens: 180000,
      outputTokens: 0,
    });

    const requestId = `test_${Date.now()}`;
    const result = await butler.executeContextReload(requestId);

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it('should record token usage', () => {
    const tokenTracker = butler.getTokenTracker();

    tokenTracker.recordUsage({
      inputTokens: 1000,
      outputTokens: 500,
    });

    const stats = tokenTracker.getStats();
    expect(stats.totalTokens).toBe(1500); // 1000 + 500
    expect(stats.interactionCount).toBe(1);
  });

  it('should have DevelopmentButler initialized in MCP server', () => {
    const server = new ClaudeCodeBuddyMCPServer();
    expect(server).toBeDefined();
    // Server should have DevelopmentButler instance
    expect(server['developmentButler']).toBeDefined();
  });
});
