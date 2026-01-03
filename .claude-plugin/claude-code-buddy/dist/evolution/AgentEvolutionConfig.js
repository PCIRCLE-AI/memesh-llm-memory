import { NotFoundError } from '../errors/index.js';
const DEFAULT_WEIGHTS = {
    development: {
        successRate: 0.4,
        userFeedback: 0.35,
        performanceMetrics: 0.25,
    },
    research: {
        successRate: 0.3,
        userFeedback: 0.4,
        performanceMetrics: 0.3,
    },
    knowledge: {
        successRate: 0.35,
        userFeedback: 0.4,
        performanceMetrics: 0.25,
    },
    operations: {
        successRate: 0.45,
        userFeedback: 0.3,
        performanceMetrics: 0.25,
    },
    creative: {
        successRate: 0.25,
        userFeedback: 0.5,
        performanceMetrics: 0.25,
    },
    utility: {
        successRate: 0.35,
        userFeedback: 0.35,
        performanceMetrics: 0.3,
    },
    general: {
        successRate: 0.33,
        userFeedback: 0.34,
        performanceMetrics: 0.33,
    },
};
const DEFAULT_CONFIDENCE = {
    development: 0.75,
    research: 0.7,
    knowledge: 0.7,
    operations: 0.8,
    creative: 0.65,
    utility: 0.7,
    general: 0.5,
};
const DEFAULT_MIN_OBSERVATIONS = {
    development: 15,
    research: 12,
    knowledge: 10,
    operations: 20,
    creative: 8,
    utility: 10,
    general: 5,
};
const AGENT_CONFIGS = new Map([
    [
        'code-reviewer',
        {
            agentId: 'code-reviewer',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'test-writer',
        {
            agentId: 'test-writer',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'debugger',
        {
            agentId: 'debugger',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'refactorer',
        {
            agentId: 'refactorer',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'api-designer',
        {
            agentId: 'api-designer',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'db-optimizer',
        {
            agentId: 'db-optimizer',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'frontend-specialist',
        {
            agentId: 'frontend-specialist',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'backend-specialist',
        {
            agentId: 'backend-specialist',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'development-butler',
        {
            agentId: 'development-butler',
            category: 'development',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 15,
            learningWeights: DEFAULT_WEIGHTS.development,
        },
    ],
    [
        'rag-agent',
        {
            agentId: 'rag-agent',
            category: 'research',
            evolutionEnabled: true,
            confidenceThreshold: 0.7,
            minObservationsForAdaptation: 12,
            learningWeights: DEFAULT_WEIGHTS.research,
        },
    ],
    [
        'research-agent',
        {
            agentId: 'research-agent',
            category: 'research',
            evolutionEnabled: true,
            confidenceThreshold: 0.7,
            minObservationsForAdaptation: 12,
            learningWeights: DEFAULT_WEIGHTS.research,
        },
    ],
    [
        'architecture-agent',
        {
            agentId: 'architecture-agent',
            category: 'research',
            evolutionEnabled: true,
            confidenceThreshold: 0.75,
            minObservationsForAdaptation: 18,
            learningWeights: DEFAULT_WEIGHTS.research,
        },
    ],
    [
        'data-analyst',
        {
            agentId: 'data-analyst',
            category: 'research',
            evolutionEnabled: true,
            confidenceThreshold: 0.7,
            minObservationsForAdaptation: 12,
            learningWeights: DEFAULT_WEIGHTS.research,
        },
    ],
    [
        'performance-profiler',
        {
            agentId: 'performance-profiler',
            category: 'research',
            evolutionEnabled: true,
            confidenceThreshold: 0.7,
            minObservationsForAdaptation: 12,
            learningWeights: DEFAULT_WEIGHTS.research,
        },
    ],
    [
        'knowledge-agent',
        {
            agentId: 'knowledge-agent',
            category: 'knowledge',
            evolutionEnabled: true,
            confidenceThreshold: 0.7,
            minObservationsForAdaptation: 10,
            learningWeights: DEFAULT_WEIGHTS.knowledge,
        },
    ],
    [
        'devops-engineer',
        {
            agentId: 'devops-engineer',
            category: 'operations',
            evolutionEnabled: true,
            confidenceThreshold: 0.8,
            minObservationsForAdaptation: 20,
            learningWeights: DEFAULT_WEIGHTS.operations,
        },
    ],
    [
        'security-auditor',
        {
            agentId: 'security-auditor',
            category: 'operations',
            evolutionEnabled: true,
            confidenceThreshold: 0.85,
            minObservationsForAdaptation: 25,
            learningWeights: DEFAULT_WEIGHTS.operations,
        },
    ],
    [
        'technical-writer',
        {
            agentId: 'technical-writer',
            category: 'creative',
            evolutionEnabled: true,
            confidenceThreshold: 0.65,
            minObservationsForAdaptation: 8,
            learningWeights: DEFAULT_WEIGHTS.creative,
        },
    ],
    [
        'ui-designer',
        {
            agentId: 'ui-designer',
            category: 'creative',
            evolutionEnabled: true,
            confidenceThreshold: 0.65,
            minObservationsForAdaptation: 8,
            learningWeights: DEFAULT_WEIGHTS.creative,
        },
    ],
    [
        'migration-assistant',
        {
            agentId: 'migration-assistant',
            category: 'utility',
            evolutionEnabled: true,
            confidenceThreshold: 0.7,
            minObservationsForAdaptation: 10,
            learningWeights: DEFAULT_WEIGHTS.utility,
        },
    ],
    [
        'api-integrator',
        {
            agentId: 'api-integrator',
            category: 'utility',
            evolutionEnabled: true,
            confidenceThreshold: 0.7,
            minObservationsForAdaptation: 10,
            learningWeights: DEFAULT_WEIGHTS.utility,
        },
    ],
    [
        'general-agent',
        {
            agentId: 'general-agent',
            category: 'general',
            evolutionEnabled: true,
            confidenceThreshold: 0.5,
            minObservationsForAdaptation: 5,
            learningWeights: DEFAULT_WEIGHTS.general,
        },
    ],
]);
export function getAllAgentConfigs() {
    return new Map(AGENT_CONFIGS);
}
export function getAgentEvolutionConfig(agentId) {
    const config = AGENT_CONFIGS.get(agentId);
    if (!config) {
        throw new NotFoundError(`No evolution config found for agent: ${agentId}`, 'agentEvolutionConfig', agentId, {
            availableAgents: Array.from(AGENT_CONFIGS.keys()),
        });
    }
    return config;
}
export function getAgentsByCategory(category) {
    const agents = [];
    for (const config of AGENT_CONFIGS.values()) {
        if (config.category === category) {
            agents.push(config);
        }
    }
    return agents;
}
export function toAdaptationConfig(config) {
    const enabledAdaptations = {
        promptOptimization: true,
        modelSelection: config.category !== 'operations',
        timeoutAdjustment: true,
        retryStrategy: ['operations', 'knowledge'].includes(config.category),
    };
    const learningRate = (config.learningWeights.successRate +
        config.learningWeights.userFeedback +
        config.learningWeights.performanceMetrics) /
        3;
    const maxPatternsByCategory = {
        development: 100,
        research: 150,
        knowledge: 200,
        operations: 50,
        creative: 120,
        utility: 100,
        general: 80,
    };
    return {
        agentId: config.agentId,
        enabledAdaptations,
        learningRate,
        minConfidence: config.confidenceThreshold,
        minObservations: config.minObservationsForAdaptation,
        maxPatterns: maxPatternsByCategory[config.category],
    };
}
//# sourceMappingURL=AgentEvolutionConfig.js.map