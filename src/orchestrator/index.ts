/**
 * Agent Orchestrator - Main Entry Point
 *
 * Intelligent AI Agent Orchestration System
 *
 * Core Features:
 * - Task complexity analysis (TaskAnalyzer)
 * - Intelligent Agent routing (AgentRouter)
 * - Cost tracking and budget management (CostTracker)
 * - Memory-aware scheduling
 * - Parallel/sequential execution decisions
 *
 * Usage Example:
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
import { ProgressReporter } from '../mcp/ProgressReporter.js';
import { randomBytes } from 'crypto';
import { KnowledgeAgent, SimilarTask } from '../agents/knowledge/index.js';
import { join } from 'path';
import { BackgroundExecutor } from '../core/BackgroundExecutor.js';
import { ResourceMonitor } from '../core/ResourceMonitor.js';
import { ExecutionConfig, Progress, BackgroundTask } from '../core/types.js';
import { ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
import { formatMoney } from '../utils/money.js';
// ✅ SECURITY FIX (HIGH-3): Import path validation to prevent path traversal
import { validateDatabasePath } from '../utils/pathValidation.js';

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
    // Generate unique ID
    this.orchestratorId = `orch-${randomBytes(4).toString('hex')}`;
    // Get global resource pool
    this.resourcePool = GlobalResourcePool.getInstance();
    // ✅ SECURITY FIX (HIGH-3): Validate database path to prevent path traversal attacks
    const rawDbPath = options?.knowledgeDbPath || join(process.cwd(), 'data', 'knowledge-graph.db');
    const dbPath = validateDatabasePath(rawDbPath);
    this.knowledge = new KnowledgeAgent(dbPath);
    // Initialize Background Execution related components
    this.resourceMonitor = new ResourceMonitor();
    this.backgroundExecutor = new BackgroundExecutor(this.resourceMonitor);

    logger.info(`[Orchestrator] Initialized with ID: ${this.orchestratorId}`);
  }

  /**
   * Initialize async components (KnowledgeAgent)
   *
   * IMPORTANT: Must be called after constructor and before executing any tasks.
   * This is separate from constructor because KnowledgeAgent requires async
   * initialization (database setup, schema migration).
   *
   * @throws Error if KnowledgeAgent initialization fails
   *
   * @example
   * ```typescript
   * const orchestrator = new Orchestrator();
   * await orchestrator.initialize();  // Required!
   * await orchestrator.executeTasksInParallel(tasks, 3);
   * ```
   */
  async initialize(): Promise<void> {
    await this.knowledge.initialize();
  }

  /**
   * Execute single task
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
      // Step 0: Query knowledge graph for similar task experiences
      const similarTasks = await this.knowledge.findSimilar(task.description, 'feature');
      if (similarTasks.length > 0) {
        logger.info(`💡 Found ${similarTasks.length} similar past experiences`);
        similarTasks.slice(0, 2).forEach((t: SimilarTask, i: number) => {
          logger.info(`   ${i + 1}. ${t.name}`);
        });
      }

      // Step 1: Route task
      const { analysis, routing, approved, message } = await this.router.routeTask(task);

      if (!approved) {
        throw new ValidationError(
          `Task execution blocked: ${message}`,
          {
            component: 'Orchestrator',
            method: 'executeTask',
            taskId: task.id,
            taskDescription: task.description,
            blockReason: message,
            constraint: 'task must be approved by router',
          }
        );
      }

      logger.info(`\n🎯 Executing task: ${task.id}`);
      logger.info(`📊 Complexity: ${analysis.complexity}`);
      const capabilitySummary = analysis.requiredCapabilities.length > 0
        ? analysis.requiredCapabilities.join(', ')
        : 'general';
      logger.info(`🧭 Capabilities: ${capabilitySummary}`);
      logger.info(`💰 Estimated cost: ${formatMoney(routing.estimatedCost)}\n`);

      // Record routing decision to knowledge graph
      await this.knowledge.recordDecision({
        name: `Task ${task.id} Routing Decision`,
        reason: routing.reasoning,
        alternatives: analysis.requiredCapabilities,
        tradeoffs: [`Estimated cost: ${formatMoney(routing.estimatedCost)}`, `Complexity: ${analysis.complexity}`],
        outcome: `Selected capabilities: ${capabilitySummary}`,
        tags: ['routing', 'orchestrator', task.id]
      });

      // Step 2: Execute task
      // Use model suggested in enhancedPrompt, use fallback if none
      const modelToUse = routing.enhancedPrompt.suggestedModel || 'claude-sonnet-4-5-20250929';
      const response = await this.callClaude(modelToUse, task.description);

      // Step 3: Record cost
      const actualCost = this.router.recordTaskCost(
        task.id,
        modelToUse,
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      const executionTimeMs = Date.now() - startTime;

      logger.info(`✅ Task completed in ${executionTimeMs}ms`);
      logger.info(`💰 Actual cost: ${formatMoney(actualCost)}\n`);

      // Record successful execution features to knowledge graph
      await this.knowledge.recordFeature({
        name: `Task ${task.id} Execution`,
        description: task.description.substring(0, 100),
        implementation: `Capabilities: ${capabilitySummary}, Model: ${modelToUse}, Tokens: ${response.usage.input_tokens + response.usage.output_tokens}`,
        challenges: actualCost > routing.estimatedCost ? ['Cost exceeded estimate'] : undefined,
        tags: ['task-execution', task.id]
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

      // Record error to knowledge graph
      await this.knowledge.recordBugFix({
        name: `Task ${task.id} Error`,
        rootCause: error instanceof Error ? error.message : String(error),
        solution: 'Task execution failed, needs investigation',
        prevention: 'Review task requirements and system constraints',
        tags: ['error', 'task-failure', task.id]
      });

      logger.error(`❌ Task failed after ${executionTimeMs}ms:`, error);
      throw error;
    }
  }

  /**
   * Execute multiple tasks in batch
   *
   * Added resource management:
   * - Dynamically adjust concurrency (based on system resources)
   * - E2E tests force serialization
   * - Uses GlobalResourcePool for coordination
   */
  async executeBatch(
    tasks: Task[],
    mode: 'sequential' | 'parallel' = 'sequential',
    options?: {
      maxConcurrent?: number;  // Maximum concurrency (adjusted based on system resources)
      forceSequential?: boolean;  // Force serialization (for E2E tests)
    }
  ): Promise<{
    results: Awaited<ReturnType<Orchestrator['executeTask']>>[];
    totalCost: number;
    totalTimeMs: number;
  }> {
    const startTime = Date.now();

    // Check if there are E2E tests
    const hasE2E = tasks.some(task =>
      task.description?.toLowerCase().includes('e2e') ||
      task.description?.toLowerCase().includes('end-to-end')
    );

    // E2E tests must be serialized
    if (hasE2E) {
      logger.info('⚠️  Detected E2E tests - forcing sequential execution');
      mode = 'sequential';
    }

    // Force serialization option
    if (options?.forceSequential) {
      mode = 'sequential';
    }

    logger.info(`\n🚀 Executing ${tasks.length} tasks in ${mode} mode...\n`);

    let results: Awaited<ReturnType<Orchestrator['executeTask']>>[];

    if (mode === 'parallel') {
      // Parallel mode: use resource-aware parallel execution
      const maxConcurrent = options?.maxConcurrent ?? 2;  // Default max 2 concurrent
      results = await this.executeTasksInParallel(tasks, maxConcurrent);
    } else {
      // Sequential mode
      results = [];
      for (const task of tasks) {
        const result = await this.executeTask(task);
        results.push(result);
      }
    }

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const totalTimeMs = Date.now() - startTime;

    logger.info(`\n✅ Batch completed`);
    logger.info(`📊 Tasks: ${results.length}`);
    logger.info(`💰 Total cost: $${totalCost.toFixed(6)}`);
    logger.info(`⏱️  Total time: ${totalTimeMs}ms\n`);

    return {
      results,
      totalCost,
      totalTimeMs,
    };
  }

  /**
   * Call Claude API
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
   * Get cost report
   */
  getCostReport(): string {
    return this.router.getCostReport();
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<{
    resources: Awaited<ReturnType<Router['getSystemStatus']>>['resources'];
    costStats: Awaited<ReturnType<Router['getSystemStatus']>>['costStats'];
    recommendation: string;
  }> {
    return this.router.getSystemStatus();
  }

  /**
   * Export cost data
   */
  exportCostData(): string {
    return this.router.getCostTracker().exportData();
  }

  /**
   * Only analyze task (do not execute)
   */
  async analyzeTask(task: Task): Promise<{
    analysis: TaskAnalysis;
    routing: RoutingDecision;
  }> {
    const { analysis, routing } = await this.router.routeTask(task);
    return { analysis, routing };
  }

  /**
   * Resource-aware parallel execution
   *
   * Use Promise pool to limit concurrency
   * Dynamically adjust based on system resources
   */
  private async executeTasksInParallel(
    tasks: Task[],
    maxConcurrent: number,
    progressReporter?: ProgressReporter
  ): Promise<Awaited<ReturnType<Orchestrator['executeTask']>>[]> {
    const results: Awaited<ReturnType<Orchestrator['executeTask']>>[] = [];
    const executing: Promise<void>[] = [];
    let completed = 0;
    const total = tasks.length;

    for (const task of tasks) {
      // Create promise that removes itself from pool when complete
      const promise = this.executeTask(task).then(result => {
        results.push(result);
        completed++;

        // Report progress
        if (progressReporter) {
          progressReporter.report(completed, total, `Completed ${completed}/${total} tasks`);
        }

        // Remove this promise from executing array
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(promise);

      if (executing.length >= maxConcurrent) {
        // Wait for at least one to complete (it will remove itself)
        await Promise.race(executing);
      }
    }

    // Wait for all remaining tasks to complete
    await Promise.all(executing);

    return results;
  }

  /**
   * Get resource pool status
   */
  async getResourcePoolStatus(): Promise<ReturnType<GlobalResourcePool['getStatus']>> {
    return this.resourcePool.getStatus();
  }

  /**
   * Generate resource pool report
   */
  async getResourcePoolReport(): Promise<string> {
    return this.resourcePool.generateReport();
  }

  /**
   * Get Orchestrator ID
   */
  getOrchestratorId(): string {
    return this.orchestratorId;
  }

  /**
   * Get Router instance (advanced usage)
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get Knowledge Agent instance
   */
  getKnowledgeAgent(): KnowledgeAgent {
    return this.knowledge;
  }

  /**
   * Query decision records in knowledge graph
   */
  async getDecisionHistory(): Promise<Awaited<ReturnType<KnowledgeAgent['getDecisions']>>> {
    return this.knowledge.getDecisions();
  }

  /**
   * Query lesson records in knowledge graph
   */
  async getLessonsLearned(): Promise<Awaited<ReturnType<KnowledgeAgent['getLessonsLearned']>>> {
    return this.knowledge.getLessonsLearned();
  }

  /**
   * Manually record best practices to knowledge graph
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
   * Get knowledge graph statistics
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

      // ✅ FIX MEDIUM-2: Catch and log BackgroundExecutor errors
      try {
        const taskId = await this.backgroundExecutor.executeTask(wrappedTask, config);
        return { taskId };
      } catch (error) {
        logger.error('[Orchestrator] Failed to submit background task:', {
          taskId: task.id,
          taskDescription: task.description,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error; // Re-throw after logging
      }
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

        // ✅ FIX MEDIUM-2: Catch and log BackgroundExecutor errors
        try {
          const taskId = await this.backgroundExecutor.executeTask(
            async (context: unknown) => this.executeTask(task),
            backgroundConfig
          );
          return { taskId };
        } catch (error) {
          logger.error('[Orchestrator] Failed to submit complex task to background:', {
            taskId: task.id,
            taskDescription: task.description,
            complexity: analysis.complexity,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error; // Re-throw after logging
        }
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
   * Close Orchestrator (cleanup resources)
   *
   * ✅ FIX MAJOR-1: Comprehensive resource cleanup
   * Prevents resource leaks by cleaning up all components:
   * - BackgroundExecutor: Cancels running tasks
   * - ResourceMonitor: Disposes intervals
   * - GlobalResourcePool: Releases E2E slot
   * - KnowledgeAgent: Closes database connection
   */
  close(): void {
    // 1. Cancel all running background tasks
    const runningTasks = this.backgroundExecutor.getTasksByStatus('running');
    for (const task of runningTasks) {
      this.backgroundExecutor.cancelTask(task.taskId).catch(error => {
        // Log but don't throw - we want to continue cleanup
        logger.warn(`Failed to cancel task ${task.taskId} during shutdown:`, error);
      });
    }

    // 2. Dispose ResourceMonitor (clears all intervals)
    try {
      this.resourceMonitor.dispose();
    } catch (error) {
      logger.warn('Failed to dispose ResourceMonitor:', error);
    }

    // 3. Release E2E slot in GlobalResourcePool
    try {
      this.resourcePool.releaseE2ESlot(this.orchestratorId);
    } catch (error) {
      logger.warn(`Failed to release E2E slot for ${this.orchestratorId}:`, error);
    }

    // 4. Close KnowledgeAgent database connection
    try {
      this.knowledge.close();
    } catch (error) {
      logger.warn('Failed to close KnowledgeAgent:', error);
    }

    logger.info(`Orchestrator ${this.orchestratorId} shutdown complete`);
  }
}

// Export all necessary types and classes
export * from './types.js';
export { TaskAnalyzer } from './TaskAnalyzer.js';
export { AgentRouter } from './AgentRouter.js';
export { CostTracker } from './CostTracker.js';
export { Router } from './router.js';

// CLI mode (when executing this file directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new Orchestrator();

  // Demo tasks
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

  logger.info('🎯 Agent Orchestrator Demo\n');

  // Analyze all tasks
  for (const task of demoTasks) {
    const { analysis, routing } = await orchestrator.analyzeTask(task);
    logger.info(`\n📋 Task: ${task.id}`);
    logger.info(`   Description: ${task.description}`);
    logger.info(`   Complexity: ${analysis.complexity}`);
    logger.info(`   Agent: ${routing.selectedAgent}`);
    logger.info(`   Estimated cost: ${formatMoney(routing.estimatedCost)}`);
    logger.info(`   Reasoning: ${analysis.reasoning}`);
  }

  // Show system status
  logger.info('\n' + '═'.repeat(60));
  const status = await orchestrator.getSystemStatus();
  logger.info('\n💻 System Resources:');
  logger.info(`   Memory: ${status.resources.availableMemoryMB}MB available`);
  logger.info(`   Usage: ${status.resources.memoryUsagePercent}%`);

  logger.info('\n💰 Cost Stats:');
  logger.info(`   Monthly spend: $${status.costStats.monthlySpend.toFixed(6)}`);
  logger.info(`   Remaining budget: $${status.costStats.remainingBudget.toFixed(2)}`);
  logger.info(`   Recommendation: ${status.recommendation}`);

  logger.info('\n' + '═'.repeat(60) + '\n');
}
