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
        {
          name: 'code-reviewer',
          description: 'Code review expert',
          category: 'development',
          classification: 'enhanced-prompt',
          capabilities: ['code-review', 'security-audit']
        },
        {
          name: 'test-automator',
          description: 'Test automation expert',
          category: 'development',
          classification: 'enhanced-prompt',
          capabilities: ['test-generation', 'test-execution']
        },
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

  // Edge case tests for input validation
  describe('Input Validation', () => {
    it('should throw error when featureDescription is empty', () => {
      expect(() => {
        engine.generatePlan({
          featureDescription: '',
        });
      }).toThrow('featureDescription is required and cannot be empty');
    });

    it('should throw error when featureDescription is only whitespace', () => {
      expect(() => {
        engine.generatePlan({
          featureDescription: '   ',
        });
      }).toThrow('featureDescription is required and cannot be empty');
    });

    it('should throw error when featureDescription is undefined', () => {
      expect(() => {
        engine.generatePlan({
          featureDescription: undefined as any,
        });
      }).toThrow('featureDescription is required and cannot be empty');
    });

    it('should throw error when featureDescription exceeds maximum length', () => {
      const longDescription = 'a'.repeat(1001);
      expect(() => {
        engine.generatePlan({
          featureDescription: longDescription,
        });
      }).toThrow('featureDescription exceeds maximum length of 1000 characters');
    });

    it('should throw error when requirements is not an array', () => {
      expect(() => {
        engine.generatePlan({
          featureDescription: 'Valid description',
          requirements: 'not an array' as any,
        });
      }).toThrow('requirements must be an array');
    });

    it('should accept valid featureDescription at maximum length', () => {
      const maxDescription = 'a'.repeat(1000);
      const plan = engine.generatePlan({
        featureDescription: maxDescription,
      });
      expect(plan.tasks).toBeDefined();
    });
  });
});
