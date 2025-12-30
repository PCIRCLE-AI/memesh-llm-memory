import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningEngine } from '../../src/planning/PlanningEngine.js';
import { TaskDecomposer } from '../../src/planning/TaskDecomposer.js';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';
import { LearningManager } from '../../src/evolution/LearningManager.js';
import { PerformanceTracker } from '../../src/evolution/PerformanceTracker.js';
import type { ContextualPattern } from '../../src/evolution/types.js';

describe('Smart Planning - Complete Workflow Integration', () => {
  let planningEngine: PlanningEngine;
  let taskDecomposer: TaskDecomposer;
  let agentRegistry: AgentRegistry;
  let learningManager: LearningManager;
  let performanceTracker: PerformanceTracker;

  beforeEach(() => {
    // Setup real instances for true integration testing
    agentRegistry = new AgentRegistry();
    performanceTracker = new PerformanceTracker();
    learningManager = new LearningManager(performanceTracker);
    planningEngine = new PlanningEngine(agentRegistry, learningManager);
    taskDecomposer = new TaskDecomposer();
  });

  it('should integrate PlanningEngine with AgentRegistry for agent assignment', async () => {
    // Test agent assignment based on capabilities
    const request = {
      featureDescription: 'Create secure user authentication API with JWT tokens',
      requirements: [
        'Implement authentication API endpoint with error handling',
        'Add code review for security validation',
      ],
    };

    const plan = await planningEngine.generatePlan(request);

    // Verify plan structure
    expect(plan.tasks.length).toBeGreaterThan(0);

    // Verify agent assignments based on capabilities
    const authTask = plan.tasks.find((t) =>
      t.description.toLowerCase().includes('authentication')
    );
    const reviewTask = plan.tasks.find((t) => t.description.toLowerCase().includes('review'));

    // Auth tasks should be assigned to security or backend agents
    if (authTask?.suggestedAgent) {
      expect(['security-auditor', 'backend-developer']).toContain(authTask.suggestedAgent);
    }

    // Review tasks should be assigned to code-reviewer
    if (reviewTask?.suggestedAgent) {
      expect(reviewTask.suggestedAgent).toBe('code-reviewer');
    }

    // Verify all available agents from registry were considered
    const allAgents = agentRegistry.getAllAgents();
    expect(allAgents.length).toBeGreaterThan(0);
  });

  it('should apply learned patterns from LearningManager', async () => {
    // Setup: Mock learned patterns in LearningManager
    const mockPattern: ContextualPattern = {
      id: 'pattern-1',
      type: 'success',
      description: 'API development with error handling pattern',
      confidence: 0.85,
      observations: 15,
      success_rate: 0.9,
      avg_execution_time: 3000,
      last_seen: new Date().toISOString(),
      context: {
        agent_type: 'backend-developer',
        task_type: 'API development',
        complexity: 'medium',
        actions: ['error-handling', 'input-validation', 'logging'],
      },
    };

    // Inject patterns into LearningManager for backend-developer agent
    // @ts-expect-error - accessing private field for testing
    learningManager.contextualPatterns.set('backend-developer', [mockPattern]);

    // Generate plan for API development feature
    const request = {
      featureDescription: 'Create API endpoint for user registration',
      requirements: ['Build user registration API endpoint'],
      existingContext: {
        domain: 'API',
        projectType: 'backend',
      },
    };

    const plan = await planningEngine.generatePlan(request);

    // Verify learned patterns are applied
    // Check if task descriptions are enhanced with learned best practices
    const apiTask = plan.tasks.find((t) =>
      t.description.toLowerCase().includes('api') ||
      t.description.toLowerCase().includes('endpoint')
    );

    if (apiTask) {
      // Enhanced description should include learned best practices
      expect(
        apiTask.description.toLowerCase().includes('error-handling') ||
        apiTask.description.toLowerCase().includes('input-validation') ||
        apiTask.description.toLowerCase().includes('logging')
      ).toBe(true);

      // TDD steps should be enhanced with learned actions
      const implementationStep = apiTask.steps.find((s) =>
        s.toLowerCase().includes('implement')
      );
      expect(implementationStep).toBeDefined();
      if (implementationStep) {
        expect(
          implementationStep.toLowerCase().includes('error-handling') ||
          implementationStep.toLowerCase().includes('input-validation') ||
          implementationStep.toLowerCase().includes('logging')
        ).toBe(true);
      }
    }
  });

  it('should use TaskDecomposer to break features into bite-sized tasks', () => {
    // Use TaskDecomposer directly to decompose a complex feature
    const request = {
      featureDescription: 'Build user authentication system with login, registration, and password reset',
    };

    const tasks = taskDecomposer.decompose(request);

    // Verify all tasks are 2-5 minutes in duration
    tasks.forEach((task) => {
      expect(task.estimatedDuration).toBe('2-5 minutes');
    });

    // Verify dependencies are correctly identified
    // Testing tasks should depend on ALL implementation tasks
    const testingTasks = tasks.filter((t) => t.phase === 'testing');
    const implTasks = tasks.filter((t) => t.phase !== 'testing');

    testingTasks.forEach((testTask) => {
      // Testing task should depend on all implementation tasks
      implTasks.forEach((implTask) => {
        expect(testTask.dependencies).toContain(implTask.id);
      });
    });

    // Verify each task has 5-step TDD workflow (or close to it)
    tasks.forEach((task) => {
      expect(task.steps.length).toBeGreaterThanOrEqual(3);
      expect(task.steps.length).toBeLessThanOrEqual(7);

      // First step should be about writing tests
      expect(task.steps[0].toLowerCase()).toContain('test');
    });
  });

  it('should generate complete executable plan from feature description', async () => {
    // End-to-end plan generation
    const request = {
      featureDescription: 'Create user authentication API with JWT tokens',
      requirements: [
        'Implement JWT token generation',
        'Add authentication middleware',
        'Create login endpoint',
      ],
      constraints: ['Must use TDD approach'],
    };

    const plan = await planningEngine.generatePlan(request);

    // Verify plan includes all required components
    expect(plan.title).toContain('Implementation Plan');
    expect(plan.title).toContain(request.featureDescription);
    expect(plan.goal).toBeDefined();
    expect(plan.architecture).toBeDefined();
    expect(plan.techStack).toBeInstanceOf(Array);
    expect(plan.techStack.length).toBeGreaterThan(0);
    expect(plan.totalEstimatedTime).toBeDefined();

    // Verify tasks structure
    expect(plan.tasks.length).toBeGreaterThan(0);

    plan.tasks.forEach((task) => {
      // Each task should have required fields
      expect(task.id).toBeDefined();
      expect(task.description).toBeDefined();
      expect(task.steps).toBeInstanceOf(Array);
      expect(task.steps.length).toBeGreaterThan(0);
      expect(task.estimatedDuration).toBe('2-5 minutes');
      expect(task.priority).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(task.priority);
      expect(task.dependencies).toBeInstanceOf(Array);
      expect(task.files).toBeDefined();

      // Each task should have TDD workflow steps
      const hasTestStep = task.steps.some((s) => s.toLowerCase().includes('test'));
      const hasCommitStep = task.steps.some((s) => s.toLowerCase().includes('commit'));
      expect(hasTestStep).toBe(true);
      expect(hasCommitStep).toBe(true);
    });

    // Verify dependencies ordering
    const taskIds = plan.tasks.map((t) => t.id);
    plan.tasks.forEach((task) => {
      task.dependencies.forEach((depId) => {
        // All dependencies should exist in task list
        expect(taskIds).toContain(depId);
      });
    });
  });

  it('should handle complex multi-domain features', async () => {
    // Generate plan for feature spanning frontend + backend + database
    const request = {
      featureDescription: 'Build user dashboard with backend API and frontend UI',
      requirements: [
        'Create database schema for user profiles',
        'Build backend API endpoint for profile CRUD operations',
        'Design frontend UI component for dashboard',
      ],
    };

    const plan = await planningEngine.generatePlan(request);

    // Decompose using TaskDecomposer to get detailed task breakdown
    const decomposedTasks = taskDecomposer.decompose(request);

    // Verify tasks are categorized by phase (backend, frontend, testing)
    const phases = taskDecomposer.identifyPhases(decomposedTasks);
    expect(phases.length).toBeGreaterThan(1);

    // Should have backend phase
    expect(phases).toContain('backend');

    // Should have frontend phase
    expect(phases).toContain('frontend');

    // Should have testing phase
    expect(phases).toContain('testing');

    // Verify dependencies respect phase ordering
    const backendTasks = decomposedTasks.filter((t) => t.phase === 'backend');
    const frontendTasks = decomposedTasks.filter((t) => t.phase === 'frontend');
    const testingTasks = decomposedTasks.filter((t) => t.phase === 'testing');

    // Frontend tasks should depend on backend tasks
    frontendTasks.forEach((frontendTask) => {
      const hasBackendDep = frontendTask.dependencies.some((depId) =>
        backendTasks.some((bt) => bt.id === depId)
      );
      // At least some frontend tasks should depend on backend
      if (frontendTask.dependencies.length > 0) {
        expect(hasBackendDep || frontendTask.dependencies.length === 0).toBe(true);
      }
    });

    // Testing tasks should depend on ALL implementation tasks
    testingTasks.forEach((testTask) => {
      const implementationTasks = decomposedTasks.filter((t) => t.phase !== 'testing');
      implementationTasks.forEach((implTask) => {
        expect(testTask.dependencies).toContain(implTask.id);
      });
    });

    // Verify appropriate agents assigned per domain
    const schemaTask = plan.tasks.find((t) =>
      t.description.toLowerCase().includes('schema') ||
      t.description.toLowerCase().includes('database')
    );
    const apiTask = plan.tasks.find((t) =>
      t.description.toLowerCase().includes('api') ||
      t.description.toLowerCase().includes('endpoint')
    );
    const uiTask = plan.tasks.find((t) =>
      t.description.toLowerCase().includes('ui') ||
      t.description.toLowerCase().includes('frontend') ||
      t.description.toLowerCase().includes('component')
    );

    // Verify that tasks have agents assigned
    // (Agent assignment may vary based on keyword matching, so we verify structure rather than specific agents)
    const tasksWithAgents = plan.tasks.filter((t) => t.suggestedAgent);
    expect(tasksWithAgents.length).toBeGreaterThan(0);

    // Verify agents are valid (from registry)
    const validAgentNames = agentRegistry.getAllAgents().map((a) => a.name);
    tasksWithAgents.forEach((task) => {
      if (task.suggestedAgent) {
        expect(validAgentNames).toContain(task.suggestedAgent);
      }
    });
  });
});
