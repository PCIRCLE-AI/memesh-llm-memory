/**
 * Router - 統一路由介面
 *
 * 提供高層級的路由功能，整合 TaskAnalyzer 和 AgentRouter
 */

import { Task, TaskAnalysis, RoutingDecision } from './types.js';
import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentRouter } from './AgentRouter.js';
import { CostTracker } from './CostTracker.js';

export class Router {
  private analyzer: TaskAnalyzer;
  private router: AgentRouter;
  private costTracker: CostTracker;

  constructor() {
    this.analyzer = new TaskAnalyzer();
    this.router = new AgentRouter();
    this.costTracker = new CostTracker();
  }

  /**
   * 完整的任務路由流程：分析 → 路由 → 成本檢查
   */
  async routeTask(task: Task): Promise<{
    analysis: TaskAnalysis;
    routing: RoutingDecision;
    approved: boolean;
    message: string;
  }> {
    // 步驟 1: 分析任務
    const analysis = await this.analyzer.analyze(task);

    // 步驟 2: 路由到 Agent
    const routing = await this.router.route(analysis);

    // 步驟 3: 檢查預算
    const approved = this.costTracker.isWithinBudget(routing.estimatedCost);

    const message = approved
      ? `✅ Task routed to ${routing.selectedAgent}`
      : `❌ Task blocked: Estimated cost $${routing.estimatedCost} exceeds budget`;

    return {
      analysis,
      routing,
      approved,
      message,
    };
  }

  /**
   * 批次路由多個任務
   */
  async routeBatch(tasks: Task[]): Promise<{
    results: Array<{
      analysis: TaskAnalysis;
      routing: RoutingDecision;
      approved: boolean;
    }>;
    totalCost: number;
    approved: boolean;
  }> {
    const analyses = await this.analyzer.analyzeBatch(tasks);
    const routings = await this.router.routeBatch(analyses);

    const results = analyses.map((analysis, i) => {
      const routing = routings[i];
      const approved = this.costTracker.isWithinBudget(routing.estimatedCost);

      return { analysis, routing, approved };
    });

    const totalCost = routings.reduce((sum, r) => sum + r.estimatedCost, 0);
    const approved = this.costTracker.isWithinBudget(totalCost);

    return {
      results,
      totalCost,
      approved,
    };
  }

  /**
   * 記錄任務執行後的實際成本
   */
  recordTaskCost(
    taskId: string,
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    return this.costTracker.recordCost(taskId, modelName, inputTokens, outputTokens);
  }

  /**
   * 獲取成本報告
   */
  getCostReport(): string {
    return this.costTracker.generateReport();
  }

  /**
   * 獲取系統資源狀態
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
   * 獲取 TaskAnalyzer 實例 (用於進階操作)
   */
  getAnalyzer(): TaskAnalyzer {
    return this.analyzer;
  }

  /**
   * 獲取 AgentRouter 實例 (用於進階操作)
   */
  getRouter(): AgentRouter {
    return this.router;
  }

  /**
   * 獲取 CostTracker 實例 (用於進階操作)
   */
  getCostTracker(): CostTracker {
    return this.costTracker;
  }
}
