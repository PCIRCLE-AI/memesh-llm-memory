/**
 * EvolutionStore - Abstract interface for persistent storage
 *
 * This interface defines the contract for storing and querying
 * evolution data (spans, patterns, adaptations, stats).
 *
 * Implementations:
 * - SQLiteStore (development)
 * - PostgresStore (production)
 */

import type {
  Task,
  Execution,
  Span,
  Pattern,
  Adaptation,
  EvolutionStats,
  Reward,
  SpanQuery,
  PatternQuery,
  TimeRange,
  SkillPerformance,
  SkillRecommendation,
} from './types';

export interface EvolutionStore {
  // ========================================================================
  // Lifecycle
  // ========================================================================

  /**
   * Initialize the store (create tables, indexes, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Close the store (cleanup connections)
   */
  close(): Promise<void>;

  // ========================================================================
  // Task Management
  // ========================================================================

  /**
   * Create a new task
   */
  createTask(input: Record<string, any>, metadata?: Record<string, any>): Promise<Task>;

  /**
   * Get task by ID
   */
  getTask(taskId: string): Promise<Task | null>;

  /**
   * Update task
   */
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;

  /**
   * List tasks (with pagination)
   */
  listTasks(filters?: {
    status?: Task['status'];
    limit?: number;
    offset?: number;
  }): Promise<Task[]>;

  // ========================================================================
  // Execution Management
  // ========================================================================

  /**
   * Create a new execution (attempt) for a task
   */
  createExecution(taskId: string, metadata?: Record<string, any>): Promise<Execution>;

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): Promise<Execution | null>;

  /**
   * Update execution
   */
  updateExecution(executionId: string, updates: Partial<Execution>): Promise<void>;

  /**
   * List executions for a task
   */
  listExecutions(taskId: string): Promise<Execution[]>;

  // ========================================================================
  // Span Tracking (Core of Evolution System)
  // ========================================================================

  /**
   * Record a single span
   */
  recordSpan(span: Span): Promise<void>;

  /**
   * Record multiple spans (batch operation for performance)
   */
  recordSpanBatch(spans: Span[]): Promise<void>;

  /**
   * Query spans with flexible filters
   */
  querySpans(query: SpanQuery): Promise<Span[]>;

  /**
   * Get a single span by ID
   */
  getSpan(spanId: string): Promise<Span | null>;

  /**
   * Get spans by trace ID (entire trace)
   */
  getSpansByTrace(traceId: string): Promise<Span[]>;

  /**
   * Get child spans of a parent span
   */
  getChildSpans(parentSpanId: string): Promise<Span[]>;

  // ========================================================================
  // Link Management (Operation ←→ Reward)
  // ========================================================================

  /**
   * Query spans linked to a given span
   */
  queryLinkedSpans(spanId: string): Promise<Span[]>;

  /**
   * Query spans by tags
   */
  queryByTags(tags: string[], mode?: 'any' | 'all'): Promise<Span[]>;

  // ========================================================================
  // Reward Management (Delayed Feedback)
  // ========================================================================

  /**
   * Record a reward for an operation span
   */
  recordReward(reward: Reward): Promise<void>;

  /**
   * Get rewards for a specific span
   */
  getRewardsForSpan(spanId: string): Promise<Reward[]>;

  /**
   * Query rewards by operation span ID
   */
  queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]>;

  /**
   * Get all rewards in time range
   */
  queryRewards(filters: {
    start_time?: Date;
    end_time?: Date;
    min_value?: number;
    max_value?: number;
  }): Promise<Reward[]>;

  // ========================================================================
  // Pattern Management
  // ========================================================================

  /**
   * Store a learned pattern
   */
  storePattern(pattern: Pattern): Promise<void>;

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): Promise<Pattern | null>;

  /**
   * Query patterns with filters
   */
  queryPatterns(query: PatternQuery): Promise<Pattern[]>;

  /**
   * Update pattern (e.g., increase occurrences, update confidence)
   */
  updatePattern(patternId: string, updates: Partial<Pattern>): Promise<void>;

  /**
   * Deactivate a pattern
   */
  deactivatePattern(patternId: string, reason?: string): Promise<void>;

  /**
   * Get active patterns for a specific agent/task
   */
  getActivePatternsFor(filters: {
    agentType?: string;
    taskType?: string;
    skillName?: string;
  }): Promise<Pattern[]>;

  // ========================================================================
  // Adaptation Management
  // ========================================================================

  /**
   * Store an adaptation
   */
  storeAdaptation(adaptation: Adaptation): Promise<void>;

  /**
   * Get adaptation by ID
   */
  getAdaptation(adaptationId: string): Promise<Adaptation | null>;

  /**
   * Query adaptations
   */
  queryAdaptations(filters: {
    patternId?: string;
    agentId?: string;
    taskType?: string;
    skillName?: string;
    isActive?: boolean;
  }): Promise<Adaptation[]>;

  /**
   * Update adaptation outcome (track success/failure)
   */
  updateAdaptationOutcome(
    adaptationId: string,
    outcome: {
      success: boolean;
      improvement?: number;
    }
  ): Promise<void>;

  /**
   * Deactivate an adaptation
   */
  deactivateAdaptation(adaptationId: string, reason?: string): Promise<void>;

  // ========================================================================
  // Statistics & Analytics
  // ========================================================================

  /**
   * Get evolution statistics for an agent
   */
  getStats(agentId: string, timeRange: TimeRange): Promise<EvolutionStats>;

  /**
   * Get stats for all agents (summary)
   */
  getAllStats(timeRange: TimeRange): Promise<EvolutionStats[]>;

  /**
   * Compute aggregated stats for a time period
   */
  computePeriodStats(
    periodType: 'hourly' | 'daily' | 'weekly' | 'monthly',
    periodStart: Date,
    periodEnd: Date
  ): Promise<EvolutionStats[]>;

  // ========================================================================
  // Skill Analytics (NEW)
  // ========================================================================

  /**
   * Get skill performance summary
   */
  getSkillPerformance(
    skillName: string,
    timeRange: TimeRange
  ): Promise<SkillPerformance>;

  /**
   * Get all skills performance (leaderboard)
   */
  getAllSkillsPerformance(timeRange: TimeRange): Promise<SkillPerformance[]>;

  /**
   * Get skill recommendations for a task
   */
  getSkillRecommendations(filters: {
    taskType: string;
    agentType?: string;
    topN?: number;
  }): Promise<SkillRecommendation[]>;

  /**
   * Record skill usage feedback
   */
  recordSkillFeedback(
    spanId: string,
    feedback: {
      satisfaction: number;  // 1-5
      comment?: string;
    }
  ): Promise<void>;

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get database statistics (for monitoring)
   */
  getDatabaseStats(): Promise<{
    total_tasks: number;
    total_executions: number;
    total_spans: number;
    total_patterns: number;
    total_adaptations: number;
    database_size_bytes?: number;
  }>;

  /**
   * Vacuum/optimize database (periodic maintenance)
   */
  optimize(): Promise<void>;

  /**
   * Export data for backup or analysis
   */
  exportData(filters: {
    startDate?: Date;
    endDate?: Date;
    format: 'json' | 'csv';
  }): Promise<string>;
}
