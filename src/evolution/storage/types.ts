/**
 * TypeScript types for Self-Evolving Agent System
 *
 * Inspired by OpenTelemetry and Agent Lightning best practices
 * But implemented purely in TypeScript for our specific needs
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Task - Top-level unit (similar to Agent Lightning's Rollout)
 * Represents a user request or agent task
 */
export interface Task {
  id: string;

  // Input
  input: Record<string, any>;

  // Context
  task_type?: string;
  origin?: string;  // Where did this task come from

  // Status
  status: 'pending' | 'running' | 'completed' | 'failed';

  // Timestamps
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Execution - An attempt to complete a task (similar to Agent Lightning's Attempt)
 * Multiple executions can exist for one task (retries)
 */
export interface Execution {
  id: string;
  task_id: string;

  // Attempt tracking
  attempt_number: number;

  // Agent info
  agent_id?: string;
  agent_type?: string;

  // Status
  status: 'running' | 'completed' | 'failed';

  // Timestamps
  started_at: Date;
  completed_at?: Date;

  // Result
  result?: Record<string, any>;
  error?: string;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Span - Detailed execution trace (OpenTelemetry-inspired)
 * The core unit for tracking and learning
 */
export interface Span {
  // Identity (OpenTelemetry standard)
  trace_id: string;
  span_id: string;
  parent_span_id?: string;

  // Context
  task_id: string;
  execution_id: string;

  // Metadata
  name: string;
  kind: SpanKind;

  // Timing
  start_time: number;  // Unix timestamp (ms)
  end_time?: number;
  duration_ms?: number;

  // Status
  status: SpanStatus;

  // Attributes (flat key-value for flexibility)
  attributes: SpanAttributes;

  // Resource (global context - set once per execution)
  resource: ResourceAttributes;

  // Links (to other spans - for reward tracking, etc.)
  links?: SpanLink[];

  // Tags (for classification and querying)
  tags?: string[];

  // Events (structured log entries within span)
  events?: SpanEvent[];
}

export type SpanKind =
  | 'internal'     // Internal operation
  | 'client'       // Client request (e.g., calling external API)
  | 'server'       // Server handling request
  | 'producer'     // Message producer
  | 'consumer';    // Message consumer

export interface SpanStatus {
  code: 'OK' | 'ERROR' | 'UNSET';
  message?: string;
}

/**
 * Span Attributes - The actual data we track
 * Using semantic conventions similar to OpenTelemetry
 */
export interface SpanAttributes {
  // Agent attributes
  'agent.id'?: string;
  'agent.type'?: string;
  'agent.version'?: string;

  // Task attributes
  'task.type'?: string;
  'task.input'?: string;  // JSON serialized

  // Execution attributes
  'execution.success'?: boolean;
  'execution.duration_ms'?: number;
  'execution.cost'?: number;
  'execution.quality_score'?: number;

  // Skill attributes (NEW - for skills tracking)
  'skill.name'?: string;
  'skill.version'?: string;
  'skill.input'?: string;  // JSON serialized
  'skill.output'?: string; // JSON serialized
  'skill.success'?: boolean;
  'skill.user_satisfaction'?: number;  // 0-1

  // LLM attributes
  'llm.model'?: string;
  'llm.provider'?: string;
  'llm.tokens.prompt'?: number;
  'llm.tokens.completion'?: number;
  'llm.tokens.total'?: number;
  'llm.cost'?: number;

  // Error attributes
  'error.type'?: string;
  'error.message'?: string;
  'error.stack'?: string;

  // Config attributes
  'config.snapshot'?: string;  // JSON serialized agent config

  // Custom attributes (flexible for future needs)
  [key: string]: any;
}

/**
 * Resource Attributes - Global context for entire execution
 */
export interface ResourceAttributes {
  // Task/Execution context
  'task.id': string;
  'execution.id': string;
  'execution.attempt': number;

  // Agent context
  'agent.id'?: string;
  'agent.type'?: string;

  // Environment
  'service.name'?: string;
  'service.version'?: string;
  'deployment.environment'?: 'dev' | 'staging' | 'production';

  // Custom
  [key: string]: any;
}

/**
 * Span Link - Connect spans (e.g., operation ←→ reward)
 */
export interface SpanLink {
  trace_id: string;
  span_id: string;

  // Link type (semantic meaning)
  link_type?: 'reward_for' | 'caused_by' | 'follows_from' | 'parent_of';

  // Additional context
  attributes?: Record<string, any>;
}

/**
 * Span Event - Structured log within span
 */
export interface SpanEvent {
  name: string;
  timestamp: number;  // Unix timestamp (ms)
  attributes?: Record<string, any>;
}

// ============================================================================
// Pattern Types
// ============================================================================

/**
 * Pattern - Learned knowledge from execution history
 */
export interface Pattern {
  id: string;
  type: PatternType;

  // Pattern strength
  confidence: number;  // 0-1
  occurrences: number;

  // Pattern data
  pattern_data: PatternData;

  // Source tracking
  source_span_ids: string[];

  // Applicability
  applies_to_agent_type?: string;
  applies_to_task_type?: string;
  applies_to_skill?: string;  // NEW - skill-specific patterns

  // Lifecycle
  first_observed: Date;
  last_observed: Date;
  is_active: boolean;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export type PatternType =
  | 'success'        // Successful execution pattern
  | 'anti_pattern'   // Anti-pattern to avoid
  | 'optimization';  // Optimization opportunity

/**
 * Pattern Data - The actual learned pattern
 */
export interface PatternData {
  // What makes this pattern
  conditions: Record<string, any>;

  // What this pattern suggests
  recommendations: {
    config_changes?: Record<string, any>;
    prompt_changes?: string;
    strategy_changes?: string;
    skill_selection?: string[];  // NEW - recommend which skills to use
  };

  // Expected outcome
  expected_improvement: {
    success_rate?: number;
    duration_reduction?: number;  // percentage
    cost_reduction?: number;      // percentage
    quality_increase?: number;    // percentage
  };

  // Statistical evidence
  evidence: {
    sample_size: number;
    mean?: number;
    std_dev?: number;
    p_value?: number;
    confidence_interval?: [number, number];
  };
}

// ============================================================================
// Adaptation Types
// ============================================================================

/**
 * Adaptation - A pattern applied to change agent behavior
 */
export interface Adaptation {
  id: string;
  pattern_id: string;

  // What changed
  type: AdaptationType;

  // Changes
  before_config: Record<string, any>;
  after_config: Record<string, any>;

  // Application
  applied_to_agent_id?: string;
  applied_to_task_type?: string;
  applied_to_skill?: string;  // NEW - skill-specific adaptations
  applied_at: Date;

  // Outcome tracking
  success_count: number;
  failure_count: number;
  avg_improvement: number;  // percentage

  // Lifecycle
  is_active: boolean;
  deactivated_at?: Date;
  deactivation_reason?: string;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export type AdaptationType =
  | 'config'      // Agent config change
  | 'prompt'      // Prompt engineering
  | 'strategy'    // Execution strategy
  | 'resource'    // Resource allocation
  | 'skill';      // NEW - Skill selection/configuration

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Evolution Stats - Aggregated metrics over time
 */
export interface EvolutionStats {
  id: string;

  // Scope
  agent_id?: string;
  skill_name?: string;  // NEW - skill-specific stats

  // Time window
  period_start: Date;
  period_end: Date;
  period_type: 'hourly' | 'daily' | 'weekly' | 'monthly';

  // Execution metrics
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;  // percentage

  // Performance metrics
  avg_duration_ms: number;
  avg_cost: number;
  avg_quality_score: number;

  // Evolution metrics
  patterns_discovered: number;
  adaptations_applied: number;
  improvement_rate: number;  // percentage vs previous period

  // Skill metrics (NEW)
  skills_used?: string[];
  most_successful_skill?: string;
  avg_skill_satisfaction?: number;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Span Query Filters
 */
export interface SpanQuery {
  // Identity filters
  task_id?: string;
  execution_id?: string;
  trace_id?: string;
  span_id?: string;

  // Context filters
  agent_id?: string;
  agent_type?: string;
  task_type?: string;
  skill_name?: string;  // NEW - filter by skill

  // Status filters
  status_code?: 'OK' | 'ERROR';
  success?: boolean;

  // Tag filters
  tags?: string[];
  tags_mode?: 'any' | 'all';  // Match any tag or all tags

  // Time filters
  start_time_gte?: number;  // >= start time
  start_time_lte?: number;  // <= start time
  end_time_gte?: number;
  end_time_lte?: number;

  // Attribute filters (flexible)
  attributes?: Record<string, any>;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'start_time' | 'duration_ms' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Pattern Query Filters
 */
export interface PatternQuery {
  type?: PatternType | PatternType[];

  // Confidence filter
  min_confidence?: number;
  max_confidence?: number;

  // Applicability
  agent_type?: string;
  task_type?: string;
  skill_name?: string;  // NEW

  // Tag filters
  tags?: string[];

  // Status
  is_active?: boolean;

  // Time range
  observed_after?: Date;
  observed_before?: Date;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'confidence' | 'occurrences' | 'last_observed';
  sort_order?: 'asc' | 'desc';
}

/**
 * Time Range for statistics queries
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Reward Types (for delayed feedback)
// ============================================================================

/**
 * Reward - Delayed feedback for an execution
 * Linked to operation span via SpanLink
 */
export interface Reward {
  id: string;

  // Link to operation
  operation_span_id: string;

  // Reward value
  value: number;  // 0-1 (or custom range)

  // Multi-dimensional rewards (optional)
  dimensions?: {
    accuracy?: number;
    speed?: number;
    cost?: number;
    user_satisfaction?: number;
    [key: string]: number | undefined;
  };

  // Feedback
  feedback?: string;
  feedback_type?: 'user' | 'automated' | 'expert';

  // Context
  provided_by?: string;  // User ID or system
  provided_at: Date;

  // Metadata
  metadata?: Record<string, any>;
}

// ============================================================================
// Skill-Specific Types (NEW)
// ============================================================================

/**
 * Skill Performance Summary
 */
export interface SkillPerformance {
  skill_name: string;
  skill_version?: string;

  // Usage stats
  total_uses: number;
  successful_uses: number;
  failed_uses: number;
  success_rate: number;

  // Performance stats
  avg_duration_ms: number;
  avg_user_satisfaction: number;

  // Context stats
  most_used_with_agent?: string;
  most_used_for_task?: string;

  // Trends
  trend_7d: 'improving' | 'declining' | 'stable';
  trend_30d: 'improving' | 'declining' | 'stable';

  // Time range
  period_start: Date;
  period_end: Date;
}

/**
 * Skill Recommendation
 */
export interface SkillRecommendation {
  skill_name: string;

  // Recommendation strength
  confidence: number;  // 0-1

  // Reasoning
  reason: string;
  evidence: {
    similar_tasks_count: number;
    avg_success_rate: number;
    avg_user_satisfaction: number;
  };

  // Expected outcome
  expected_outcome: {
    success_probability: number;
    estimated_duration_ms: number;
    estimated_quality_score: number;
  };
}

// ============================================================================
// Database Row Types (SQLite raw data before transformation)
// ============================================================================

/**
 * Raw database row types - what better-sqlite3 returns
 * These represent the actual database schema columns
 */

export interface TaskRow {
  id: string;
  input: string;  // JSON stringified
  task_type: string | null;
  origin: string | null;
  status: string;
  created_at: string;  // ISO date string
  started_at: string | null;
  completed_at: string | null;
  metadata: string | null;  // JSON stringified
}

export interface ExecutionRow {
  id: string;
  task_id: string;
  attempt_number: number;
  agent_id: string | null;
  agent_type: string | null;
  status: string;
  started_at: string;  // ISO date string
  completed_at: string | null;
  result: string | null;  // JSON stringified
  error: string | null;
  metadata: string | null;  // JSON stringified
}

export interface SpanRow {
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  task_id: string;
  execution_id: string;
  name: string;
  kind: string;
  start_time: number;
  end_time: number | null;
  duration_ms: number | null;
  status_code: string;
  status_message: string | null;
  attributes: string;  // JSON stringified
  resource: string;    // JSON stringified
  links: string | null;  // JSON stringified
  tags: string | null;   // JSON stringified
  events: string | null; // JSON stringified
}

export interface PatternRow {
  id: string;
  type: string;
  confidence: number;
  occurrences: number;
  pattern_data: string;  // JSON stringified
  source_span_ids: string;  // JSON stringified
  applies_to_agent_type: string | null;
  applies_to_task_type: string | null;
  applies_to_skill: string | null;
  first_observed: string;  // ISO date string
  last_observed: string;
  is_active: number;  // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface AdaptationRow {
  id: string;
  pattern_id: string;
  type: string;
  before_config: string;  // JSON stringified
  after_config: string;
  applied_to_agent_id: string | null;
  applied_to_task_type: string | null;
  applied_to_skill: string | null;
  applied_at: string;  // ISO date string
  success_count: number;
  failure_count: number;
  avg_improvement: number;
  is_active: number;  // SQLite boolean
  deactivated_at: string | null;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardRow {
  id: string;
  operation_span_id: string;
  value: number;
  dimensions: string | null;  // JSON stringified
  feedback: string | null;
  feedback_type: string | null;
  provided_by: string | null;
  provided_at: string;  // ISO date string
  metadata: string | null;  // JSON stringified
}

export interface EvolutionStatsRow {
  id: string;
  agent_id: string | null;
  skill_name: string | null;
  period_start: string;  // ISO date string
  period_end: string;
  period_type: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  avg_cost: number;
  avg_quality_score: number;
  patterns_discovered: number;
  adaptations_applied: number;
  improvement_rate: number;
  skills_used: string | null;  // JSON stringified
  most_successful_skill: string | null;
  avg_skill_satisfaction: number | null;
  created_at: string;
  updated_at: string;
}

export interface ContextualPatternRow {
  id: string;
  pattern_id: string;
  context_hash: string;
  context_data: string;  // JSON stringified
  confidence: number;
  occurrences: number;
  success_rate: number;
  avg_quality_score: number | null;
  last_observed: string;  // ISO date string
  created_at: string;
  updated_at: string;
}

/**
 * SQL Parameter Type - for database query parameters
 * SQLite supports: NULL, INTEGER, REAL, TEXT, BLOB
 */
export type SQLParam = string | number | null | Buffer;

// ============================================================================
// Re-exports from main evolution types (Phase 2+)
// ============================================================================

export type { PatternContext, ContextualPattern } from '../types.js';
