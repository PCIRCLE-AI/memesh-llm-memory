import { Task, TaskAnalysis, RoutingDecision } from './types.js';
import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentRouter } from './AgentRouter.js';
import { CostTracker } from './CostTracker.js';
import { PerformanceTracker } from '../evolution/PerformanceTracker.js';
import { LearningManager } from '../evolution/LearningManager.js';
import { type MicroDollars } from '../utils/money.js';
export declare class Router {
    private analyzer;
    private router;
    private costTracker;
    private performanceTracker;
    private learningManager;
    constructor();
    routeTask(task: Task): Promise<{
        analysis: TaskAnalysis;
        routing: RoutingDecision;
        approved: boolean;
        message: string;
    }>;
    routeBatch(tasks: Task[]): Promise<{
        results: Array<{
            analysis: TaskAnalysis;
            routing: RoutingDecision;
            approved: boolean;
        }>;
        totalCost: MicroDollars;
        approved: boolean;
    }>;
    recordTaskCost(taskId: string, modelName: string, inputTokens: number, outputTokens: number): MicroDollars;
    getCostReport(): string;
    getSystemStatus(): Promise<{
        resources: Awaited<ReturnType<AgentRouter['getSystemResources']>>;
        costStats: ReturnType<CostTracker['getStats']>;
        recommendation: string;
    }>;
    getAnalyzer(): TaskAnalyzer;
    getRouter(): AgentRouter;
    getCostTracker(): CostTracker;
    getPerformanceTracker(): PerformanceTracker;
    getLearningManager(): LearningManager;
}
//# sourceMappingURL=router.d.ts.map