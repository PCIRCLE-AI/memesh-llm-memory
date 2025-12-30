// tests/unit/PlanningEngine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningEngine } from '../../src/planning/PlanningEngine.js';
import type { AgentRegistry } from '../../src/orchestrator/AgentRegistry.js';

describe('PlanningEngine', () => {
  let engine: PlanningEngine;
  let mockAgentRegistry: AgentRegistry;

  beforeEach(() => {
    mockAgentRegistry = {
      getAllAgents: vi.fn().mockReturnValue([
        { id: 'code-reviewer', capabilities: ['code-review', 'security-audit'] },
        { id: 'test-automator', capabilities: ['test-generation', 'test-execution'] },
      ]),
      getAgentById: vi.fn(),
    } as unknown as AgentRegistry;

    engine = new PlanningEngine(mockAgentRegistry);
  });

  it('should generate bite-sized tasks from feature description', () => {
    const plan = engine.generatePlan({
      featureDescription: 'Add user authentication with JWT',
      requirements: ['API endpoints', 'password hashing', 'token validation'],
    });

    expect(plan.tasks).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThan(5); // Multiple bite-sized tasks
    expect(plan.tasks[0].estimatedDuration).toBe('2-5 minutes');
  });

  it('should assign appropriate agents to tasks', () => {
    const plan = engine.generatePlan({
      featureDescription: 'Add user authentication',
      requirements: ['security review', 'test coverage'],
    });

    const securityTask = plan.tasks.find((t) =>
      t.description.toLowerCase().includes('security')
    );
    expect(securityTask?.suggestedAgent).toBe('code-reviewer');

    const testTask = plan.tasks.find((t) =>
      t.description.toLowerCase().includes('test')
    );
    expect(testTask?.suggestedAgent).toBe('test-automator');
  });

  it('should follow TDD structure for each task', () => {
    const plan = engine.generatePlan({
      featureDescription: 'Add user login endpoint',
    });

    const task = plan.tasks[0];
    expect(task.steps).toHaveLength(5);
    expect(task.steps[0]).toContain('Write test');
    expect(task.steps[1]).toContain('Run test');
    expect(task.steps[2]).toContain('Implement');
    expect(task.steps[3]).toContain('Verify');
    expect(task.steps[4]).toContain('Commit');
  });
});
