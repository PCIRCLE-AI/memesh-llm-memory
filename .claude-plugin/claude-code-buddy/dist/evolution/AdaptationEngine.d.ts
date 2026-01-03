import type { LearningManager } from './LearningManager.js';
import type { PerformanceTracker } from './PerformanceTracker.js';
import type { LearnedPattern, AdaptationConfig, PerformanceMetrics } from './types.js';
export interface AdaptationResult {
    applied: boolean;
    patternId?: string;
    adaptationType?: LearnedPattern['action']['type'];
    parameters?: Record<string, any>;
    reason: string;
}
export interface AdaptedExecution {
    originalConfig: Record<string, any>;
    adaptedConfig: Record<string, any>;
    appliedPatterns: string[];
}
export declare class AdaptationEngine {
    private learningManager;
    private performanceTracker;
    private adaptationConfigs;
    private appliedAdaptations;
    private performanceHistory;
    private isInitialized;
    constructor(learningManager: LearningManager, performanceTracker: PerformanceTracker);
    configureAgent(agentId: string, config: AdaptationConfig): void;
    getConfig(agentId: string): AdaptationConfig | undefined;
    adaptExecution(agentId: string, taskType: string, baseConfig: Record<string, any>): Promise<AdaptedExecution>;
    private applyPattern;
    private adjustPrompt;
    private changeModel;
    private modifyTimeout;
    private filterApplicablePatterns;
    private inferComplexity;
    private recordAdaptation;
    getAdaptationStats(agentId: string): {
        totalAdaptations: number;
        byType: Record<string, number>;
        topPatterns: Array<{
            patternId: string;
            count: number;
        }>;
    };
    provideFeedback(patternId: string, metrics: PerformanceMetrics): Promise<void>;
    updateAdaptationConfig(agentId: string, updates: Partial<AdaptationConfig>): void;
    resetAdaptations(agentId: string): void;
    getAdaptedAgents(): string[];
    initialize(): Promise<void>;
    close(): Promise<void>;
    recordPerformance(metrics: {
        promptVersion: number;
        successRate: number;
        feedback: string;
    }): Promise<void>;
    optimizePrompt(currentPrompt: string): Promise<string>;
    adaptPromptFromPattern(prompt: string, pattern: {
        pattern: string;
        confidence: number;
    }): Promise<string>;
    isReady(): Promise<boolean>;
}
//# sourceMappingURL=AdaptationEngine.d.ts.map