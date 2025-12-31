/**
 * Self-Evolving Agent System Types
 *
 * Enables agents to learn from experience and improve over time
 */

/**
 * Performance metrics for an agent execution
 */
export interface PerformanceMetrics {
  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Agent ID
   */
  agentId: string;

  /**
   * Task type
   */
  taskType: string;

  /**
   * Success status
   */
  success: boolean;

  /**
   * Execution duration in milliseconds
   */
  durationMs: number;

  /**
   * Cost in USD
   */
  cost: number;

  /**
   * Quality score (0-1)
   */
  qualityScore: number;

  /**
   * User satisfaction (0-1, optional)
   */
  userSatisfaction?: number;

  /**
   * Timestamp
   */
  timestamp: Date;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Learned pattern from agent executions
 */
export interface LearnedPattern {
  /**
   * Pattern ID
   */
  id: string;

  /**
   * Pattern type
   */
  type: 'success' | 'failure' | 'optimization' | 'anti-pattern';

  /**
   * Agent ID or type
   */
  agentId: string;

  /**
   * Task type
   */
  taskType: string;

  /**
   * Pattern description
   */
  description: string;

  /**
   * Conditions when this pattern applies
   */
  conditions: {
    context?: Record<string, any>;
    requiredCapabilities?: string[];
    taskComplexity?: 'low' | 'medium' | 'high';
  };

  /**
   * Action or strategy
   */
  action: {
    type: 'adjust_prompt' | 'change_model' | 'add_step' | 'remove_step' | 'modify_timeout';
    parameters: Record<string, any>;
  };

  /**
   * Confidence level (0-1)
   */
  confidence: number;

  /**
   * Number of times this pattern was observed
   */
  observationCount: number;

  /**
   * Number of successful observations
   * @internal - derived field, updated with observationCount
   */
  successCount: number;

  /**
   * Success rate when applied (derived: successCount / observationCount)
   */
  successRate: number;

  /**
   * Created timestamp
   */
  createdAt: Date;

  /**
   * Last updated timestamp
   */
  updatedAt: Date;
}

/**
 * Feedback on agent performance
 */
export interface AgentFeedback {
  /**
   * Feedback ID
   */
  id: string;

  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Agent ID
   */
  agentId: string;

  /**
   * Feedback type
   */
  type: 'positive' | 'negative' | 'suggestion';

  /**
   * Rating (0-5)
   */
  rating: number;

  /**
   * Feedback text
   */
  feedback: string;

  /**
   * Specific issues
   */
  issues?: string[];

  /**
   * Suggested improvements
   */
  suggestions?: string[];

  /**
   * Timestamp
   */
  timestamp: Date;
}

/**
 * Agent adaptation configuration
 */
export interface AdaptationConfig {
  /**
   * Agent ID
   */
  agentId: string;

  /**
   * Enabled adaptations
   */
  enabledAdaptations: {
    promptOptimization?: boolean;
    modelSelection?: boolean;
    timeoutAdjustment?: boolean;
    retryStrategy?: boolean;
  };

  /**
   * Learning rate (0-1)
   */
  learningRate: number;

  /**
   * Minimum confidence to apply pattern
   */
  minConfidence: number;

  /**
   * Minimum observations before creating pattern
   */
  minObservations: number;

  /**
   * Maximum patterns to store per agent
   */
  maxPatterns: number;
}

/**
 * Evolution statistics
 */
export interface EvolutionStats {
  /**
   * Agent ID
   */
  agentId: string;

  /**
   * Total executions
   */
  totalExecutions: number;

  /**
   * Success rate trend (recent vs historical)
   */
  successRateTrend: {
    historical: number;
    recent: number;
    improvement: number;
  };

  /**
   * Cost efficiency trend
   */
  costEfficiencyTrend: {
    historical: number;
    recent: number;
    improvement: number;
  };

  /**
   * Quality score trend
   */
  qualityScoreTrend: {
    historical: number;
    recent: number;
    improvement: number;
  };

  /**
   * Number of learned patterns
   */
  learnedPatterns: number;

  /**
   * Number of applied adaptations
   */
  appliedAdaptations: number;

  /**
   * Last learning date
   */
  lastLearningDate: Date;
}

/**
 * Context information for pattern matching (Phase 2)
 */
export interface PatternContext {
  /**
   * Agent type (e.g., 'data-analyst', 'frontend-developer')
   */
  agent_type?: string;

  /**
   * Task type (e.g., 'sql_query', 'component_optimization')
   */
  task_type?: string;

  /**
   * Project type (e.g., 'web-app', 'api-service', 'library')
   */
  project_type?: string;

  /**
   * Domain (e.g., 'e-commerce', 'healthcare', 'finance')
   */
  domain?: string;

  /**
   * Task complexity level
   */
  complexity?: 'low' | 'medium' | 'high';

  /**
   * Configuration keys used in this context
   */
  config_keys?: string[];

  /**
   * Actions or strategies (e.g., 'security-first', 'schema-before-API')
   */
  actions?: string[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Contextual pattern with rich context metadata (Phase 2)
 */
export interface ContextualPattern {
  /**
   * Pattern ID
   */
  id: string;

  /**
   * Pattern type
   */
  type: 'success' | 'failure' | 'optimization' | 'anti-pattern';

  /**
   * Pattern description
   */
  description: string;

  /**
   * Confidence level (0-1)
   */
  confidence: number;

  /**
   * Number of observations
   */
  observations: number;

  /**
   * Success rate
   */
  success_rate: number;

  /**
   * Average execution time (ms)
   */
  avg_execution_time: number;

  /**
   * Last seen timestamp
   */
  last_seen: string;

  /**
   * Rich context for pattern matching
   */
  context: PatternContext;
}

/**
 * Optimization objective values (0-1, higher is better) (Phase 2)
 */
export interface OptimizationObjectives {
  /**
   * Accuracy/quality score
   */
  accuracy?: number;

  /**
   * Speed (inverse of duration)
   */
  speed?: number;

  /**
   * Cost efficiency (inverse of cost)
   */
  cost?: number;

  /**
   * User satisfaction
   */
  satisfaction?: number;

  /**
   * Custom objectives (dynamic)
   */
  [key: string]: number | undefined;
}

/**
 * Optimization candidate for multi-objective optimization (Phase 2)
 */
export interface OptimizationCandidate {
  /**
   * Candidate ID
   */
  id: string;

  /**
   * Objective values
   */
  objectives: OptimizationObjectives;

  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Human-readable explanation for a learned pattern (Phase 2)
 */
export interface PatternExplanation {
  /**
   * One-line summary of the pattern
   */
  summary: string;

  /**
   * Detailed reasoning (why this pattern was learned)
   */
  reasoning: string[];

  /**
   * Actionable recommendation
   */
  recommendation: string;

  /**
   * Confidence explanation
   */
  confidence_explanation: string;

  /**
   * Context where pattern applies
   */
  context_description: string;
}

/**
 * Phase 3: Cross-Agent Knowledge Transfer Types
 */

/**
 * Pattern transferability assessment between two agents
 */
export interface PatternTransferability {
  /**
   * Source agent ID (where pattern was learned)
   */
  sourceAgentId: string;

  /**
   * Target agent ID (where pattern will be applied)
   */
  targetAgentId: string;

  /**
   * Pattern ID being assessed
   */
  patternId: string;

  /**
   * How applicable this pattern is to target agent (0-1)
   */
  applicabilityScore: number;

  /**
   * Context similarity score (0-1)
   */
  contextSimilarity: number;

  /**
   * Confidence in transfer success (0-1)
   */
  confidence: number;

  /**
   * Human-readable reasoning for transferability
   */
  reasoning: string[];
}

/**
 * A pattern that has been transferred from another agent
 */
export interface TransferablePattern {
  /**
   * The actual pattern
   */
  pattern: ContextualPattern;

  /**
   * Source agent ID
   */
  sourceAgentId: string;

  /**
   * When this pattern was transferred
   */
  transferredAt: Date;

  /**
   * Original confidence before transfer
   */
  originalConfidence: number;

  /**
   * Context adapted for target agent
   */
  adaptedForContext?: PatternContext;
}

/**
 * Phase 3: A/B Testing Framework Types
 */

/**
 * A/B test experiment configuration
 */
export interface ABTestExperiment {
  /**
   * Experiment ID
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of what is being tested
   */
  description: string;

  /**
   * Test variants (control + treatments)
   */
  variants: ABTestVariant[];

  /**
   * Traffic split (must sum to 1.0)
   */
  trafficSplit: number[];

  /**
   * Primary success metric
   */
  successMetric: 'quality_score' | 'cost' | 'duration' | 'user_satisfaction';

  /**
   * Secondary metrics to track
   */
  secondaryMetrics?: string[];

  /**
   * Experiment duration in days
   */
  durationDays: number;

  /**
   * Minimum sample size per variant
   */
  minSampleSize: number;

  /**
   * Statistical significance threshold (p-value)
   */
  significanceLevel: number;

  /**
   * Status
   */
  status: 'draft' | 'running' | 'completed' | 'stopped';

  /**
   * Start and end timestamps
   */
  startedAt?: Date;
  completedAt?: Date;

  /**
   * Results (populated when analysis is done)
   */
  results?: ABTestResults;
}

/**
 * A single variant in an A/B test
 */
export interface ABTestVariant {
  /**
   * Variant name (e.g., 'control', 'treatment_a')
   */
  name: string;

  /**
   * Configuration for this variant
   */
  config: Record<string, any>;

  /**
   * Description
   */
  description?: string;
}

/**
 * A/B test assignment for an agent
 */
export interface ABTestAssignment {
  /**
   * Assignment ID
   */
  id: string;

  /**
   * Experiment ID
   */
  experimentId: string;

  /**
   * Agent ID
   */
  agentId: string;

  /**
   * Assigned variant name
   */
  variantName: string;

  /**
   * Assignment timestamp
   */
  assignedAt: Date;
}

/**
 * Results from an A/B test experiment
 */
export interface ABTestResults {
  /**
   * Experiment ID
   */
  experimentId: string;

  /**
   * Winning variant name (or null if inconclusive)
   */
  winner: string | null;

  /**
   * Statistical confidence in winner (0-1)
   */
  confidence: number;

  /**
   * Per-variant statistics
   */
  variantStats: Record<string, VariantStatistics>;

  /**
   * Statistical test results
   */
  statisticalTests: {
    testType: 't-test' | 'chi-square' | 'mann-whitney';
    pValue: number;
    effectSize: number;
    confidenceInterval: [number, number];
  };

  /**
   * Recommendation
   */
  recommendation: string;
}

/**
 * Statistics for a single variant
 */
export interface VariantStatistics {
  /**
   * Variant name
   */
  variantName: string;

  /**
   * Sample size
   */
  sampleSize: number;

  /**
   * Success rate
   */
  successRate: number;

  /**
   * Mean value of success metric
   */
  mean: number;

  /**
   * Standard deviation
   */
  stdDev: number;

  /**
   * 95% confidence interval
   */
  confidenceInterval: [number, number];
}

/**
 * Phase 3: Federated Learning Types
 */

/**
 * Federated learning configuration
 */
export interface FederatedLearningConfig {
  /**
   * Minimum number of agents required for aggregation
   */
  minAgents: number;

  /**
   * Aggregation method
   */
  aggregationMethod: 'federated_averaging' | 'weighted_average' | 'median';

  /**
   * Privacy budget (differential privacy epsilon)
   */
  privacyBudget: number;

  /**
   * Maximum rounds of aggregation
   */
  maxRounds: number;
}

/**
 * Local model update from a single agent (privacy-preserving)
 */
export interface LocalModelUpdate {
  /**
   * Update ID
   */
  id: string;

  /**
   * Agent ID (can be pseudonymous)
   */
  agentId: string;

  /**
   * Round number
   */
  round: number;

  /**
   * Aggregated pattern statistics (no raw data)
   */
  patternStats: {
    patternType: 'success' | 'failure' | 'optimization' | 'anti-pattern';
    count: number;
    avgConfidence: number;
    avgSuccessRate: number;
    contextDistribution: Record<string, number>;
  }[];

  /**
   * Number of local samples used
   */
  sampleSize: number;

  /**
   * Timestamp
   */
  timestamp: Date;
}

/**
 * Aggregated global model from federated learning
 */
export interface GlobalModel {
  /**
   * Model version
   */
  version: string;

  /**
   * Round number
   */
  round: number;

  /**
   * Aggregated patterns
   */
  patterns: ContextualPattern[];

  /**
   * Number of participating agents
   */
  participatingAgents: number;

  /**
   * Total samples across all agents
   */
  totalSamples: number;

  /**
   * Created timestamp
   */
  createdAt: Date;
}
