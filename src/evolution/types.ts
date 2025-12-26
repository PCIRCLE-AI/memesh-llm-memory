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
   * Success rate when applied
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
