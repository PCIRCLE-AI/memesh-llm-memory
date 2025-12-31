/**
 * Agent Evolution Configuration
 *
 * Defines evolution settings for each agent type:
 * - Category classification
 * - Confidence thresholds
 * - Minimum observations required
 * - Learning weights (success rate, user feedback, performance)
 * - Evolution enable/disable toggle
 */

import type { AgentType } from '../orchestrator/types.js';
import { NotFoundError } from '../errors/index.js';

/**
 * Agent category for grouping similar agents
 */
export type AgentCategory =
  | 'development'
  | 'research'
  | 'knowledge'
  | 'operations'
  | 'creative'
  | 'utility'
  | 'general';

/**
 * Learning weights for different feedback sources
 */
export interface LearningWeights {
  successRate: number; // Weight for task success/failure rate
  userFeedback: number; // Weight for explicit user feedback
  performanceMetrics: number; // Weight for performance metrics (speed, quality)
}

/**
 * Evolution configuration for a single agent
 */
export interface AgentEvolutionConfig {
  agentId: AgentType;
  category: AgentCategory;
  evolutionEnabled: boolean;

  // Thresholds
  confidenceThreshold: number; // Min confidence to suggest this agent (0-1)
  minObservationsForAdaptation: number; // Min observations before adapting

  // Learning weights
  learningWeights: LearningWeights;
}

/**
 * Default learning weights by category
 */
const DEFAULT_WEIGHTS: Record<AgentCategory, LearningWeights> = {
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

/**
 * Default confidence thresholds by category
 */
const DEFAULT_CONFIDENCE: Record<AgentCategory, number> = {
  development: 0.75, // Higher threshold for critical development tasks
  research: 0.7,
  knowledge: 0.7,
  operations: 0.8, // Highest threshold for ops (security, deployment)
  creative: 0.65, // More flexible for creative tasks
  utility: 0.7,
  general: 0.5, // Lowest threshold for fallback agent
};

/**
 * Default minimum observations by category
 */
const DEFAULT_MIN_OBSERVATIONS: Record<AgentCategory, number> = {
  development: 15, // Need more data for critical development agents
  research: 12,
  knowledge: 10,
  operations: 20, // Most conservative for ops agents
  creative: 8, // Can adapt faster for creative tasks
  utility: 10,
  general: 5, // General agent can adapt quickly
};

/**
 * Agent evolution configurations
 */
const AGENT_CONFIGS: Map<AgentType, AgentEvolutionConfig> = new Map([
  // Development Agents (9)
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

  // Research Agents (5)
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
      confidenceThreshold: 0.75, // Higher for architecture decisions
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

  // Knowledge Agents (1)
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

  // Operations Agents (2)
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
      confidenceThreshold: 0.85, // Highest threshold for security
      minObservationsForAdaptation: 25, // Most conservative
      learningWeights: DEFAULT_WEIGHTS.operations,
    },
  ],

  // Creative Agents (2)
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

  // Utility Agents (2)
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

  // General Agent (1)
  [
    'general-agent',
    {
      agentId: 'general-agent',
      category: 'general',
      evolutionEnabled: true,
      confidenceThreshold: 0.5, // Lowest threshold as fallback
      minObservationsForAdaptation: 5, // Can adapt quickly
      learningWeights: DEFAULT_WEIGHTS.general,
    },
  ],
]);

/**
 * Get evolution config for all agents
 */
export function getAllAgentConfigs(): Map<AgentType, AgentEvolutionConfig> {
  return new Map(AGENT_CONFIGS);
}

/**
 * Get evolution config for specific agent
 *
 * @throws Error if agent not found
 */
export function getAgentEvolutionConfig(agentId: AgentType): AgentEvolutionConfig {
  const config = AGENT_CONFIGS.get(agentId);

  if (!config) {
    throw new NotFoundError(
      `No evolution config found for agent: ${agentId}`,
      'agentEvolutionConfig',
      agentId,
      {
        availableAgents: Array.from(AGENT_CONFIGS.keys()),
      }
    );
  }

  return config;
}

/**
 * Get all agents in a specific category
 */
export function getAgentsByCategory(category: AgentCategory): AgentEvolutionConfig[] {
  const agents: AgentEvolutionConfig[] = [];

  for (const config of AGENT_CONFIGS.values()) {
    if (config.category === category) {
      agents.push(config);
    }
  }

  return agents;
}

/**
 * Convert AgentEvolutionConfig to AdaptationConfig
 *
 * Maps our agent evolution config to the format expected by AdaptationEngine
 */
export function toAdaptationConfig(config: AgentEvolutionConfig): {
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
} {
  // Determine enabled adaptations based on category
  const enabledAdaptations = {
    promptOptimization: true, // All agents benefit from prompt optimization
    modelSelection: config.category !== 'operations', // Ops need consistency
    timeoutAdjustment: true, // All agents can adjust timeouts
    retryStrategy: ['operations', 'knowledge'].includes(config.category), // Only ops and knowledge retry
  };

  // Calculate learning rate from weights (average of all weights)
  const learningRate =
    (config.learningWeights.successRate +
      config.learningWeights.userFeedback +
      config.learningWeights.performanceMetrics) /
    3;

  // Max patterns based on category
  const maxPatternsByCategory: Record<AgentCategory, number> = {
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
