import type { PerformanceTracker } from './PerformanceTracker.js';
import type { LearnedPattern, AgentFeedback, ContextualPattern, PatternExplanation, OptimizationCandidate, OptimizationObjectives } from './types.js';
export interface LearningConfig {
    minObservations: number;
    minConfidence: number;
    successRateThreshold: number;
    failureRateThreshold: number;
    maxPatternsPerAgent: number;
}
export declare class LearningManager {
    private patterns;
    private feedback;
    private config;
    private performanceTracker;
    private contextMatcher;
    private multiObjectiveOptimizer;
    private patternExplainer;
    private contextualPatterns;
    private readonly QUALITY_HIGH;
    private readonly QUALITY_LOW;
    private readonly COST_REDUCTION_TARGET;
    private readonly CONFIDENCE_INCREMENT;
    private readonly STATISTICAL_BASELINE_SAMPLES;
    private readonly COMPLEXITY_LOW_THRESHOLD_MS;
    private readonly COMPLEXITY_MEDIUM_THRESHOLD_MS;
    private readonly COST_VARIATION_PERCENT;
    private readonly COST_VARIATION_MIN_ABSOLUTE;
    private readonly P95_MIN_SAMPLE_SIZE;
    private static savedPatterns;
    private static savedFeedback;
    private isInitialized;
    constructor(performanceTracker?: PerformanceTracker, config?: Partial<LearningConfig>);
    analyzePatterns(agentId: string): LearnedPattern[];
    private createPattern;
    private extractSuccessPatterns;
    private extractFailurePatterns;
    private extractOptimizationPatterns;
    addFeedback(feedback: Omit<AgentFeedback, 'id' | 'timestamp'>): AgentFeedback;
    getPatterns(agentId: string, filter?: {
        type?: LearnedPattern['type'];
        taskType?: string;
        minConfidence?: number;
    }): LearnedPattern[];
    getRecommendations(agentId: string, taskType: string, taskComplexity?: 'low' | 'medium' | 'high'): LearnedPattern[];
    updatePattern(patternId: string, success: boolean): void;
    private storePatterns;
    private groupByTaskType;
    private calculateMedian;
    private getMedianCost;
    private getMedianDuration;
    private getP95Duration;
    private inferComplexity;
    private calculateConfidence;
    clearPatterns(agentId: string): void;
    getAgentsWithPatterns(): string[];
    identifyContextualPatterns(agentId: string): Promise<ContextualPattern[]>;
    findOptimalConfiguration(agentId: string, weights: OptimizationObjectives): OptimizationCandidate | undefined;
    explainPattern(patternId: string): PatternExplanation | undefined;
    getLearnedPatterns(agentId: string): Promise<ContextualPattern[]>;
    addBootstrapPattern(pattern: LearnedPattern): void;
    initialize(): Promise<void>;
    close(): Promise<void>;
    recordInteraction(interaction: {
        agentId: string;
        taskType: string;
        success: boolean;
        feedback: string;
        context: Record<string, any>;
    }): Promise<void>;
    extractPatterns(): Promise<Array<{
        pattern: string;
        confidence: number;
    }>>;
    static clearSavedData(): void;
    isReady(): Promise<boolean>;
}
//# sourceMappingURL=LearningManager.d.ts.map