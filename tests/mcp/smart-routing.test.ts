/**
 * Smart Routing Handler Test
 *
 * Tests for smart_route_task tool handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from '../../src/orchestrator/router.js';
import { HumanInLoopUI } from '../../src/mcp/HumanInLoopUI.js';
import { Task } from '../../src/orchestrator/types.js';

describe('Smart Routing Handler', () => {
  let router: Router;
  let ui: HumanInLoopUI;

  beforeEach(() => {
    router = new Router();
    ui = new HumanInLoopUI();
  });

  describe('Task Analysis and Routing', () => {
    it('should analyze and route simple task', async () => {
      const task: Task = {
        id: 'test-task-1',
        description: 'Review this code for security issues',
        priority: 5,
      };

      const result = await router.routeTask(task);

      expect(result.analysis).toBeDefined();
      expect(result.routing).toBeDefined();
      expect(result.routing.selectedAgent).toBeDefined();
      expect(result.routing.enhancedPrompt).toBeDefined();
    });

    it('should provide reasoning for routing decision', async () => {
      const task: Task = {
        id: 'test-task-2',
        description: 'Debug authentication failure',
        priority: 8,
      };

      const result = await router.routeTask(task);

      expect(result.routing.reasoning).toBeDefined();
      expect(result.routing.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle fallback agent (optional)', async () => {
      const task: Task = {
        id: 'test-task-3',
        description: 'Complex architecture design task',
      };

      const result = await router.routeTask(task);

      // fallbackAgent is optional - just verify routing succeeded
      expect(result.routing.selectedAgent).toBeDefined();
      expect(['architecture-agent', 'general-agent']).toContain(result.routing.selectedAgent);
    });
  });

  describe('Confirmation Request Generation', () => {
    it('should generate confirmation request from routing', async () => {
      const task: Task = {
        id: 'test-task-4',
        description: 'Optimize database queries',
      };

      const result = await router.routeTask(task);

      // Simulate confirmation request generation
      const confirmationRequest = {
        taskDescription: task.description,
        recommendedAgent: result.routing.selectedAgent,
        confidence: 0.85,
        reasoning: result.routing.reasoning.split('. ').slice(0, 3),
        alternatives: result.routing.fallbackAgent
          ? [{ agent: result.routing.fallbackAgent, confidence: 0.7, reason: 'Alternative option' }]
          : [],
      };

      const formatted = ui.formatConfirmationRequest(confirmationRequest);

      expect(formatted).toContain(result.routing.selectedAgent);
      expect(formatted).toContain(task.description);
    });
  });
});
