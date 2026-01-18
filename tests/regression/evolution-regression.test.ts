/**
 * Evolution System Regression Test Suite
 *
 * Ensures evolution system changes don't break existing functionality:
 * - Backward compatibility with existing APIs
 * - Consistent behavior across versions
 * - No performance regressions
 * - No breaking changes to public interfaces
 *
 * Run: npm test tests/regression/evolution-regression.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from '../../src/orchestrator/router.js';
import { Task } from '../../src/orchestrator/types.js';
import { AgentEvolutionConfig, getAllAgentConfigs } from '../../src/evolution/AgentEvolutionConfig.js';
import { toDollars } from '../../src/utils/money.js';

describe('Evolution System Regression Tests', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  describe('API Backward Compatibility', () => {
    it('should maintain Router.routeTask() signature', async () => {
      const task: Task = {
        id: 'test-task',
        description: 'Test task',
        priority: 5,
      };

      const result = await router.routeTask(task);

      // Original return type structure
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('routing');
      expect(result).toHaveProperty('approved');
      expect(result).toHaveProperty('message');

      // New evolution field (additive only)
      expect(result).toHaveProperty('adaptedExecution');
    });

    it('should maintain Router.routeBatch() signature', async () => {
      const tasks: Task[] = [
        { id: 'task-1', description: 'Task 1', priority: 5 },
        { id: 'task-2', description: 'Task 2', priority: 5 },
      ];

      const result = await router.routeBatch(tasks);

      // Original return type structure
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('approved');

      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(2);
    });

    it('should maintain Router.getSystemStatus() signature', async () => {
      const status = await router.getSystemStatus();

      // Original return type structure
      expect(status).toHaveProperty('resources');
      expect(status).toHaveProperty('costStats');
      expect(status).toHaveProperty('recommendation');
    });

    it('should maintain Router getter methods', () => {
      // Original getters
      expect(router.getAnalyzer()).toBeDefined();
      expect(router.getRouter()).toBeDefined();
      expect(router.getCostTracker()).toBeDefined();

      // New evolution getters (additive only)
      expect(router.getPerformanceTracker()).toBeDefined();
      expect(router.getLearningManager()).toBeDefined();
      expect(router.getAdaptationEngine()).toBeDefined();
    });
  });

  describe('Evolution Configuration Stability', () => {
    it('should maintain agent configurations', () => {
      const configs = getAllAgentConfigs();

      expect(configs.size).toBeGreaterThan(0);

      // Verify all agents exist
      const requiredAgents = [
        'code-reviewer',
        'test-writer',
        'debugger',
        'refactorer',
        'api-designer',
        'db-optimizer',
        'frontend-specialist',
        'backend-specialist',
        'development-butler',
        'research-agent',
        'architecture-agent',
        'data-analyst',
        'performance-profiler',
        'knowledge-agent',
        'security-auditor',
        'technical-writer',
        'ui-designer',
        'migration-assistant',
        'api-integrator',
        'general-agent',
      ];

      requiredAgents.forEach(agentId => {
        expect(configs.has(agentId as any)).toBe(true);
      });
    });

    it('should maintain config structure for all agents', () => {
      const configs = getAllAgentConfigs();

      configs.forEach((config, agentId) => {
        // Required fields
        expect(config.agentId).toBe(agentId);
        expect(config.category).toBeDefined();
        expect(config.evolutionEnabled).toBeDefined();

        // Numeric fields with valid ranges
        expect(config.confidenceThreshold).toBeGreaterThanOrEqual(0);
        expect(config.confidenceThreshold).toBeLessThanOrEqual(1);
        expect(config.minObservationsForAdaptation).toBeGreaterThan(0);

        // Learning weights
        expect(config.learningWeights).toBeDefined();
        expect(config.learningWeights.successRate).toBeGreaterThan(0);
        expect(config.learningWeights.userFeedback).toBeGreaterThan(0);
        expect(config.learningWeights.performanceMetrics).toBeGreaterThan(0);

        // Weights should sum to ~1.0 (allowing for floating point error)
        const sum =
          config.learningWeights.successRate +
          config.learningWeights.userFeedback +
          config.learningWeights.performanceMetrics;
        expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
      });
    });

    it('should maintain category-based defaults', () => {
      const configs = getAllAgentConfigs();

      // Development category agents should have consistent defaults
      const devAgents = Array.from(configs.values()).filter(
        c => c.category === 'development'
      );
      expect(devAgents.length).toBeGreaterThan(0);

      devAgents.forEach(config => {
        expect(config.confidenceThreshold).toBe(0.75);
        expect(config.minObservationsForAdaptation).toBe(15);
        expect(config.learningWeights.successRate).toBe(0.4);
        expect(config.learningWeights.userFeedback).toBe(0.35);
        expect(config.learningWeights.performanceMetrics).toBe(0.25);
      });
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should route tasks within performance threshold', async () => {
      const task: Task = {
        id: 'perf-test',
        description: 'Performance test',
        priority: 5,
      };

      const startTime = Date.now();
      await router.routeTask(task);
      const duration = Date.now() - startTime;

      // Should complete within 200ms (with evolution overhead)
      expect(duration).toBeLessThan(200);
    });

    it('should batch route within performance threshold', async () => {
      const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-task-${i}`,
        description: `Task ${i}`,
        priority: 5,
      }));

      const startTime = Date.now();
      await router.routeBatch(tasks);
      const duration = Date.now() - startTime;

      // Should complete within 1000ms for 10 tasks (with evolution overhead)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve task data through routing', async () => {
      const task: Task = {
        id: 'data-integrity-test',
        description: 'Test data preservation',
        priority: 8,
      };

      const result = await router.routeTask(task);

      // Task analysis should preserve task data
      expect(result.analysis.taskType).toBeDefined();
      expect(['simple', 'medium', 'complex']).toContain(result.analysis.complexity);

      // Routing should preserve task intent
      expect(result.routing.selectedAgent).toBeDefined();
      expect(result.routing.enhancedPrompt).toBeDefined();
    });

    it('should maintain cost tracking accuracy', async () => {
      const task: Task = {
        id: 'cost-test',
        description: 'Test cost tracking',
        priority: 5,
      };

      const result = await router.routeTask(task);

      // Cost should be positive and reasonable
      // estimatedCost is in MicroDollars (μUSD), convert to dollars for comparison
      const costInDollars = toDollars(result.routing.estimatedCost);
      expect(costInDollars).toBeGreaterThan(0);
      expect(costInDollars).toBeLessThan(1.0);
    });
  });

  describe('Error Handling Stability', () => {
    it('should reject empty task descriptions with validation error', async () => {
      const task: Task = {
        id: 'empty-desc',
        description: '', // Empty description → empty taskType → validation error
        priority: 5,
      };

      // Should throw validation error due to empty taskType
      await expect(router.routeTask(task)).rejects.toThrow('taskType must be a non-empty string');
    });

    it('should handle missing priority gracefully', async () => {
      const task: Task = {
        id: 'no-priority',
        description: 'Task without priority',
        // priority omitted
      };

      const result = await router.routeTask(task);

      // Should still route successfully
      expect(result).toBeDefined();
      expect(result.approved).toBeDefined();
    });

    it('should handle very long task descriptions', async () => {
      const longDescription = 'A'.repeat(5000);
      const task: Task = {
        id: 'long-desc',
        description: longDescription,
        priority: 5,
      };

      const result = await router.routeTask(task);

      // Should handle without crashing
      expect(result).toBeDefined();
    });
  });

  describe('Evolution System Non-Breaking Changes', () => {
    it('should not require evolution configuration to route tasks', async () => {
      // Evolution should be optional enhancement, not requirement
      const task: Task = {
        id: 'no-evolution',
        description: 'Task without evolution',
        priority: 5,
      };

      const result = await router.routeTask(task);

      // Should work even if evolution patterns not learned yet
      expect(result).toBeDefined();
      expect(result.approved).toBe(true);
    });

    it('should gracefully handle agents without evolution enabled', () => {
      const configs = getAllAgentConfigs();

      // All agents should have evolutionEnabled defined
      configs.forEach((config) => {
        expect(config.evolutionEnabled).toBeDefined();
        expect(typeof config.evolutionEnabled).toBe('boolean');
      });
    });

    it('should maintain existing cost budgeting behavior', async () => {
      const task: Task = {
        id: 'budget-test',
        description: 'Very complex task that might exceed budget',
        priority: 10,
      };

      const result = await router.routeTask(task);

      // Budget checking should still work
      expect(result.approved).toBeDefined();
      expect(typeof result.approved).toBe('boolean');
    });
  });

  describe('Type Safety Regression', () => {
    it('should maintain type safety for AgentEvolutionConfig', () => {
      const configs = getAllAgentConfigs();

      configs.forEach((config) => {
        // Type assertions to ensure type safety
        const _agentId: string = config.agentId;
        const _category: AgentEvolutionConfig['category'] = config.category;
        const _evolutionEnabled: boolean = config.evolutionEnabled;
        const _confidenceThreshold: number = config.confidenceThreshold;
        const _minObservations: number = config.minObservationsForAdaptation;
        const _learningWeights: AgentEvolutionConfig['learningWeights'] = config.learningWeights;

        // Verify types at runtime
        expect(typeof _agentId).toBe('string');
        expect(typeof _category).toBe('string');
        expect(typeof _evolutionEnabled).toBe('boolean');
        expect(typeof _confidenceThreshold).toBe('number');
        expect(typeof _minObservations).toBe('number');
        expect(typeof _learningWeights).toBe('object');
      });
    });
  });
});
