import Anthropic from '@anthropic-ai/sdk';
import { Router } from './router.js';
import { appConfig } from '../config/index.js';
import { GlobalResourcePool } from './GlobalResourcePool.js';
import { randomBytes } from 'crypto';
import { KnowledgeAgent } from '../agents/knowledge/index.js';
import { join } from 'path';
import { BackgroundExecutor } from '../core/BackgroundExecutor.js';
import { ResourceMonitor } from '../core/ResourceMonitor.js';
import { ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
export class Orchestrator {
    router;
    anthropic;
    orchestratorId;
    resourcePool;
    knowledge;
    backgroundExecutor;
    resourceMonitor;
    constructor(options) {
        this.router = new Router();
        this.anthropic = new Anthropic({
            apiKey: appConfig.claude.apiKey,
        });
        this.orchestratorId = `orch-${randomBytes(4).toString('hex')}`;
        this.resourcePool = GlobalResourcePool.getInstance();
        const dbPath = options?.knowledgeDbPath || join(process.cwd(), 'data', 'knowledge-graph.db');
        this.knowledge = new KnowledgeAgent(dbPath);
        this.resourceMonitor = new ResourceMonitor();
        this.backgroundExecutor = new BackgroundExecutor(this.resourceMonitor);
        logger.info(`[Orchestrator] Initialized with ID: ${this.orchestratorId}`);
    }
    async executeTask(task) {
        const startTime = Date.now();
        try {
            const similarTasks = await this.knowledge.findSimilar(task.description, 'feature');
            if (similarTasks.length > 0) {
                logger.info(`💡 Found ${similarTasks.length} similar past experiences`);
                similarTasks.slice(0, 2).forEach((t, i) => {
                    logger.info(`   ${i + 1}. ${t.name}`);
                });
            }
            const { analysis, routing, approved, message } = await this.router.routeTask(task);
            if (!approved) {
                throw new ValidationError(`Task execution blocked: ${message}`, {
                    component: 'Orchestrator',
                    method: 'executeTask',
                    taskId: task.id,
                    taskDescription: task.description,
                    blockReason: message,
                    constraint: 'task must be approved by router',
                });
            }
            logger.info(`\n🎯 Executing task: ${task.id}`);
            logger.info(`📊 Complexity: ${analysis.complexity}`);
            logger.info(`🤖 Agent: ${routing.selectedAgent}`);
            logger.info(`💰 Estimated cost: $${routing.estimatedCost.toFixed(6)}\n`);
            await this.knowledge.recordDecision({
                name: `Task ${task.id} Routing Decision`,
                reason: routing.reasoning,
                alternatives: analysis.requiredAgents.filter(a => a !== routing.selectedAgent),
                tradeoffs: [`Estimated cost: $${routing.estimatedCost.toFixed(6)}`, `Complexity: ${analysis.complexity}`],
                outcome: `Selected ${routing.selectedAgent}`,
                tags: ['routing', 'orchestrator', task.id]
            });
            const modelToUse = routing.enhancedPrompt.suggestedModel || 'claude-sonnet-4-5-20250929';
            const response = await this.callClaude(modelToUse, task.description);
            const actualCost = this.router.recordTaskCost(task.id, modelToUse, response.usage.input_tokens, response.usage.output_tokens);
            const executionTimeMs = Date.now() - startTime;
            logger.info(`✅ Task completed in ${executionTimeMs}ms`);
            logger.info(`💰 Actual cost: $${actualCost.toFixed(6)}\n`);
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
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
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
    async executeBatch(tasks, mode = 'sequential', options) {
        const startTime = Date.now();
        const hasE2E = tasks.some(task => task.description?.toLowerCase().includes('e2e') ||
            task.description?.toLowerCase().includes('end-to-end'));
        if (hasE2E) {
            logger.info('⚠️  Detected E2E tests - forcing sequential execution');
            mode = 'sequential';
        }
        if (options?.forceSequential) {
            mode = 'sequential';
        }
        logger.info(`\n🚀 Executing ${tasks.length} tasks in ${mode} mode...\n`);
        let results;
        if (mode === 'parallel') {
            const maxConcurrent = options?.maxConcurrent ?? 2;
            results = await this.executeTasksInParallel(tasks, maxConcurrent);
        }
        else {
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
    async callClaude(model, prompt) {
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
    getCostReport() {
        return this.router.getCostReport();
    }
    async getSystemStatus() {
        return this.router.getSystemStatus();
    }
    exportCostData() {
        return this.router.getCostTracker().exportData();
    }
    async analyzeTask(task) {
        const { analysis, routing } = await this.router.routeTask(task);
        return { analysis, routing };
    }
    async executeTasksInParallel(tasks, maxConcurrent) {
        const results = [];
        const executing = [];
        for (const task of tasks) {
            const promise = this.executeTask(task).then(result => {
                results.push(result);
                const index = executing.indexOf(promise);
                if (index > -1) {
                    executing.splice(index, 1);
                }
            });
            executing.push(promise);
            if (executing.length >= maxConcurrent) {
                await Promise.race(executing);
            }
        }
        await Promise.all(executing);
        return results;
    }
    async getResourcePoolStatus() {
        return this.resourcePool.getStatus();
    }
    async getResourcePoolReport() {
        return this.resourcePool.generateReport();
    }
    getOrchestratorId() {
        return this.orchestratorId;
    }
    getRouter() {
        return this.router;
    }
    getKnowledgeAgent() {
        return this.knowledge;
    }
    async getDecisionHistory() {
        return this.knowledge.getDecisions();
    }
    async getLessonsLearned() {
        return this.knowledge.getLessonsLearned();
    }
    async recordBestPractice(practice) {
        await this.knowledge.recordBestPractice(practice);
    }
    async getKnowledgeStats() {
        return this.knowledge.getStats();
    }
    async executeTaskWithMode(task, config) {
        if (config.mode === 'background') {
            const wrappedTask = async (context) => {
                const result = await this.executeTask(task);
                context.updateProgress(0.3, 'routing');
                context.updateProgress(0.6, 'executing');
                context.updateProgress(0.9, 'finalizing');
                context.updateProgress(1.0, 'completed');
                return result;
            };
            const taskId = await this.backgroundExecutor.executeTask(wrappedTask, config);
            return { taskId };
        }
        else if (config.mode === 'foreground') {
            const result = await this.executeTask(task);
            return { result };
        }
        else {
            const { analysis } = await this.analyzeTask(task);
            if (analysis.complexity === 'complex') {
                const backgroundConfig = {
                    ...config,
                    mode: 'background',
                };
                const taskId = await this.backgroundExecutor.executeTask(async (context) => this.executeTask(task), backgroundConfig);
                return { taskId };
            }
            else {
                const result = await this.executeTask(task);
                return { result };
            }
        }
    }
    async getBackgroundTaskProgress(taskId) {
        return this.backgroundExecutor.getProgress(taskId);
    }
    getBackgroundTask(taskId) {
        return this.backgroundExecutor.getTask(taskId);
    }
    async cancelBackgroundTask(taskId) {
        return this.backgroundExecutor.cancelTask(taskId);
    }
    getAllBackgroundTasks() {
        return this.backgroundExecutor.getAllTasks();
    }
    getBackgroundStats() {
        return this.backgroundExecutor.getStats();
    }
    clearFinishedBackgroundTasks() {
        return this.backgroundExecutor.clearFinishedTasks();
    }
    getResourceStatus() {
        return this.resourceMonitor.getCurrentResources();
    }
    close() {
        this.knowledge.close();
    }
}
export * from './types.js';
export { TaskAnalyzer } from './TaskAnalyzer.js';
export { AgentRouter } from './AgentRouter.js';
export { CostTracker } from './CostTracker.js';
export { Router } from './router.js';
if (import.meta.url === `file://${process.argv[1]}`) {
    const orchestrator = new Orchestrator();
    const demoTasks = [
        {
            id: 'task-1',
            description: 'Write a simple hello world function in TypeScript',
        },
        {
            id: 'task-2',
            description: 'Analyze the system architecture of a microservices-based e-commerce platform ' +
                'and provide detailed recommendations for improving scalability, security, and performance',
        },
        {
            id: 'task-3',
            description: 'Format this JSON: {"name":"test","value":123}',
        },
    ];
    logger.info('🎯 Agent Orchestrator Demo\n');
    for (const task of demoTasks) {
        const { analysis, routing } = await orchestrator.analyzeTask(task);
        logger.info(`\n📋 Task: ${task.id}`);
        logger.info(`   Description: ${task.description}`);
        logger.info(`   Complexity: ${analysis.complexity}`);
        logger.info(`   Agent: ${routing.selectedAgent}`);
        logger.info(`   Estimated cost: $${routing.estimatedCost.toFixed(6)}`);
        logger.info(`   Reasoning: ${analysis.reasoning}`);
    }
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
//# sourceMappingURL=index.js.map