// tests/unit/PlanningEngine-AgentIntegration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningEngine } from '../../src/planning/PlanningEngine.js';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('PlanningEngine - AgentRegistry Integration', () => {
  let engine: PlanningEngine;
  let agentRegistry: AgentRegistry;

  beforeEach(() => {
    agentRegistry = new AgentRegistry();
    engine = new PlanningEngine(agentRegistry);
  });

  it('should assign real agents from registry', () => {
    const plan = engine.generatePlan({
      featureDescription: 'Add API security layer',
      requirements: ['authentication', 'rate limiting', 'input validation'],
    });

    const authTask = plan.tasks.find((t) =>
      t.description.includes('authentication')
    );
    expect(authTask?.suggestedAgent).toBe('security-auditor');

    const validationTask = plan.tasks.find((t) =>
      t.description.includes('validation')
    );
    expect(validationTask?.suggestedAgent).toBe('code-reviewer');
  });

  it('should respect agent capabilities when assigning', () => {
    const plan = engine.generatePlan({
      featureDescription: 'Full-stack feature with UI and API',
      requirements: ['frontend component', 'backend API', 'database migration'],
    });

    const frontendTask = plan.tasks.find((t) =>
      t.description.includes('frontend')
    );
    expect(frontendTask?.suggestedAgent).toBe('frontend-developer');

    const backendTask = plan.tasks.find((t) =>
      t.description.includes('API')
    );
    expect(backendTask?.suggestedAgent).toBe('backend-developer');

    const dbTask = plan.tasks.find((t) =>
      t.description.includes('database')
    );
    expect(dbTask?.suggestedAgent).toBe('database-administrator');
  });

  it('should prioritize agents with highest capability match', () => {
    const plan = engine.generatePlan({
      featureDescription: 'Optimize application performance',
      requirements: ['profile bottlenecks', 'optimize algorithms', 'cache strategy'],
    });

    const optimizeTask = plan.tasks.find((t) =>
      t.description.includes('optimize')
    );
    expect(optimizeTask?.suggestedAgent).toBe('performance-engineer');
  });
});
