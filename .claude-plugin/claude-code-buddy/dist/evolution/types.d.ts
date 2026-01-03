export interface PerformanceMetrics {
    executionId: string;
    agentId: string;
    taskType: string;
    success: boolean;
    durationMs: number;
    cost: number;
    qualityScore: number;
    userSatisfaction?: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface LearnedPattern {
    id: string;
    type: 'success' | 'failure' | 'optimization' | 'anti-pattern';
    agentId: string;
    taskType: string;
    description: string;
    conditions: {
        context?: Record<string, any>;
        requiredCapabilities?: string[];
        taskComplexity?: 'low' | 'medium' | 'high';
    };
    action: {
        type: 'adjust_prompt' | 'change_model' | 'add_step' | 'remove_step' | 'modify_timeout';
        parameters: Record<string, any>;
    };
    confidence: number;
    observationCount: number;
    successCount: number;
    successRate: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface AgentFeedback {
    id: string;
    executionId: string;
    agentId: string;
    type: 'positive' | 'negative' | 'suggestion';
    rating: number;
    feedback: string;
    issues?: string[];
    suggestions?: string[];
    timestamp: Date;
}
export interface AdaptationConfig {
    agentId: string;
    enabledAdaptations: {
        promptOptimization?: boolean;
        modelSelection?: boolean;
        timeoutAdjustment?: boolean;
        retryStrategy?: boolean;
    };
    learningRate: number;
    minConfidence: number;
    minObservations: number;
    maxPatterns: number;
}
export interface EvolutionStats {
    agentId: string;
    totalExecutions: number;
    successRateTrend: {
        historical: number;
        recent: number;
        improvement: number;
    };
    costEfficiencyTrend: {
        historical: number;
        recent: number;
        improvement: number;
    };
    qualityScoreTrend: {
        historical: number;
        recent: number;
        improvement: number;
    };
    learnedPatterns: number;
    appliedAdaptations: number;
    lastLearningDate: Date;
}
export interface PatternContext {
    agent_type?: string;
    task_type?: string;
    project_type?: string;
    domain?: string;
    complexity?: 'low' | 'medium' | 'high';
    config_keys?: string[];
    actions?: string[];
    metadata?: Record<string, any>;
}
export interface ContextualPattern {
    id: string;
    type: 'success' | 'failure' | 'optimization' | 'anti-pattern';
    description: string;
    confidence: number;
    observations: number;
    success_rate: number;
    avg_execution_time: number;
    last_seen: string;
    context: PatternContext;
}
export interface OptimizationObjectives {
    accuracy?: number;
    speed?: number;
    cost?: number;
    satisfaction?: number;
    [key: string]: number | undefined;
}
export interface OptimizationCandidate {
    id: string;
    objectives: OptimizationObjectives;
    metadata?: Record<string, any>;
}
export interface PatternExplanation {
    summary: string;
    reasoning: string[];
    recommendation: string;
    confidence_explanation: string;
    context_description: string;
}
export interface PatternTransferability {
    sourceAgentId: string;
    targetAgentId: string;
    patternId: string;
    applicabilityScore: number;
    contextSimilarity: number;
    confidence: number;
    reasoning: string[];
}
export interface TransferablePattern {
    pattern: ContextualPattern;
    sourceAgentId: string;
    transferredAt: Date;
    originalConfidence: number;
    adaptedForContext?: PatternContext;
}
export interface ABTestExperiment {
    id: string;
    name: string;
    description: string;
    variants: ABTestVariant[];
    trafficSplit: number[];
    successMetric: 'quality_score' | 'cost' | 'duration' | 'user_satisfaction';
    secondaryMetrics?: string[];
    durationDays: number;
    minSampleSize: number;
    significanceLevel: number;
    status: 'draft' | 'running' | 'completed' | 'stopped';
    startedAt?: Date;
    completedAt?: Date;
    results?: ABTestResults;
}
export interface ABTestVariant {
    name: string;
    config: Record<string, any>;
    description?: string;
}
export interface ABTestAssignment {
    id: string;
    experimentId: string;
    agentId: string;
    variantName: string;
    assignedAt: Date;
}
export interface ABTestResults {
    experimentId: string;
    winner: string | null;
    confidence: number;
    variantStats: Record<string, VariantStatistics>;
    statisticalTests: {
        testType: 't-test' | 'chi-square' | 'mann-whitney';
        pValue: number;
        effectSize: number;
        confidenceInterval: [number, number];
    };
    recommendation: string;
}
export interface VariantStatistics {
    variantName: string;
    sampleSize: number;
    successRate: number;
    mean: number;
    stdDev: number;
    confidenceInterval: [number, number];
}
export interface FederatedLearningConfig {
    minAgents: number;
    aggregationMethod: 'federated_averaging' | 'weighted_average' | 'median';
    privacyBudget: number;
    maxRounds: number;
}
export interface LocalModelUpdate {
    id: string;
    agentId: string;
    round: number;
    patternStats: {
        patternType: 'success' | 'failure' | 'optimization' | 'anti-pattern';
        count: number;
        avgConfidence: number;
        avgSuccessRate: number;
        contextDistribution: Record<string, number>;
    }[];
    sampleSize: number;
    timestamp: Date;
}
export interface GlobalModel {
    version: string;
    round: number;
    patterns: ContextualPattern[];
    participatingAgents: number;
    totalSamples: number;
    createdAt: Date;
}
//# sourceMappingURL=types.d.ts.map