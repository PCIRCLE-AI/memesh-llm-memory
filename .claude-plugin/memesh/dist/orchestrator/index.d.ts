import { Task, TaskAnalysis, RoutingDecision } from './types.js';
import { Router } from './router.js';
import { GlobalResourcePool } from './GlobalResourcePool.js';
import { KnowledgeAgent } from '../agents/knowledge/index.js';
import { BackgroundExecutor } from '../core/BackgroundExecutor.js';
import { ResourceMonitor } from '../core/ResourceMonitor.js';
import { ExecutionConfig, Progress, BackgroundTask } from '../core/types.js';
export declare class Orchestrator {
    private router;
    private anthropic;
    private orchestratorId;
    private resourcePool;
    private knowledge;
    private backgroundExecutor;
    private resourceMonitor;
    constructor(options?: {
        knowledgeDbPath?: string;
    });
    initialize(): Promise<void>;
    executeTask(task: Task): Promise<{
        task: Task;
        analysis: TaskAnalysis;
        routing: RoutingDecision;
        response: string;
        cost: number;
        executionTimeMs: number;
    }>;
    executeBatch(tasks: Task[], mode?: 'sequential' | 'parallel', options?: {
        maxConcurrent?: number;
        forceSequential?: boolean;
    }): Promise<{
        results: Awaited<ReturnType<Orchestrator['executeTask']>>[];
        totalCost: number;
        totalTimeMs: number;
    }>;
    private callClaude;
    getCostReport(): string;
    getSystemStatus(): Promise<{
        resources: Awaited<ReturnType<Router['getSystemStatus']>>['resources'];
        costStats: Awaited<ReturnType<Router['getSystemStatus']>>['costStats'];
        recommendation: string;
    }>;
    exportCostData(): string;
    analyzeTask(task: Task): Promise<{
        analysis: TaskAnalysis;
        routing: RoutingDecision;
    }>;
    private executeTasksInParallel;
    getResourcePoolStatus(): Promise<ReturnType<GlobalResourcePool['getStatus']>>;
    getResourcePoolReport(): Promise<string>;
    getOrchestratorId(): string;
    getRouter(): Router;
    getKnowledgeAgent(): KnowledgeAgent;
    getDecisionHistory(): Promise<Awaited<ReturnType<KnowledgeAgent['getDecisions']>>>;
    getLessonsLearned(): Promise<Awaited<ReturnType<KnowledgeAgent['getLessonsLearned']>>>;
    recordBestPractice(practice: {
        name: string;
        description: string;
        why: string;
        example?: string;
        tags?: string[];
    }): Promise<void>;
    getKnowledgeStats(): Promise<Awaited<ReturnType<KnowledgeAgent['getStats']>>>;
    executeTaskWithMode(task: Task, config: ExecutionConfig): Promise<{
        taskId?: string;
        result?: Awaited<ReturnType<Orchestrator['executeTask']>>;
    }>;
    getBackgroundTaskProgress(taskId: string): Promise<Progress>;
    getBackgroundTask(taskId: string): BackgroundTask | undefined;
    cancelBackgroundTask(taskId: string): Promise<void>;
    getAllBackgroundTasks(): BackgroundTask[];
    getBackgroundStats(): ReturnType<BackgroundExecutor['getStats']>;
    clearFinishedBackgroundTasks(): number;
    getResourceStatus(): ReturnType<ResourceMonitor['getCurrentResources']>;
    close(): void;
}
export * from './types.js';
export { TaskAnalyzer } from './TaskAnalyzer.js';
export { AgentRouter } from './AgentRouter.js';
export { CostTracker } from './CostTracker.js';
export { Router } from './router.js';
//# sourceMappingURL=index.d.ts.map