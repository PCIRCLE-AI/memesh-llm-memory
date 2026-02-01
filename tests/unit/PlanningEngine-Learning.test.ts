/**
 * Tests for PlanningEngine integration with LearningManager
 * Verifies that learned patterns are applied to task generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningEngine, type PlanRequest } from '../../src/planning/PlanningEngine.js';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';
import { LearningManager } from '../../src/evolution/LearningManager.js';

describe('PlanningEngine - LearningManager Integration', () => {
  let planningEngine: PlanningEngine;
  let agentRegistry: AgentRegistry;
  let learningManager: LearningManager;
  let mockGetLearnedPatterns: any;

  beforeEach(async () => {
    agentRegistry = new AgentRegistry();

    // Register some test agents
    agentRegistry.registerAgent({
      name: 'backend-developer',
      capabilities: ['api-development', 'database'],
      tags: ['backend', 'api']
    });

    agentRegistry.registerAgent({
      name: 'security-auditor',
      capabilities: ['security', 'authentication'],
      tags: ['security']
    });

    // Create mock LearningManager with ContextualPattern format
    mockGetLearnedPatterns = vi.fn().mockResolvedValue([
      {
        id: 'pattern-1',
        type: 'success',
        description: 'Security-first approach for API development',
        confidence: 0.85,
        observations: 12,
        success_rate: 0.85,
        avg_execution_time: 300000,
        last_seen: new Date().toISOString(),
        context: {
          domain: 'API development with security requirements',
          project_type: 'backend',
          actions: ['security-tests-first', 'schema-before-API']
        }
      },
      {
        id: 'pattern-2',
        type: 'success',
        description: 'Best practices for API development',
        confidence: 0.90,
        observations: 20,
        success_rate: 0.90,
        avg_execution_time: 250000,
        last_seen: new Date().toISOString(),
        context: {
          domain: 'API development',
          project_type: 'backend',
          actions: ['error-handling', 'input-validation', 'logging']
        }
      }
    ]);

    learningManager = {
      getLearnedPatterns: mockGetLearnedPatterns,
      recordExecution: vi.fn(),
      observePattern: vi.fn(),
      getStatistics: vi.fn()
    } as any;

    planningEngine = new PlanningEngine(agentRegistry, learningManager);
  });

  it('should apply learned patterns to task generation', async () => {
    const request: PlanRequest = {
      featureDescription: 'Build REST API with authentication',
      requirements: ['authentication', 'authorization', 'API endpoints'],
      constraints: ['TDD required', 'security best practices'],
      existingContext: {
        projectType: 'backend',
        domain: 'API development with security requirements'
      }
    };

    const plan = await planningEngine.generatePlan(request);

    // Verify that LearningManager.getLearnedPatterns was called
    expect(mockGetLearnedPatterns).toHaveBeenCalled();

    // Verify that learned patterns influenced task generation
    expect(plan.tasks).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThan(0);

    const tasks = plan.tasks;
    const allText = tasks.map(t => `${t.description} ${t.steps.join(' ')}`).join(' ').toLowerCase();

    // Check that learned actions are mentioned (security-tests-first, error-handling, etc.)
    const hasLearnedPractices =
      allText.includes('security') ||
      allText.includes('error') ||
      allText.includes('validat') ||
      allText.includes('log');

    expect(hasLearnedPractices).toBe(true);
  });

  it('should adjust task order based on learned success patterns', async () => {
    const request: PlanRequest = {
      featureDescription: 'Create user management API',
      requirements: ['database schema', 'API endpoints', 'validation'],
      constraints: ['TDD required'],
      existingContext: {
        projectType: 'backend',
        domain: 'API development with security requirements'
      }
    };

    const plan = await planningEngine.generatePlan(request);

    expect(plan.tasks).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThan(0);

    const tasks = plan.tasks;

    // Find schema and API tasks
    const schemaTask = tasks.find(t =>
      t.description.toLowerCase().includes('schema') ||
      t.description.toLowerCase().includes('database')
    );
    const apiTask = tasks.find(t =>
      t.description.toLowerCase().includes('api') &&
      !t.description.toLowerCase().includes('schema')
    );

    // Learned pattern: schema-before-API
    if (schemaTask && apiTask) {
      const schemaIndex = tasks.indexOf(schemaTask);
      const apiIndex = tasks.indexOf(apiTask);
      expect(schemaIndex).toBeLessThan(apiIndex);
    }
  });

  it('should include learned best practices in task descriptions', async () => {
    const request: PlanRequest = {
      featureDescription: 'Implement user registration endpoint',
      requirements: ['user registration', 'data validation'],
      constraints: ['TDD required'],
      existingContext: {
        projectType: 'backend',
        domain: 'API development'
      }
    };

    const plan = await planningEngine.generatePlan(request);

    expect(plan.tasks).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThan(0);

    const tasks = plan.tasks;

    // Check if any task description or steps include learned best practices
    const allText = tasks.map(t => `${t.description} ${t.steps.join(' ')}`).join(' ').toLowerCase();

    const hasErrorHandling = allText.includes('error') || allText.includes('handling');
    const hasValidation = allText.includes('validat');
    const hasLogging = allText.includes('log');

    // At least one best practice should be mentioned
    expect(hasErrorHandling || hasValidation || hasLogging).toBe(true);
  });
});
