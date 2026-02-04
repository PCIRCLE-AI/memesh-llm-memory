import { describe, it, expect } from 'vitest';
import { TaskDecomposer, DecompositionRequest } from '../../src/planning/TaskDecomposer';

// Note: DecomposedTask type is used implicitly through TaskDecomposer.decompose() return type

describe('TaskDecomposer', () => {
  const decomposer = new TaskDecomposer();

  it('should break large feature into bite-sized tasks (2-5 min each)', () => {
    const request: DecompositionRequest = {
      featureDescription: 'Create a user authentication system with login, registration, and password reset'
    };

    const tasks = decomposer.decompose(request);

    // Should have 3 tasks: 2 for authentication + 1 for testing
    expect(tasks.length).toBe(3);

    // Each task should be 2-5 minutes
    tasks.forEach(task => {
      expect(task.estimatedDuration).toBe('2-5 minutes');
    });
  });

  it('should ensure each task is independently testable', () => {
    const request: DecompositionRequest = {
      featureDescription: 'Build a simple todo list API'
    };

    const tasks = decomposer.decompose(request);

    // All tasks should be testable
    tasks.forEach(task => {
      expect(task.testable).toBe(true);
      // First step should include writing a test
      expect(task.steps[0].toLowerCase()).toContain('test');
    });
  });

  it('should identify task dependencies correctly', () => {
    const request: DecompositionRequest = {
      featureDescription: 'Create API endpoint for user profile with database schema'
    };

    const tasks = decomposer.decompose(request);

    // Find schema and endpoint tasks
    const schemaTask = tasks.find(t => t.description.includes('schema'));
    const endpointTask = tasks.find(t => t.description.includes('endpoint'));

    expect(schemaTask).toBeDefined();
    expect(endpointTask).toBeDefined();

    // Endpoint should depend on schema
    expect(endpointTask?.dependencies).toContain(schemaTask?.id);
  });

  it('should not create tasks larger than 5 minutes', () => {
    const request: DecompositionRequest = {
      featureDescription: 'Build a complete e-commerce platform with products, cart, checkout, payments, and admin panel'
    };

    const tasks = decomposer.decompose(request);

    // Even for large features, all tasks should be 2-5 minutes
    tasks.forEach(task => {
      expect(task.estimatedDuration).toBe('2-5 minutes');
      expect(task.steps.length).toBeGreaterThanOrEqual(3);
      expect(task.steps.length).toBeLessThanOrEqual(7);
    });
  });

  it('should group related tasks into phases', () => {
    const request: DecompositionRequest = {
      featureDescription: 'Create user dashboard with backend API and frontend UI'
    };

    const tasks = decomposer.decompose(request);

    // Should have tasks in different phases
    const phases = decomposer.identifyPhases(tasks);
    expect(phases.length).toBeGreaterThan(1);
    expect(phases).toContain('backend');
    expect(phases).toContain('frontend');
  });
});
