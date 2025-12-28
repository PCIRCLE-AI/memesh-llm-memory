/**
 * Evolution System End-to-End Integration Test
 *
 * Tests complete workflow:
 * - Task routing through Router
 * - Evolution configuration from AgentEvolutionConfig
 * - Performance tracking
 * - Learning manager pattern detection
 * - Adaptation engine applying patterns
 * - Evolution monitor dashboard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from '../../src/orchestrator/router.js';
import { Task } from '../../src/orchestrator/types.js';
import { EvolutionMonitor } from '../../src/evolution/EvolutionMonitor.js';

describe('Evolution System E2E Integration', () => {
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

  describe('Complete Workflow', () => {
    it('should route task and track performance', async () => {
      const task: Task = {
        id: 'test-task-1',
        description: 'Review code quality for authentication module',
        priority: 5,
      };

      const result = await router.routeTask(task);

      // Verify routing
      expect(result.analysis).toBeDefined();
      expect(result.routing).toBeDefined();
      expect(result.routing.selectedAgent).toBeDefined();

      // Verify performance tracking
      const stats = router
        .getPerformanceTracker()
        .getEvolutionStats(result.routing.selectedAgent);
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });

    it('should integrate evolution configuration', async () => {
      const task: Task = {
        id: 'test-task-2',
        description: 'Debug authentication error',
        priority: 5,
      };

      const result = await router.routeTask(task);

      // Verify adaptation
      expect(result.adaptedExecution).toBeDefined();
      expect(result.adaptedExecution?.baseExecution).toBeDefined();

      // Check agent has evolution configuration
      const agentId = result.routing.selectedAgent;
      const stats = router.getPerformanceTracker().getEvolutionStats(agentId);
      expect(stats.agentId).toBe(agentId);
    });

    it('should collect performance metrics across multiple tasks', async () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Review authentication code',
          priority: 5,
        },
        {
          id: 'task-2',
          description: 'Debug login error',
          priority: 5,
        },
        {
          id: 'task-3',
          description: 'Optimize database query',
          priority: 5,
        },
      ];

      for (const task of tasks) {
        await router.routeTask(task);
      }

      // Verify performance tracking
      const summary = monitor.getDashboardSummary();
      expect(summary.totalExecutions).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Dashboard Integration', () => {
    it('should show evolution progress in dashboard', async () => {
      // Execute several tasks
      const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i + 1}`,
        description: `Code review task ${i + 1}`,
        priority: 5,
      }));

      for (const task of tasks) {
        await router.routeTask(task);
      }

      // Get dashboard summary
      const summary = monitor.getDashboardSummary();

      expect(summary.totalAgents).toBe(22);
      expect(summary.totalExecutions).toBeGreaterThanOrEqual(5);
      expect(summary.averageSuccessRate).toBeGreaterThanOrEqual(0);
    });

    it('should format dashboard correctly', async () => {
      const dashboard = monitor.formatDashboard();

      expect(dashboard).toContain('Evolution Dashboard');
      expect(dashboard).toContain('Overview');
      expect(dashboard).toContain('Total Agents');
      expect(dashboard).toContain('22');
    });
  });

  describe('Learning Progress', () => {
    it('should track learning progress for all agents', async () => {
      const progress = monitor.getLearningProgress();

      expect(progress).toBeDefined();
      expect(Array.isArray(progress)).toBe(true);
      expect(progress.length).toBe(22);

      // All agents should have valid progress structure
      progress.forEach(p => {
        expect(p).toHaveProperty('agentId');
        expect(p).toHaveProperty('totalExecutions');
        expect(p).toHaveProperty('learnedPatterns');
        expect(p).toHaveProperty('appliedAdaptations');
        expect(p).toHaveProperty('successRateImprovement');
        expect(p).toHaveProperty('lastLearningDate');
      });
    });

    it('should show agent-specific stats', async () => {
      const task: Task = {
        id: 'test-task',
        description: 'Review code',
        priority: 5,
      };

      const result = await router.routeTask(task);
      const agentId = result.routing.selectedAgent;

      const stats = monitor.getAgentStats(agentId);

      expect(stats.agentId).toBe(agentId);
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });
  });

  describe('Adaptation Application', () => {
    it('should apply adaptations based on agent configuration', async () => {
      const task: Task = {
        id: 'adaptation-test',
        description: 'Complex code review with multiple files',
        priority: 8,
      };

      const result = await router.routeTask(task);

      expect(result.adaptedExecution).toBeDefined();
      expect(result.adaptedExecution?.baseExecution).toBeDefined();

      // Adaptations should be based on agent category
      const agentId = result.routing.selectedAgent;
      const config = router
        .getAdaptationEngine()
        .getAgentConfig(agentId as any);

      if (config) {
        expect(config.enabledAdaptations).toBeDefined();
        expect(config.learningRate).toBeGreaterThan(0);
      }
    });
  });

  describe('Cost Tracking Integration', () => {
    it('should track costs through evolution system', async () => {
      const task: Task = {
        id: 'cost-test',
        description: 'Review large codebase',
        priority: 5,
      };

      const result = await router.routeTask(task);

      expect(result.routing.estimatedCost).toBeGreaterThan(0);
      expect(result.approved).toBe(true); // Should be within budget
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tasks gracefully', async () => {
      const invalidTask: Task = {
        id: 'invalid-task',
        description: '',
        priority: 5,
      };

      const result = await router.routeTask(invalidTask);

      // Should still return valid result structure
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.routing).toBeDefined();
    });
  });

  describe('System Resources', () => {
    it('should report system status', async () => {
      const status = await router.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.resources).toBeDefined();
      expect(status.costStats).toBeDefined();
      expect(status.recommendation).toBeDefined();
    });
  });
});
