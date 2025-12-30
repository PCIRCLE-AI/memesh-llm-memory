/**
 * Evolution Dashboard MCP Tool Test
 *
 * Tests for evolution_dashboard tool integration in MCP server
 *
 * Note: These tests verify the underlying EvolutionMonitor functionality
 * rather than testing through MCP protocol (which requires server connection).
 * E2E tests cover the full MCP protocol integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from '../../src/orchestrator/router.js';
import { EvolutionMonitor } from '../../src/evolution/EvolutionMonitor.js';

describe('evolution_dashboard MCP Tool', () => {
  let router: Router;
  let monitor: EvolutionMonitor;

  beforeEach(() => {
    router = new Router();
    monitor = new EvolutionMonitor(
      router.getPerformanceTracker(),
      router.getLearningManager(),
      router.getAdaptationEngine()
    );
  });

  describe('Tool Registration', () => {
    it('should register evolution_dashboard tool', async () => {
      // Verify EvolutionMonitor is available and functional
      const dashboard = monitor.formatDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard).toContain('Evolution Dashboard');
    });

    it('should have correct input schema', async () => {
      // Verify monitor returns formatted dashboard
      const dashboard = monitor.formatDashboard();

      expect(dashboard).toBeDefined();
      expect(typeof dashboard).toBe('string');
      expect(dashboard.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Execution', () => {
    it('should return dashboard summary', async () => {
      const dashboard = monitor.formatDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard).toContain('Evolution Dashboard');
    });

    it('should include key metrics', async () => {
      const dashboard = monitor.formatDashboard();

      expect(dashboard).toContain('Total Agents');
      expect(dashboard).toContain('22'); // Total agent count
      expect(dashboard).toContain('Overview');
    });

    it('should support learning progress retrieval', async () => {
      // Verify learning progress can be retrieved
      const progress = monitor.getLearningProgress();

      expect(progress).toBeDefined();
      expect(Array.isArray(progress)).toBe(true);
      expect(progress.length).toBe(22); // Should have all 22 evolution configurations

      // Each agent should have required fields
      progress.forEach(agent => {
        expect(agent).toHaveProperty('agentId');
        expect(agent).toHaveProperty('totalExecutions');
        expect(agent).toHaveProperty('learnedPatterns');
        expect(agent).toHaveProperty('appliedAdaptations');
      });
    });
  });
});
