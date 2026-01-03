import { TaskAnalyzer } from './TaskAnalyzer.js';
import { AgentRouter } from './AgentRouter.js';
import { CostTracker } from './CostTracker.js';
import { PerformanceTracker } from '../evolution/PerformanceTracker.js';
import { LearningManager } from '../evolution/LearningManager.js';
import { AdaptationEngine } from '../evolution/AdaptationEngine.js';
import { getAllAgentConfigs, toAdaptationConfig } from '../evolution/AgentEvolutionConfig.js';
import { logger } from '../utils/logger.js';
export class Router {
    analyzer;
    router;
    costTracker;
    performanceTracker;
    learningManager;
    adaptationEngine;
    constructor() {
        this.analyzer = new TaskAnalyzer();
        this.router = new AgentRouter();
        this.costTracker = new CostTracker();
        this.performanceTracker = new PerformanceTracker();
        this.learningManager = new LearningManager(this.performanceTracker);
        this.adaptationEngine = new AdaptationEngine(this.learningManager, this.performanceTracker);
        this.configureAgentEvolution();
    }
    configureAgentEvolution() {
        const allConfigs = getAllAgentConfigs();
        for (const [agentId, evolutionConfig] of allConfigs) {
            if (evolutionConfig.evolutionEnabled) {
                const adaptationConfig = toAdaptationConfig(evolutionConfig);
                this.adaptationEngine.configureAgent(agentId, adaptationConfig);
            }
        }
        logger.info(`Evolution system initialized for ${allConfigs.size} agents`);
    }
    async routeTask(task) {
        const startTime = Date.now();
        const analysis = await this.analyzer.analyze(task);
        const routing = await this.router.route(analysis);
        const adaptedExecution = await this.adaptationEngine.adaptExecution(routing.selectedAgent, task.description.substring(0, 50), {
            complexity: analysis.complexity,
            estimatedTokens: analysis.estimatedTokens,
        });
        if (adaptedExecution.appliedPatterns.length > 0) {
            logger.info('Applied evolution patterns:', {
                agentId: routing.selectedAgent,
                patterns: adaptedExecution.appliedPatterns,
            });
        }
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
    getAdaptationEngine() {
        return this.adaptationEngine;
    }
}
//# sourceMappingURL=router.js.map