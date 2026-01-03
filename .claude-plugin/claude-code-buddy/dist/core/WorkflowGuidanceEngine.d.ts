import type { LearningManager } from '../evolution/LearningManager.js';
export type WorkflowPhase = 'idle' | 'code-written' | 'test-complete' | 'commit-ready' | 'committed';
export interface WorkflowContext {
    phase: WorkflowPhase;
    filesChanged?: string[];
    testsPassing?: boolean;
    reviewed?: boolean;
    committed?: boolean;
    lastAction?: string;
}
export type RecommendationAction = 'run-tests' | 'fix-tests' | 'code-review' | 'commit-changes' | 'run-specific-agent' | 'update-docs' | 'check-dependencies';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';
export interface WorkflowRecommendation {
    action: RecommendationAction;
    priority: RecommendationPriority;
    description: string;
    reasoning: string;
    estimatedTime?: string;
    suggestedAgent?: string;
}
export interface WorkflowGuidance {
    recommendations: WorkflowRecommendation[];
    confidence: number;
    reasoning: string[];
    learnedFromPatterns: boolean;
}
export declare class WorkflowGuidanceEngine {
    private learningManager;
    private static readonly MIN_PATTERN_CONFIDENCE;
    private static readonly MIN_OBSERVATION_COUNT;
    constructor(learningManager: LearningManager);
    analyzeWorkflow(context: WorkflowContext): WorkflowGuidance;
    private calculateConfidence;
}
//# sourceMappingURL=WorkflowGuidanceEngine.d.ts.map