/**
 * Telemetry Types - Privacy-First Event Definitions
 */

/**
 * Base fields for all telemetry events
 */
export interface BaseTelemetryEvent {
  anonymous_id: string;      // UUID, NO user identification
  timestamp: string;         // ISO 8601
  sdk_version: string;       // claude-code-buddy version
  node_version: string;      // Node.js version
  os_platform: string;       // 'darwin', 'linux', 'win32'
}

/**
 * Agent execution event
 */
export interface AgentUsageEvent extends BaseTelemetryEvent {
  event: 'agent_execution';
  agent_type: string;        // "code-reviewer", "debugger"
  agent_version?: string;
  success: boolean;
  duration_ms: number;
  cost?: number;
  task_type?: string;        // "bug_fix", "code_review"
  error_type?: string;       // Only if success=false
}

/**
 * Skill execution event
 */
export interface SkillUsageEvent extends BaseTelemetryEvent {
  event: 'skill_execution';
  skill_name: string;
  skill_version?: string;
  success: boolean;
  duration_ms: number;
  user_satisfaction?: number; // 1-5 stars
  used_with_agent?: string;
  task_type?: string;
}

/**
 * Feature usage event
 */
export interface FeatureUsageEvent extends BaseTelemetryEvent {
  event: 'feature_usage';
  feature_name: string;      // 'evolution_system', 'multi_agent'
  action: string;            // 'enabled', 'disabled', 'configured'
}

/**
 * Error event (sanitized)
 */
export interface ErrorEvent extends BaseTelemetryEvent {
  event: 'error';
  error_type: string;        // 'TypeError', 'NetworkError'
  error_category: string;    // 'network', 'config', 'runtime'
  component: string;         // 'evolution/storage', 'agents/code-reviewer'
  stack_trace_hash?: string; // SHA-256 hash of stack trace
}

/**
 * Performance event
 */
export interface PerformanceEvent extends BaseTelemetryEvent {
  event: 'performance';
  operation: string;         // 'pattern_learning', 'span_query'
  duration_ms: number;
  data_size?: number;
}

/**
 * Workflow event
 */
export interface WorkflowEvent extends BaseTelemetryEvent {
  event: 'workflow';
  workflow_type: string;     // 'code_review', 'debugging'
  steps_completed: number;
  total_steps: number;
  success: boolean;
}

/**
 * Union type of all telemetry events
 */
export type TelemetryEvent =
  | AgentUsageEvent
  | SkillUsageEvent
  | FeatureUsageEvent
  | ErrorEvent
  | PerformanceEvent
  | WorkflowEvent;

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  enabled: boolean;           // Default: false (opt-in)
  anonymous_id: string;       // UUID
  send_automatically: boolean; // Default: false
  send_interval_hours?: number;
  last_sent?: Date;
}

/**
 * Type guards
 */
export function isAgentUsageEvent(event: TelemetryEvent): event is AgentUsageEvent {
  return event.event === 'agent_execution';
}

export function isSkillUsageEvent(event: TelemetryEvent): event is SkillUsageEvent {
  return event.event === 'skill_execution';
}

export function isErrorEvent(event: TelemetryEvent): event is ErrorEvent {
  return event.event === 'error';
}

export function isPerformanceEvent(event: TelemetryEvent): event is PerformanceEvent {
  return event.event === 'performance';
}

export function isWorkflowEvent(event: TelemetryEvent): event is WorkflowEvent {
  return event.event === 'workflow';
}

/**
 * Event filters for querying
 */
export interface EventFilters {
  event_type?: TelemetryEvent['event'];
  start_date?: Date;
  end_date?: Date;
  sent?: boolean;
  limit?: number;
}
