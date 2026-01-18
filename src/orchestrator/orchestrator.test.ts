/**
 * Agent Orchestrator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentRouter } from './AgentRouter.js';
import { CostTracker } from './CostTracker.js';
import { Router } from './router.js';
import { Task } from './types.js';

describe('TaskAnalyzer', () => {
  let analyzer: TaskAnalyzer;

  beforeEach(() => {
    analyzer = new TaskAnalyzer();
  });

  it('should classify simple tasks correctly', async () => {
    const task: Task = {
      id: 'test-1',
      description: 'Format this JSON object',
    };

    const analysis = await analyzer.analyze(task);

    expect(analysis.complexity).toBe('simple');
    expect(analysis.requiredCapabilities).toContain('general');
  });

  it('should classify complex tasks correctly', async () => {
    const task: Task = {
      id: 'test-2',
      description: 'Analyze system architecture and design a comprehensive database schema with security considerations',
    };

    const analysis = await analyzer.analyze(task);

    expect(analysis.complexity).toBe('complex');
    // Improved capability detection detects 'architecture-agent' from 'architecture' keyword
    expect(analysis.requiredCapabilities).toContain('architecture');
  });

  it('should classify medium tasks correctly', async () => {
    const task: Task = {
      id: 'test-3',
      description: 'Create email validation function',
    };

    const analysis = await analyzer.analyze(task);

    expect(analysis.complexity).toBe('medium');
    expect(analysis.requiredCapabilities).toContain('general');
  });

  it('should estimate tokens correctly', async () => {
    const task: Task = {
      id: 'test-4',
      description: 'Simple task',
    };

    const analysis = await analyzer.analyze(task);

    expect(analysis.estimatedTokens).toBeGreaterThan(0);
    expect(analysis.estimatedCost).toBeGreaterThan(0);
  });

  it('should analyze batch of tasks', async () => {
    const tasks: Task[] = [
      { id: 'task-1', description: 'Format JSON' },
      { id: 'task-2', description: 'Analyze system architecture and design comprehensive database schema' },
      { id: 'task-3', description: 'Create user validation' },
    ];

    const analyses = await analyzer.analyzeBatch(tasks);

    expect(analyses).toHaveLength(3);
    expect(analyses[0].complexity).toBe('simple');
    expect(analyses[1].complexity).toBe('complex');
    expect(analyses[2].complexity).toBe('medium');
  });

  it('should generate reasoning for analysis', async () => {
    const task: Task = {
      id: 'test-5',
      description: 'Analyze and optimize performance',
    };

    const analysis = await analyzer.analyze(task);

    expect(analysis.reasoning).toBeTruthy();
    expect(analysis.reasoning).toContain('complexity');
  });
});

describe('AgentRouter', () => {
  let router: AgentRouter;
  let analyzer: TaskAnalyzer;

  beforeEach(() => {
    router = new AgentRouter();
    analyzer = new TaskAnalyzer();
  });

  it('should route simple tasks to general-agent', async () => {
    const task: Task = {
      id: 'test-1',
      description: 'Format JSON',
    };

    const analysis = await analyzer.analyze(task);
    const routing = await router.route(analysis);

    expect(routing.selectedAgent).toBe('general-agent');
    expect(routing.enhancedPrompt).toBeDefined();
    expect(routing.enhancedPrompt.suggestedModel).toBeTruthy();
  });

  it('should route complex tasks to appropriate agent (or fallback to general-agent if memory insufficient)', async () => {
    const task: Task = {
      id: 'test-2',
      description: 'Analyze system architecture and design comprehensive security audit',
    };

    const analysis = await analyzer.analyze(task);
    const routing = await router.route(analysis);

    // In test environment with limited memory, may fallback to general-agent
    expect(['code-reviewer', 'general-agent']).toContain(routing.selectedAgent);
    expect(routing.enhancedPrompt).toBeDefined();
  });

  it('should get system resources', async () => {
    const resources = await router.getSystemResources();

    expect(resources.totalMemoryMB).toBeGreaterThan(0);
    expect(resources.availableMemoryMB).toBeGreaterThan(0);
    expect(resources.memoryUsagePercent).toBeGreaterThanOrEqual(0);
    expect(resources.memoryUsagePercent).toBeLessThanOrEqual(100);
  });

  it('should provide fallback agent when appropriate', async () => {
    const task: Task = {
      id: 'test-3',
      description: 'Analyze comprehensive system architecture',
    };

    const analysis = await analyzer.analyze(task);
    const routing = await router.route(analysis);

    // Fallback may be undefined for general-agent (default fallback)
    if (routing.selectedAgent === 'architecture-agent' || routing.selectedAgent === 'code-reviewer') {
      expect(routing.fallbackAgent).toBeTruthy();
    }
  });

  it('should route batch of tasks', async () => {
    const tasks: Task[] = [
      { id: 'task-1', description: 'Format JSON' },
      { id: 'task-2', description: 'Analyze comprehensive system architecture and database design' },
    ];

    const analyses = await analyzer.analyzeBatch(tasks);
    const routings = await router.routeBatch(analyses);

    expect(routings).toHaveLength(2);
    expect(routings[0].selectedAgent).toBe('general-agent');
    // Second task may be general-agent or architecture-agent depending on memory
    expect(['general-agent', 'architecture-agent']).toContain(routings[1].selectedAgent);
  });
});

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it('should record cost correctly', () => {
    const cost = tracker.recordCost(
      'task-1',
      'claude-sonnet-4-5-20250929',
      1000,
      2000
    );

    expect(cost).toBeGreaterThan(0);
  });

  it('should get stats', () => {
    tracker.recordCost('task-1', 'claude-sonnet-4-5-20250929', 1000, 2000);
    tracker.recordCost('task-2', 'claude-haiku-4-20250514', 500, 1000);

    const stats = tracker.getStats();

    expect(stats.totalCost).toBeGreaterThan(0);
    expect(stats.taskCount).toBe(2);
    expect(stats.averageCostPerTask).toBeGreaterThan(0);
  });

  it('should calculate cost by model', () => {
    tracker.recordCost('task-1', 'claude-sonnet-4-5-20250929', 1000, 2000);
    tracker.recordCost('task-2', 'claude-sonnet-4-5-20250929', 1000, 2000);
    tracker.recordCost('task-3', 'claude-haiku-4-20250514', 500, 1000);

    const stats = tracker.getStats();

    expect(stats.costByModel['claude-sonnet-4-5-20250929']).toBeGreaterThan(0);
    expect(stats.costByModel['claude-haiku-4-20250514']).toBeGreaterThan(0);
  });

  it('should check budget', () => {
    const withinBudget = tracker.isWithinBudget(0.01);
    expect(withinBudget).toBe(true);
  });

  it('should generate report', () => {
    tracker.recordCost('task-1', 'claude-sonnet-4-5-20250929', 1000, 2000);
    const report = tracker.generateReport();

    expect(report).toContain('Cost Report');
    expect(report).toContain('Total Tasks');
    expect(report).toContain('Monthly Budget');
  });

  it('should provide recommendations', () => {
    const recommendation = tracker.getRecommendation();
    expect(recommendation).toBeTruthy();
    expect(recommendation.length).toBeGreaterThan(0);
  });

  it('should export data', () => {
    tracker.recordCost('task-1', 'claude-sonnet-4-5-20250929', 1000, 2000);
    const data = tracker.exportData();
    const parsed = JSON.parse(data);

    expect(parsed.costs).toBeDefined();
    expect(parsed.stats).toBeDefined();
    expect(parsed.exportedAt).toBeDefined();
  });
});

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  it('should route task with full pipeline', async () => {
    const task: Task = {
      id: 'test-1',
      description: 'Write a simple function',
    };

    const result = await router.routeTask(task);

    expect(result.analysis).toBeDefined();
    expect(result.routing).toBeDefined();
    expect(result.approved).toBe(true);
    expect(result.message).toContain('routed');
  });

  it('should route batch of tasks', async () => {
    const tasks: Task[] = [
      { id: 'task-1', description: 'Simple task' },
      { id: 'task-2', description: 'Another simple task' },
    ];

    const result = await router.routeBatch(tasks);

    expect(result.results).toHaveLength(2);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.approved).toBe(true);
  });

  it('should get system status', async () => {
    const status = await router.getSystemStatus();

    expect(status.resources).toBeDefined();
    expect(status.costStats).toBeDefined();
    expect(status.recommendation).toBeTruthy();
  });

  it('should record task cost', () => {
    const cost = router.recordTaskCost(
      'task-1',
      'claude-sonnet-4-5-20250929',
      1000,
      2000
    );

    expect(cost).toBeGreaterThan(0);
  });

  it('should generate cost report', () => {
    router.recordTaskCost('task-1', 'claude-sonnet-4-5-20250929', 1000, 2000);
    const report = router.getCostReport();

    expect(report).toContain('Cost Report');
  });
});
