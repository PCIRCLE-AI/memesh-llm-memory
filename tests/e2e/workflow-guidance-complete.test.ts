/**
 * E2E Test: Complete Workflow Guidance System
 *
 * Tests the full integration of:
 * - SessionTokenTracker - Token usage monitoring
 * - WorkflowGuidanceEngine - Phase-based recommendations
 * - SessionContextMonitor - Health monitoring
 * - ClaudeMdReloader - MCP resource reload with cooldown
 * - DevelopmentButler - Orchestrator integration
 * - MCP Server - 4 tools exposed
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { SmartAgentsMCPServer } from '../../src/mcp/server.js';

describe('Workflow Guidance System - Complete E2E', () => {
  let server: SmartAgentsMCPServer;

  beforeAll(() => {
    server = new SmartAgentsMCPServer();
  });

  // Reset token tracker before each test to avoid accumulation
  beforeEach(() => {
    const butler = (server as any).developmentButler;
    const tokenTracker = butler.getTokenTracker();

    // Reset token usage (internal state)
    (tokenTracker as any).totalTokens = 0;
    (tokenTracker as any).usageHistory = [];
    (tokenTracker as any).triggeredThresholds = new Set();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Complete Development Workflow
   *
   * Simulates realistic development flow:
   * 1. code-written checkpoint → Expect recommendation: "run-tests"
   * 2. test-complete checkpoint (tests passing) → Expect recommendation: "code-review"
   */
  it('should guide developer through complete workflow', async () => {
    const butler = (server as any).developmentButler;

    // ===== STEP 1: Code Written =====
    const codeWrittenResult = await butler.processCheckpoint('code-written', {
      filesChanged: ['src/api/users.ts', 'src/models/User.ts'],
      testsPassing: false,
    });

    // Verify we got workflow guidance
    expect(codeWrittenResult).toBeDefined();
    expect(codeWrittenResult.guidance).toBeDefined();
    expect(codeWrittenResult.guidance.recommendations).toBeInstanceOf(Array);
    expect(codeWrittenResult.guidance.recommendations.length).toBeGreaterThan(0);

    // Verify recommendation is to run tests
    const topRecommendation = codeWrittenResult.guidance.recommendations[0];
    expect(topRecommendation).toBeDefined();
    expect(topRecommendation.action).toBe('run-tests');
    expect(topRecommendation.priority).toBe('high');

    // Verify formatted request contains key information
    expect(codeWrittenResult.formattedRequest).toContain('Workflow Guidance');
    expect(codeWrittenResult.formattedRequest).toContain('run-tests');

    // ===== STEP 2: Tests Complete (Passing) =====
    const testCompleteResult = await butler.processCheckpoint('test-complete', {
      filesChanged: ['src/api/users.ts', 'src/models/User.ts'],
      testsPassing: true,
      reviewed: false, // Not reviewed yet
    });

    // Verify we got workflow guidance
    expect(testCompleteResult).toBeDefined();
    expect(testCompleteResult.guidance).toBeDefined();
    expect(testCompleteResult.guidance.recommendations).toBeInstanceOf(Array);
    expect(testCompleteResult.guidance.recommendations.length).toBeGreaterThan(0);

    // Verify recommendation is to do code review
    const testCompleteRecommendation = testCompleteResult.guidance.recommendations[0];
    expect(testCompleteRecommendation).toBeDefined();
    expect(testCompleteRecommendation.action).toBe('code-review');
  });

  /**
   * Test 2: Session Health Monitoring
   *
   * Simulates realistic token usage pattern:
   * - Record token usage multiple times
   * - Verify health status changes as tokens accumulate
   */
  it('should monitor session health and token usage', async () => {
    const butler = (server as any).developmentButler;
    const tokenTracker = butler.getTokenTracker();

    // Initial health check - should be healthy
    const initialHealth = butler.getContextMonitor().checkSessionHealth();
    expect(initialHealth).toBeDefined();
    expect(initialHealth.status).toBe('healthy');
    expect(initialHealth.tokenUsagePercentage).toBeDefined();
    expect(initialHealth.tokenUsagePercentage).toBeGreaterThanOrEqual(0);
    expect(initialHealth.tokenUsagePercentage).toBeLessThan(100);

    // Simulate incremental token usage (10 iterations)
    const iterations = 10;
    for (let i = 0; i < iterations; i++) {
      tokenTracker.recordUsage({
        inputTokens: 5000,
        outputTokens: 3000,
      });
    }

    // Check health after token usage
    const afterUsageHealth = butler.getContextMonitor().checkSessionHealth();
    expect(afterUsageHealth).toBeDefined();
    expect(afterUsageHealth.tokenUsagePercentage).toBeDefined();

    // Verify token usage increased
    expect(afterUsageHealth.tokenUsagePercentage).toBeGreaterThan(
      initialHealth.tokenUsagePercentage
    );

    // Verify tokens recorded (at least some usage)
    expect(afterUsageHealth.tokenUsagePercentage).toBeGreaterThan(0);
  });

  /**
   * Test 3: Critical Threshold Context Reload
   *
   * Simulates critical token usage and verifies:
   * - Critical status is detected
   * - Recommendation to reload-claude-md is provided
   * - Reload succeeds
   */
  it('should recommend context reload at critical threshold', async () => {
    const butler = (server as any).developmentButler;
    const tokenTracker = butler.getTokenTracker();

    // Record high token usage (180,000 tokens = 90%)
    tokenTracker.recordUsage({
      inputTokens: 100000,
      outputTokens: 80000,
    });

    // Check session health
    const health = butler.getContextMonitor().checkSessionHealth();

    // Verify critical status
    expect(health.status).toBe('critical');
    expect(health.tokenUsagePercentage).toBeGreaterThanOrEqual(85);

    // Verify critical recommendations exist
    expect(health.recommendations).toBeInstanceOf(Array);
    expect(health.recommendations.length).toBeGreaterThan(0);

    // Find reload-claude-md recommendation
    const reloadRecommendation = health.recommendations.find(
      (r) => r.action === 'reload-claude-md'
    );
    expect(reloadRecommendation).toBeDefined();
    expect(reloadRecommendation?.priority).toBe('critical');

    // Execute reload
    const reloadResult = await butler.executeContextReload('test-request-1');

    // Verify reload succeeded
    expect(reloadResult).toBeDefined();
    expect(reloadResult.success).toBe(true);
    expect(reloadResult.resourceUpdate).toBeDefined();

    // Verify resourceUpdate has correct structure (actual method name from implementation)
    expect(reloadResult.resourceUpdate.method).toBe('resources/updated');
    expect(reloadResult.resourceUpdate.params).toBeDefined();
    expect(reloadResult.resourceUpdate.params.uri).toBe('file://~/.claude/CLAUDE.md');
  });

  /**
   * Test 4: Cooldown Period Enforcement
   *
   * Verifies that:
   * - First reload succeeds
   * - Immediate second reload fails (cooldown)
   * - Reload succeeds after cooldown period
   */
  it('should enforce cooldown period between reloads', async () => {
    // Use fake timers to control time
    vi.useFakeTimers();

    // Create a fresh butler instance for this test to avoid cooldown conflicts
    const { SmartAgentsMCPServer } = await import('../../src/mcp/server.js');
    const testServer = new SmartAgentsMCPServer();
    const butler = (testServer as any).developmentButler;

    try {
      // ===== FIRST RELOAD =====
      const firstReload = await butler.executeContextReload('test-request-cooldown-1');

      // Verify first reload succeeds
      expect(firstReload).toBeDefined();
      expect(firstReload.success).toBe(true);
      expect(firstReload.resourceUpdate).toBeDefined();

      // ===== IMMEDIATE SECOND RELOAD (should fail) =====
      const secondReload = await butler.executeContextReload('test-request-cooldown-2');

      // Verify second reload fails with cooldown error
      expect(secondReload).toBeDefined();
      expect(secondReload.success).toBe(false);
      expect(secondReload.error).toBeDefined();
      expect(secondReload.error).toContain('cooldown');

      // ===== ADVANCE TIME BY 5 MINUTES =====
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 5 minutes + 1 second

      // ===== THIRD RELOAD (should succeed after cooldown) =====
      const thirdReload = await butler.executeContextReload('test-request-cooldown-3');

      // Verify third reload succeeds
      expect(thirdReload).toBeDefined();
      expect(thirdReload.success).toBe(true);
      expect(thirdReload.resourceUpdate).toBeDefined();
    } finally {
      // Restore real timers
      vi.useRealTimers();
    }
  });

  /**
   * Test 5: Workflow Guidance with Failing Tests
   *
   * Verifies that:
   * - code-written with failing tests recommends run-tests
   * - test-complete with failing tests does NOT recommend code-review
   */
  it('should handle failing tests appropriately', async () => {
    const butler = (server as any).developmentButler;

    // ===== Code written with failing tests =====
    const codeWrittenResult = await butler.processCheckpoint('code-written', {
      filesChanged: ['src/api/posts.ts'],
      testsPassing: false,
    });

    // Verify recommendation to run tests
    expect(codeWrittenResult.guidance.recommendations.length).toBeGreaterThan(0);
    expect(codeWrittenResult.guidance.recommendations[0]).toBeDefined();
    expect(codeWrittenResult.guidance.recommendations[0].action).toBe('run-tests');

    // ===== Tests complete but failing =====
    const testCompleteResult = await butler.processCheckpoint('test-complete', {
      filesChanged: ['src/api/posts.ts'],
      testsPassing: false,
    });

    // Verify recommendation is NOT code-review (should be fix-tests)
    expect(testCompleteResult.guidance.recommendations.length).toBeGreaterThan(0);
    const testCompleteRecommendation = testCompleteResult.guidance.recommendations[0];
    expect(testCompleteRecommendation).toBeDefined();
    expect(testCompleteRecommendation.action).toBe('fix-tests');
  });

  /**
   * Test 6: Session Health Warning Levels
   *
   * Verifies that:
   * - Healthy: 0-80% token usage
   * - Warning: 80-90% token usage
   * - Critical: 90-100% token usage
   */
  it('should transition through health warning levels', async () => {
    const butler = (server as any).developmentButler;
    const tokenTracker = butler.getTokenTracker();

    // Ensure clean state (should already be reset by beforeEach, but double-check)
    (tokenTracker as any).totalTokens = 0;
    (tokenTracker as any).usageHistory = [];
    (tokenTracker as any).triggeredThresholds = new Set();

    // ===== HEALTHY (40% usage = 80,000 tokens) =====
    tokenTracker.recordUsage({
      inputTokens: 40000,
      outputTokens: 40000,
    });

    const healthyStatus = butler.getContextMonitor().checkSessionHealth();
    expect(healthyStatus.status).toBe('healthy');
    expect(healthyStatus.tokenUsagePercentage).toBeGreaterThanOrEqual(35);
    expect(healthyStatus.tokenUsagePercentage).toBeLessThan(80);

    // ===== WARNING (85% usage = total 170,000 tokens) =====
    // Add 90,000 more tokens (80,000 + 90,000 = 170,000)
    tokenTracker.recordUsage({
      inputTokens: 45000,
      outputTokens: 45000,
    });

    const warningStatus = butler.getContextMonitor().checkSessionHealth();
    expect(warningStatus.status).toBe('warning');
    expect(warningStatus.tokenUsagePercentage).toBeGreaterThanOrEqual(80);
    expect(warningStatus.tokenUsagePercentage).toBeLessThan(90);

    // ===== CRITICAL (92% usage = total 184,000 tokens) =====
    // Add 14,000 more tokens (170,000 + 14,000 = 184,000)
    tokenTracker.recordUsage({
      inputTokens: 7000,
      outputTokens: 7000,
    });

    const criticalStatus = butler.getContextMonitor().checkSessionHealth();
    expect(criticalStatus.status).toBe('critical');
    expect(criticalStatus.tokenUsagePercentage).toBeGreaterThanOrEqual(90);
  });
});
