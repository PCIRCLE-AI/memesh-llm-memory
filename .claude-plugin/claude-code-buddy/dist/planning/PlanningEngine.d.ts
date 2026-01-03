import type { AgentRegistry } from '../core/AgentRegistry.js';
import type { LearningManager } from '../evolution/LearningManager.js';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export interface PlanTask {
    id: string;
    description: string;
    steps: string[];
    suggestedAgent?: string;
    estimatedDuration: string;
    priority: TaskPriority;
    dependencies: string[];
    files: {
        create?: string[];
        modify?: string[];
        test?: string[];
    };
}
export interface ImplementationPlan {
    title: string;
    goal: string;
    architecture: string;
    techStack: string[];
    tasks: PlanTask[];
    totalEstimatedTime: string;
}
export interface PlanRequest {
    featureDescription: string;
    requirements?: string[];
    constraints?: string[];
    existingContext?: Record<string, unknown>;
}
export declare class PlanningEngine {
    private agentRegistry;
    private learningManager?;
    constructor(agentRegistry: AgentRegistry, learningManager?: LearningManager | undefined);
    generatePlan(request: PlanRequest): Promise<ImplementationPlan>;
    private generateTasks;
    private generateTDDSteps;
    private assignAgent;
    private identifyPhases;
    private generateGoal;
    private generateArchitectureOverview;
    private identifyTechStack;
    private estimateTotalTime;
    private getLearnedPatterns;
    private filterRelevantPatterns;
    private applyLearnedOrdering;
    private enhanceDescriptionWithLearning;
    private generateTDDStepsWithLearning;
    private calculatePriorityWithLearning;
}
//# sourceMappingURL=PlanningEngine.d.ts.map