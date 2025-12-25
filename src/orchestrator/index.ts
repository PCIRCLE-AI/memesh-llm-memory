/**
 * Agent Orchestrator - 主要入口點
 *
 * 智能 AI Agent 編排系統
 *
 * 核心功能：
 * - 任務複雜度分析 (TaskAnalyzer)
 * - 智能 Agent 路由 (AgentRouter)
 * - 成本追蹤與預算管理 (CostTracker)
 * - 記憶體感知調度
 * - 平行/循序執行決策
 *
 * 使用範例：
 * ```typescript
 * import { Orchestrator } from './orchestrator/index.js';
 *
 * const orchestrator = new Orchestrator();
 *
 * const result = await orchestrator.executeTask({
 *   id: 'task-1',
 *   description: 'Analyze the system architecture and suggest improvements',
 * });
 * ```
 */

import Anthropic from '@anthropic-ai/sdk';
import { Task, TaskAnalysis, RoutingDecision } from './types.js';
import { Router } from './router.js';
import { appConfig } from '../config/index.js';

export class Orchestrator {
  private router: Router;
  private anthropic: Anthropic;

  constructor() {
    this.router = new Router();
    this.anthropic = new Anthropic({
      apiKey: appConfig.claude.apiKey,
    });
  }

  /**
   * 執行單一任務
   */
  async executeTask(task: Task): Promise<{
    task: Task;
    analysis: TaskAnalysis;
    routing: RoutingDecision;
    response: string;
    cost: number;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();

    // 步驟 1: 路由任務
    const { analysis, routing, approved, message } = await this.router.routeTask(task);

    if (!approved) {
      throw new Error(`Task execution blocked: ${message}`);
    }

    console.log(`\n🎯 Executing task: ${task.id}`);
    console.log(`📊 Complexity: ${analysis.complexity}`);
    console.log(`🤖 Agent: ${routing.selectedAgent}`);
    console.log(`💰 Estimated cost: $${routing.estimatedCost.toFixed(6)}\n`);

    // 步驟 2: 執行任務
    const response = await this.callClaude(routing.modelName, task.description);

    // 步驟 3: 記錄成本
    const actualCost = this.router.recordTaskCost(
      task.id,
      routing.modelName,
      response.usage.input_tokens,
      response.usage.output_tokens
    );

    const executionTimeMs = Date.now() - startTime;

    console.log(`✅ Task completed in ${executionTimeMs}ms`);
    console.log(`💰 Actual cost: $${actualCost.toFixed(6)}\n`);

    return {
      task,
      analysis,
      routing,
      response: response.content[0].type === 'text' ? response.content[0].text : '',
      cost: actualCost,
      executionTimeMs,
    };
  }

  /**
   * 批次執行多個任務
   */
  async executeBatch(
    tasks: Task[],
    mode: 'sequential' | 'parallel' = 'sequential'
  ): Promise<{
    results: Awaited<ReturnType<Orchestrator['executeTask']>>[];
    totalCost: number;
    totalTimeMs: number;
  }> {
    const startTime = Date.now();

    console.log(`\n🚀 Executing ${tasks.length} tasks in ${mode} mode...\n`);

    let results: Awaited<ReturnType<Orchestrator['executeTask']>>[];

    if (mode === 'parallel') {
      results = await Promise.all(tasks.map(task => this.executeTask(task)));
    } else {
      results = [];
      for (const task of tasks) {
        const result = await this.executeTask(task);
        results.push(result);
      }
    }

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const totalTimeMs = Date.now() - startTime;

    console.log(`\n✅ Batch completed`);
    console.log(`📊 Tasks: ${results.length}`);
    console.log(`💰 Total cost: $${totalCost.toFixed(6)}`);
    console.log(`⏱️  Total time: ${totalTimeMs}ms\n`);

    return {
      results,
      totalCost,
      totalTimeMs,
    };
  }

  /**
   * 呼叫 Claude API
   */
  private async callClaude(
    model: string,
    prompt: string
  ): Promise<Anthropic.Message> {
    const message = await this.anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return message;
  }

  /**
   * 獲取成本報告
   */
  getCostReport(): string {
    return this.router.getCostReport();
  }

  /**
   * 獲取系統狀態
   */
  async getSystemStatus(): Promise<{
    resources: Awaited<ReturnType<Router['getSystemStatus']>>['resources'];
    costStats: Awaited<ReturnType<Router['getSystemStatus']>>['costStats'];
    recommendation: string;
  }> {
    return this.router.getSystemStatus();
  }

  /**
   * 導出成本數據
   */
  exportCostData(): string {
    return this.router.getCostTracker().exportData();
  }

  /**
   * 僅分析任務 (不執行)
   */
  async analyzeTask(task: Task): Promise<{
    analysis: TaskAnalysis;
    routing: RoutingDecision;
  }> {
    const { analysis, routing } = await this.router.routeTask(task);
    return { analysis, routing };
  }

  /**
   * 獲取 Router 實例 (進階用法)
   */
  getRouter(): Router {
    return this.router;
  }
}

// 導出所有必要的類型和類別
export * from './types.js';
export { TaskAnalyzer } from './TaskAnalyzer.js';
export { AgentRouter } from './AgentRouter.js';
export { CostTracker } from './CostTracker.js';
export { Router } from './router.js';

// CLI 模式 (當直接執行此文件時)
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new Orchestrator();

  // 示範任務
  const demoTasks: Task[] = [
    {
      id: 'task-1',
      description: 'Write a simple hello world function in TypeScript',
    },
    {
      id: 'task-2',
      description:
        'Analyze the system architecture of a microservices-based e-commerce platform ' +
        'and provide detailed recommendations for improving scalability, security, and performance',
    },
    {
      id: 'task-3',
      description: 'Format this JSON: {"name":"test","value":123}',
    },
  ];

  console.log('🎯 Agent Orchestrator Demo\n');

  // 分析所有任務
  for (const task of demoTasks) {
    const { analysis, routing } = await orchestrator.analyzeTask(task);
    console.log(`\n📋 Task: ${task.id}`);
    console.log(`   Description: ${task.description}`);
    console.log(`   Complexity: ${analysis.complexity}`);
    console.log(`   Agent: ${routing.selectedAgent}`);
    console.log(`   Estimated cost: $${routing.estimatedCost.toFixed(6)}`);
    console.log(`   Reasoning: ${analysis.reasoning}`);
  }

  // 顯示系統狀態
  console.log('\n' + '═'.repeat(60));
  const status = await orchestrator.getSystemStatus();
  console.log('\n💻 System Resources:');
  console.log(`   Memory: ${status.resources.availableMemoryMB}MB available`);
  console.log(`   Usage: ${status.resources.memoryUsagePercent}%`);

  console.log('\n💰 Cost Stats:');
  console.log(`   Monthly spend: $${status.costStats.monthlySpend.toFixed(6)}`);
  console.log(`   Remaining budget: $${status.costStats.remainingBudget.toFixed(2)}`);
  console.log(`   Recommendation: ${status.recommendation}`);

  console.log('\n' + '═'.repeat(60) + '\n');
}
