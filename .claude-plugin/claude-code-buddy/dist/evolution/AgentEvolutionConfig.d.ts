import type { AgentType } from '../orchestrator/types.js';
export type AgentCategory = 'development' | 'research' | 'knowledge' | 'operations' | 'creative' | 'utility' | 'general';
export interface LearningWeights {
    successRate: number;
    userFeedback: number;
    performanceMetrics: number;
}
export interface AgentEvolutionConfig {
    agentId: AgentType;
    category: AgentCategory;
    evolutionEnabled: boolean;
    confidenceThreshold: number;
    minObservationsForAdaptation: number;
    learningWeights: LearningWeights;
}
export declare function getAllAgentConfigs(): Map<AgentType, AgentEvolutionConfig>;
export declare function getAgentEvolutionConfig(agentId: AgentType): AgentEvolutionConfig;
export declare function getAgentsByCategory(category: AgentCategory): AgentEvolutionConfig[];
export declare function toAdaptationConfig(config: AgentEvolutionConfig): {
    agentId: string;
    enabledAdaptations: {
        promptOptimization: boolean;
        modelSelection: boolean;
        timeoutAdjustment: boolean;
        retryStrategy: boolean;
    };
    learningRate: number;
    minConfidence: number;
    minObservations: number;
    maxPatterns: number;
};
//# sourceMappingURL=AgentEvolutionConfig.d.ts.map