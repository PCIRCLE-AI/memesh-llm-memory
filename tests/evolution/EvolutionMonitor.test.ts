/**
 * EvolutionMonitor Test
 *
 * Tests for evolution monitoring and dashboard metrics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionMonitor } from '../../src/evolution/EvolutionMonitor.js';
import { PerformanceTracker } from '../../src/evolution/PerformanceTracker.js';
import { LearningManager } from '../../src/evolution/LearningManager.js';
import { AdaptationEngine } from '../../src/evolution/AdaptationEngine.js';

describe('EvolutionMonitor', () => {
  let monitor: EvolutionMonitor;
  let performanceTracker: PerformanceTracker;
  let learningManager: LearningManager;
  let adaptationEngine: AdaptationEngine;

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
    learningManager = new LearningManager(performanceTracker);
    adaptationEngine = new AdaptationEngine(learningManager, performanceTracker);
    monitor = new EvolutionMonitor(performanceTracker, learningManager, adaptationEngine);
  });

  describe('getDashboardSummary', () => {
    it('should get dashboard summary', () => {
      const summary = monitor.getDashboardSummary();

      expect(summary).toBeDefined();
      expect(summary.totalAgents).toBeGreaterThan(0);
      expect(summary.agentsWithPatterns).toBeGreaterThanOrEqual(0);
      expect(summary.totalPatterns).toBeGreaterThanOrEqual(0);
      expect(summary.totalExecutions).toBeGreaterThanOrEqual(0);
      expect(summary.averageSuccessRate).toBeGreaterThanOrEqual(0);
      expect(summary.topImprovingAgents).toBeDefined();
      expect(Array.isArray(summary.topImprovingAgents)).toBe(true);
    });

    it('should have correct structure', () => {
      const summary = monitor.getDashboardSummary();

      expect(summary).toHaveProperty('totalAgents');
      expect(summary).toHaveProperty('agentsWithPatterns');
      expect(summary).toHaveProperty('totalPatterns');
      expect(summary).toHaveProperty('totalExecutions');
      expect(summary).toHaveProperty('averageSuccessRate');
      expect(summary).toHaveProperty('topImprovingAgents');
    });
  });

  describe('getAgentStats', () => {
    it('should get agent evolution stats', () => {
      const stats = monitor.getAgentStats('code-reviewer');

      expect(stats).toBeDefined();
      expect(stats.agentId).toBe('code-reviewer');
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(0);
    });

    it('should return stats for any agent', () => {
      const agents = ['research-agent', 'general-agent', 'test-writer'];

      agents.forEach(agentId => {
        const stats = monitor.getAgentStats(agentId);
        expect(stats.agentId).toBe(agentId);
      });
    });
  });

  describe('getLearningProgress', () => {
    it('should get learning progress for all agents', () => {
      const progress = monitor.getLearningProgress();
      const summary = monitor.getDashboardSummary();

      expect(progress).toBeDefined();
      expect(Array.isArray(progress)).toBe(true);
      expect(progress.length).toBe(summary.totalAgents);
    });

    it('should have correct progress structure', () => {
      const progress = monitor.getLearningProgress();

      progress.forEach(p => {
        expect(p).toHaveProperty('agentId');
        expect(p).toHaveProperty('totalExecutions');
        expect(p).toHaveProperty('learnedPatterns');
        expect(p).toHaveProperty('appliedAdaptations');
        expect(p).toHaveProperty('successRateImprovement');
        expect(p).toHaveProperty('lastLearningDate');
      });
    });

    it('should show zero progress for unused agents', () => {
      const progress = monitor.getLearningProgress();

      // At least some agents should have zero executions initially
      const unusedAgents = progress.filter(p => p.totalExecutions === 0);
      expect(unusedAgents.length).toBeGreaterThan(0);

      unusedAgents.forEach(agent => {
        expect(agent.learnedPatterns).toBe(0);
        expect(agent.appliedAdaptations).toBe(0);
        expect(agent.lastLearningDate).toBeNull();
      });
    });
  });

  describe('formatDashboard', () => {
    it('should format dashboard as string', () => {
      const formatted = monitor.formatDashboard();

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should include key metrics in formatted output', () => {
      const formatted = monitor.formatDashboard();
      const summary = monitor.getDashboardSummary();

      expect(formatted).toContain('Evolution Dashboard');
      expect(formatted).toContain('Overview');
      expect(formatted).toContain('Total Agents');
      expect(formatted).toContain(String(summary.totalAgents));
    });
  });
});
