/**
 * Router - Unified Routing Interface
 *
 * Provides high-level routing functionality, integrating TaskAnalyzer and AgentRouter
 */

import { Task, TaskAnalysis, RoutingDecision } from './types.js';
import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentRouter } from './AgentRouter.js';
import { CostTracker } from './CostTracker.js';
import { PerformanceTracker } from '../evolution/PerformanceTracker.js';
import { LearningManager } from '../evolution/LearningManager.js';
import { logger } from '../utils/logger.js';
import { formatMoney, type MicroDollars } from '../utils/money.js';

export class Router {
  private analyzer: TaskAnalyzer;
  private router: AgentRouter;
  private costTracker: CostTracker;

  // Evolution system
  private performanceTracker: PerformanceTracker;
  private learningManager: LearningManager;

  constructor() {
    this.analyzer = new TaskAnalyzer();
    this.router = new AgentRouter();
    this.costTracker = new CostTracker();

    // Initialize evolution system
    this.performanceTracker = new PerformanceTracker();
    this.learningManager = new LearningManager();
  }


  /**
   * Complete task routing flow: analysis → routing → cost check
   */
  async routeTask(task: Task): Promise<{
    analysis: TaskAnalysis;
    routing: RoutingDecision;
    approved: boolean;
    message: string;
  }> {
    const startTime = Date.now();

    // Step 1: Analyze task
    const analysis = await this.analyzer.analyze(task);

    // Step 2: Route to Agent
    const routing = await this.router.route(analysis);

    // Step 3: Check budget
    const approved = this.costTracker.isWithinBudget(routing.estimatedCost);

    const duration = Date.now() - startTime;

    // Step 4: Track performance
    this.performanceTracker.track({
      agentId: routing.selectedAgent,
      taskType: task.description.substring(0, 50),
      success: approved,
      durationMs: duration,
      cost: routing.estimatedCost,
      qualityScore: 0.8, // Will be updated after actual execution
      metadata: {
        complexity: analysis.complexity,
      },
    });

    const message = approved
      ? `✅ Task routed to ${routing.selectedAgent}`
      : `❌ Task blocked: Estimated cost ${formatMoney(routing.estimatedCost)} exceeds budget`;

    return {
      analysis,
      routing,
      approved,
      message,
    };
  }

  /**
   * Batch route multiple tasks
   */
  async routeBatch(tasks: Task[]): Promise<{
    results: Array<{
      analysis: TaskAnalysis;
      routing: RoutingDecision;
      approved: boolean;
    }>;
    totalCost: MicroDollars;
    approved: boolean;
  }> {
    const analyses = await this.analyzer.analyzeBatch(tasks);
    const routings = await this.router.routeBatch(analyses);

    const results = analyses.map((analysis, i) => {
      const routing = routings[i];
      const approved = this.costTracker.isWithinBudget(routing.estimatedCost);

      return { analysis, routing, approved };
    });

    const totalCost = routings.reduce(
      (sum, r) => (sum + r.estimatedCost) as import('../utils/money.js').MicroDollars,
      0 as import('../utils/money.js').MicroDollars
    );
    const approved = this.costTracker.isWithinBudget(totalCost);

    return {
      results,
      totalCost,
      approved,
    };
  }

  /**
   * Record actual cost after task execution
   */
  recordTaskCost(
    taskId: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): MicroDollars {
    return this.costTracker.recordCost(taskId, modelName, inputTokens, outputTokens);
  }

  /**
   * Get cost report
   */
  getCostReport(): string {
    return this.costTracker.generateReport();
  }

  /**
   * Get system resource status
   */
  async getSystemStatus(): Promise<{
    resources: Awaited<ReturnType<AgentRouter['getSystemResources']>>;
    costStats: ReturnType<CostTracker['getStats']>;
    recommendation: string;
  }> {
    const resources = await this.router.getSystemResources();
    const costStats = this.costTracker.getStats();
    const recommendation = this.costTracker.getRecommendation();

    return {
      resources,
      costStats,
      recommendation,
    };
  }

  /**
   * Get TaskAnalyzer instance (for advanced operations)
   */
  getAnalyzer(): TaskAnalyzer {
    return this.analyzer;
  }

  /**
   * Get AgentRouter instance (for advanced operations)
   */
  getRouter(): AgentRouter {
    return this.router;
  }

  /**
   * Get CostTracker instance (for advanced operations)
   */
  getCostTracker(): CostTracker {
    return this.costTracker;
  }

  /**
   * Get PerformanceTracker instance (for evolution system)
   */
  getPerformanceTracker(): PerformanceTracker {
    return this.performanceTracker;
  }

  /**
   * Get LearningManager instance (for evolution system)
   */
  getLearningManager(): LearningManager {
    return this.learningManager;
  }

}
