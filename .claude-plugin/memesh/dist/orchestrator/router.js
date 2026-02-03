import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentRouter } from './AgentRouter.js';
import { CostTracker } from './CostTracker.js';
import { PerformanceTracker } from '../evolution/PerformanceTracker.js';
import { LearningManager } from '../evolution/LearningManager.js';
import { formatMoney } from '../utils/money.js';
export class Router {
    analyzer;
    router;
    costTracker;
    performanceTracker;
    learningManager;
    constructor() {
        this.analyzer = new TaskAnalyzer();
        this.router = new AgentRouter();
        this.costTracker = new CostTracker();
        this.performanceTracker = new PerformanceTracker();
        this.learningManager = new LearningManager();
    }
    async routeTask(task) {
        const startTime = Date.now();
        const analysis = await this.analyzer.analyze(task);
        const routing = await this.router.route(analysis);
        const approved = this.costTracker.isWithinBudget(routing.estimatedCost);
        const duration = Date.now() - startTime;
        this.performanceTracker.track({
            agentId: routing.selectedAgent,
            taskType: task.description.substring(0, 50),
            success: approved,
            durationMs: duration,
            cost: routing.estimatedCost,
            qualityScore: 0.8,
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
    async routeBatch(tasks) {
        const analyses = await this.analyzer.analyzeBatch(tasks);
        const routings = await this.router.routeBatch(analyses);
        const results = analyses.map((analysis, i) => {
            const routing = routings[i];
            const approved = this.costTracker.isWithinBudget(routing.estimatedCost);
            return { analysis, routing, approved };
        });
        const totalCost = routings.reduce((sum, r) => (sum + r.estimatedCost), 0);
        const approved = this.costTracker.isWithinBudget(totalCost);
        return {
            results,
            totalCost,
            approved,
        };
    }
    recordTaskCost(taskId, modelName, inputTokens, outputTokens) {
        return this.costTracker.recordCost(taskId, modelName, inputTokens, outputTokens);
    }
    getCostReport() {
        return this.costTracker.generateReport();
    }
    async getSystemStatus() {
        const resources = await this.router.getSystemResources();
        const costStats = this.costTracker.getStats();
        const recommendation = this.costTracker.getRecommendation();
        return {
            resources,
            costStats,
            recommendation,
        };
    }
    getAnalyzer() {
        return this.analyzer;
    }
    getRouter() {
        return this.router;
    }
    getCostTracker() {
        return this.costTracker;
    }
    getPerformanceTracker() {
        return this.performanceTracker;
    }
    getLearningManager() {
        return this.learningManager;
    }
}
//# sourceMappingURL=router.js.map