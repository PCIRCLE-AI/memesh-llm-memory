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
import { GlobalResourcePool } from './GlobalResourcePool.js';
import { randomBytes } from 'crypto';
import { KnowledgeAgent, SimilarTask } from '../agents/knowledge/index.js';
import { join } from 'path';
import { BackgroundExecutor } from '../core/BackgroundExecutor.js';
import { ResourceMonitor } from '../core/ResourceMonitor.js';
import { ExecutionConfig, Progress, BackgroundTask } from '../core/types.js';

export class Orchestrator {
  private router: Router;
  private anthropic: Anthropic;
  private orchestratorId: string;
  private resourcePool: GlobalResourcePool;
  private knowledge: KnowledgeAgent;
  private backgroundExecutor: BackgroundExecutor;
  private resourceMonitor: ResourceMonitor;

  constructor(options?: { knowledgeDbPath?: string }) {
    this.router = new Router();
    this.anthropic = new Anthropic({
      apiKey: appConfig.claude.apiKey,
    });
    // 生成唯一 ID
    this.orchestratorId = `orch-${randomBytes(4).toString('hex')}`;
    // 獲取全局資源池
    this.resourcePool = GlobalResourcePool.getInstance();
    // 初始化 Knowledge Graph
    const dbPath = options?.knowledgeDbPath || join(process.cwd(), 'data', 'knowledge-graph.db');
    this.knowledge = new KnowledgeAgent(dbPath);
    // 初始化 Background Execution 相關組件
    this.resourceMonitor = new ResourceMonitor();
    this.backgroundExecutor = new BackgroundExecutor(this.resourceMonitor);

    console.log(`[Orchestrator] Initialized with ID: ${this.orchestratorId}`);
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

    try {
      // 步驟 0: 查詢知識圖譜，尋找相似任務的經驗
      const similarTasks = await this.knowledge.findSimilar(task.description, 'feature');
      if (similarTasks.length > 0) {
        console.log(`💡 Found ${similarTasks.length} similar past experiences`);
        similarTasks.slice(0, 2).forEach((t: SimilarTask, i: number) => {
          console.log(`   ${i + 1}. ${t.name}`);
        });
      }

      // 步驟 1: 路由任務
      const { analysis, routing, approved, message } = await this.router.routeTask(task);

      if (!approved) {
        throw new Error(`Task execution blocked: ${message}`);
      }

      console.log(`\n🎯 Executing task: ${task.id}`);
      console.log(`📊 Complexity: ${analysis.complexity}`);
      console.log(`🤖 Agent: ${routing.selectedAgent}`);
      console.log(`💰 Estimated cost: $${routing.estimatedCost.toFixed(6)}\n`);

      // 記錄路由決策到知識圖譜
      await this.knowledge.recordDecision({
        name: `Task ${task.id} Routing Decision`,
        reason: routing.reasoning,
        alternatives: analysis.requiredAgents.filter(a => a !== routing.selectedAgent),
        tradeoffs: [`Estimated cost: $${routing.estimatedCost.toFixed(6)}`, `Complexity: ${analysis.complexity}`],
        outcome: `Selected ${routing.selectedAgent}`,
        tags: ['routing', 'orchestrator', task.id]
      });

      // 步驟 2: 執行任務
      // 使用 enhancedPrompt 中建議的模型，如果沒有則使用 fallback
      const modelToUse = routing.enhancedPrompt.suggestedModel || 'claude-sonnet-4-5-20250929';
      const response = await this.callClaude(modelToUse, task.description);

      // 步驟 3: 記錄成本
      const actualCost = this.router.recordTaskCost(
        task.id,
        modelToUse,
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      const executionTimeMs = Date.now() - startTime;

      console.log(`✅ Task completed in ${executionTimeMs}ms`);
      console.log(`💰 Actual cost: $${actualCost.toFixed(6)}\n`);

      // 記錄成功執行的特徵到知識圖譜
      await this.knowledge.recordFeature({
        name: `Task ${task.id} Execution`,
        description: task.description.substring(0, 100),
        implementation: `Agent: ${routing.selectedAgent}, Model: ${modelToUse}, Tokens: ${response.usage.input_tokens + response.usage.output_tokens}`,
        challenges: actualCost > routing.estimatedCost ? ['Cost exceeded estimate'] : undefined,
        tags: ['task-execution', routing.selectedAgent, task.id]
      });

      return {
        task,
        analysis,
        routing,
        response: response.content[0].type === 'text' ? response.content[0].text : '',
        cost: actualCost,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      // 記錄錯誤到知識圖譜
      await this.knowledge.recordBugFix({
        name: `Task ${task.id} Error`,
        rootCause: error instanceof Error ? error.message : String(error),
        solution: 'Task execution failed, needs investigation',
        prevention: 'Review task requirements and system constraints',
        tags: ['error', 'task-failure', task.id]
      });

      console.error(`❌ Task failed after ${executionTimeMs}ms:`, error);
      throw error;
    }
  }

  /**
   * 批次執行多個任務
   *
   * 新增資源管理：
   * - 動態調整並行度（基於系統資源）
   * - E2E 測試強制序列化
   * - 使用 GlobalResourcePool 協調
   */
  async executeBatch(
    tasks: Task[],
    mode: 'sequential' | 'parallel' = 'sequential',
    options?: {
      maxConcurrent?: number;  // 最大並行數（會根據系統資源調整）
      forceSequential?: boolean;  // 強制序列化（用於 E2E 測試）
    }
  ): Promise<{
    results: Awaited<ReturnType<Orchestrator['executeTask']>>[];
    totalCost: number;
    totalTimeMs: number;
  }> {
    const startTime = Date.now();

    // 檢查是否有 E2E 測試
    const hasE2E = tasks.some(task =>
      task.description?.toLowerCase().includes('e2e') ||
      task.description?.toLowerCase().includes('end-to-end')
    );

    // E2E 測試必須序列化
    if (hasE2E) {
      console.log('⚠️  Detected E2E tests - forcing sequential execution');
      mode = 'sequential';
    }

    // 強制序列化選項
    if (options?.forceSequential) {
      mode = 'sequential';
    }

    console.log(`\n🚀 Executing ${tasks.length} tasks in ${mode} mode...\n`);

    let results: Awaited<ReturnType<Orchestrator['executeTask']>>[];

    if (mode === 'parallel') {
      // 並行模式：使用資源感知的並行執行
      const maxConcurrent = options?.maxConcurrent ?? 2;  // 預設最多 2 個並行
      results = await this.executeTasksInParallel(tasks, maxConcurrent);
    } else {
      // 序列模式
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
   * 資源感知的並行執行
   *
   * 使用 Promise pool 限制並行度
   * 根據系統資源動態調整
   */
  private async executeTasksInParallel(
    tasks: Task[],
    maxConcurrent: number
  ): Promise<Awaited<ReturnType<Orchestrator['executeTask']>>[]> {
    const results: Awaited<ReturnType<Orchestrator['executeTask']>>[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = this.executeTask(task).then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= maxConcurrent) {
        // 等待其中一個完成
        await Promise.race(executing);
        // 移除已完成的
        const stillExecuting = executing.filter(p =>
          Promise.race([p, Promise.resolve('done')]).then(v => v !== 'done')
        );
        executing.length = 0;
        executing.push(...stillExecuting);
      }
    }

    // 等待所有剩餘任務完成
    await Promise.all(executing);

    return results;
  }

  /**
   * 獲取資源池狀態
   */
  async getResourcePoolStatus(): Promise<ReturnType<GlobalResourcePool['getStatus']>> {
    return this.resourcePool.getStatus();
  }

  /**
   * 生成資源池報告
   */
  async getResourcePoolReport(): Promise<string> {
    return this.resourcePool.generateReport();
  }

  /**
   * 獲取 Orchestrator ID
   */
  getOrchestratorId(): string {
    return this.orchestratorId;
  }

  /**
   * 獲取 Router 實例 (進階用法)
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * 獲取 Knowledge Agent 實例
   */
  getKnowledgeAgent(): KnowledgeAgent {
    return this.knowledge;
  }

  /**
   * 查詢知識圖譜中的決策記錄
   */
  async getDecisionHistory(): Promise<Awaited<ReturnType<KnowledgeAgent['getDecisions']>>> {
    return this.knowledge.getDecisions();
  }

  /**
   * 查詢知識圖譜中的教訓記錄
   */
  async getLessonsLearned(): Promise<Awaited<ReturnType<KnowledgeAgent['getLessonsLearned']>>> {
    return this.knowledge.getLessonsLearned();
  }

  /**
   * 手動記錄最佳實踐到知識圖譜
   */
  async recordBestPractice(practice: {
    name: string;
    description: string;
    why: string;
    example?: string;
    tags?: string[];
  }): Promise<void> {
    await this.knowledge.recordBestPractice(practice);
  }

  /**
   * 獲取知識圖譜統計資訊
   */
  async getKnowledgeStats(): Promise<Awaited<ReturnType<KnowledgeAgent['getStats']>>> {
    return this.knowledge.getStats();
  }

  /**
   * Execute task with execution mode choice
   * @param task Task to execute
   * @param config Execution configuration
   * @returns taskId for background mode, result for foreground mode
   */
  async executeTaskWithMode(
    task: Task,
    config: ExecutionConfig
  ): Promise<{ taskId?: string; result?: Awaited<ReturnType<Orchestrator['executeTask']>> }> {
    if (config.mode === 'background') {
      // Background execution
      const wrappedTask = async (context: {
        updateProgress: (progress: number, stage?: string) => void;
        isCancelled: () => boolean;
      }) => {
        // Execute the actual orchestrator task
        const result = await this.executeTask(task);

        // Update progress throughout execution
        context.updateProgress(0.3, 'routing');
        context.updateProgress(0.6, 'executing');
        context.updateProgress(0.9, 'finalizing');
        context.updateProgress(1.0, 'completed');

        return result;
      };

      const taskId = await this.backgroundExecutor.executeTask(wrappedTask, config);
      return { taskId };
    } else if (config.mode === 'foreground') {
      // Foreground execution (existing behavior)
      const result = await this.executeTask(task);
      return { result };
    } else {
      // Auto mode - decide based on task analysis
      const { analysis } = await this.analyzeTask(task);

      // Simple heuristic: complex tasks run in background
      if (analysis.complexity === 'complex') {
        const backgroundConfig: ExecutionConfig = {
          ...config,
          mode: 'background',
        };
        const taskId = await this.backgroundExecutor.executeTask(
          async (context: any) => this.executeTask(task),
          backgroundConfig
        );
        return { taskId };
      } else {
        const result = await this.executeTask(task);
        return { result };
      }
    }
  }

  /**
   * Get background task progress
   * @param taskId Task ID
   * @returns Current progress
   */
  async getBackgroundTaskProgress(taskId: string): Promise<Progress> {
    return this.backgroundExecutor.getProgress(taskId);
  }

  /**
   * Get background task by ID
   * @param taskId Task ID
   * @returns Background task or undefined
   */
  getBackgroundTask(taskId: string): BackgroundTask | undefined {
    return this.backgroundExecutor.getTask(taskId);
  }

  /**
   * Cancel background task
   * @param taskId Task ID
   */
  async cancelBackgroundTask(taskId: string): Promise<void> {
    return this.backgroundExecutor.cancelTask(taskId);
  }

  /**
   * Get all background tasks
   * @returns Array of all background tasks
   */
  getAllBackgroundTasks(): BackgroundTask[] {
    return this.backgroundExecutor.getAllTasks();
  }

  /**
   * Get background execution statistics
   */
  getBackgroundStats(): ReturnType<BackgroundExecutor['getStats']> {
    return this.backgroundExecutor.getStats();
  }

  /**
   * Clear finished background tasks
   * @returns Number of tasks cleared
   */
  clearFinishedBackgroundTasks(): number {
    return this.backgroundExecutor.clearFinishedTasks();
  }

  /**
   * Get current resource status
   */
  getResourceStatus(): ReturnType<ResourceMonitor['getCurrentResources']> {
    return this.resourceMonitor.getCurrentResources();
  }

  /**
   * 關閉 Orchestrator（清理資源）
   */
  close(): void {
    this.knowledge.close();
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
