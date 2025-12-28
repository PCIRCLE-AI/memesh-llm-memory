/**
 * Router - 統一路由介面
 *
 * 提供高層級的路由功能，整合 TaskAnalyzer 和 AgentRouter
 */

import { Task, TaskAnalysis, RoutingDecision } from './types.js';
import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentRouter } from './AgentRouter.js';
import { CostTracker } from './CostTracker.js';
import { PerformanceTracker } from '../evolution/PerformanceTracker.js';
import { LearningManager } from '../evolution/LearningManager.js';
import { AdaptationEngine, AdaptedExecution } from '../evolution/AdaptationEngine.js';
import { getAllAgentConfigs, toAdaptationConfig } from '../evolution/AgentEvolutionConfig.js';

export class Router {
  private analyzer: TaskAnalyzer;
  private router: AgentRouter;
  private costTracker: CostTracker;

  // Evolution system
  private performanceTracker: PerformanceTracker;
  private learningManager: LearningManager;
  private adaptationEngine: AdaptationEngine;

  constructor() {
    this.analyzer = new TaskAnalyzer();
    this.router = new AgentRouter();
    this.costTracker = new CostTracker();

    // Initialize evolution system
    this.performanceTracker = new PerformanceTracker();
    this.learningManager = new LearningManager(this.performanceTracker);
    this.adaptationEngine = new AdaptationEngine(
      this.learningManager,
      this.performanceTracker
    );

    // Configure all 22 agents for evolution
    this.configureAgentEvolution();
  }

  /**
   * Configure evolution for all agents
   */
  private configureAgentEvolution(): void {
    const allConfigs = getAllAgentConfigs();

    for (const [agentId, evolutionConfig] of allConfigs) {
      if (evolutionConfig.evolutionEnabled) {
        const adaptationConfig = toAdaptationConfig(evolutionConfig);
        this.adaptationEngine.configureAgent(agentId, adaptationConfig);
      }
    }

    console.log(
      `Evolution system initialized for ${allConfigs.size} agents`
    );
  }

  /**
   * 完整的任務路由流程：分析 → 路由 → 成本檢查 → 演化適應
   */
  async routeTask(task: Task): Promise<{
    analysis: TaskAnalysis;
    routing: RoutingDecision;
    approved: boolean;
    message: string;
    adaptedExecution?: AdaptedExecution;
  }> {
    const startTime = Date.now();

    // 步驟 1: 分析任務
    const analysis = await this.analyzer.analyze(task);

    // 步驟 2: 路由到 Agent
    const routing = await this.router.route(analysis);

    // 步驟 3: 應用學習到的適應模式
    const adaptedExecution = await this.adaptationEngine.adaptExecution(
      routing.selectedAgent,
      task.description.substring(0, 50), // First 50 chars as task type
      {
        complexity: analysis.complexity,
        estimatedTokens: analysis.estimatedTokens,
      }
    );

    // Log applied patterns
    if (adaptedExecution.appliedPatterns.length > 0) {
      console.log('Applied evolution patterns:', {
        agentId: routing.selectedAgent,
        patterns: adaptedExecution.appliedPatterns,
      });
    }

    // 步驟 4: 檢查預算
    const approved = this.costTracker.isWithinBudget(routing.estimatedCost);

    const duration = Date.now() - startTime;

    // 步驟 5: 追蹤性能
    this.performanceTracker.track({
      agentId: routing.selectedAgent,
      taskType: task.description.substring(0, 50),
      success: approved,
      durationMs: duration,
      cost: routing.estimatedCost,
      qualityScore: 0.8, // Will be updated after actual execution
      metadata: {
        complexity: analysis.complexity,
        appliedPatterns: adaptedExecution.appliedPatterns,
      },
    });

    const message = approved
      ? `✅ Task routed to ${routing.selectedAgent}`
      : `❌ Task blocked: Estimated cost $${routing.estimatedCost} exceeds budget`;

    return {
      analysis,
      routing,
      approved,
      message,
      adaptedExecution,
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

  /**
   * 獲取 PerformanceTracker 實例 (用於演化系統)
   */
  getPerformanceTracker(): PerformanceTracker {
    return this.performanceTracker;
  }

  /**
   * 獲取 LearningManager 實例 (用於演化系統)
   */
  getLearningManager(): LearningManager {
    return this.learningManager;
  }

  /**
   * 獲取 AdaptationEngine 實例 (用於演化系統)
   */
  getAdaptationEngine(): AdaptationEngine {
    return this.adaptationEngine;
  }
}
