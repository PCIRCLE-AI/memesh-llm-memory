/**
 * UI Type Definitions for Terminal Dashboard
 *
 * Comprehensive type system for the Terminal UI layer
 */

/**
 * UI Event Types
 * All events that can be emitted by the UIEventBus
 */
export const UIEventType = {
  PROGRESS: 'progress',
  AGENT_START: 'agent_start',
  AGENT_COMPLETE: 'agent_complete',
  SUCCESS: 'success',
  ERROR: 'error',
  METRICS_UPDATE: 'metrics_update',
} as const;

export type UIEventTypeValue = typeof UIEventType[keyof typeof UIEventType];

/**
 * Progress Indicator
 * Represents the current progress of an agent's task
 */
export interface ProgressIndicator {
  agentId: string;
  agentType: string;
  taskDescription: string;
  progress: number; // 0.0 to 1.0
  currentStage?: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * Agent Status
 * Current status of a running agent
 */
export interface AgentStatus {
  agentId: string;
  agentType: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0.0 to 1.0
  currentTask?: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * Success Event
 * Emitted when an agent task completes successfully
 */
export interface SuccessEvent {
  agentId: string;
  agentType: string;
  taskDescription: string;
  result: any;
  duration: number; // milliseconds
  timestamp: Date;
}

/**
 * Error Event
 * Emitted when an agent task fails
 */
export interface ErrorEvent {
  agentId: string;
  agentType: string;
  taskDescription: string;
  error: Error;
  timestamp: Date;
  sanitized?: boolean;
}

/**
 * Attribution Entry
 * Records success/error events for later GitHub issue generation
 */
export interface AttributionEntry {
  type: 'success' | 'error';
  agentType: string;
  taskDescription: string;
  timestamp: Date;
  result?: any;
  error?: Error;
  sanitized?: boolean;
}

/**
 * Metrics Snapshot
 * Current productivity metrics for the session
 */
export interface MetricsSnapshot {
  sessionStart: Date;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  agentUsageCount: Record<string, number>; // agentType -> count
  estimatedTimeSaved: number; // seconds
  tokensUsed: number;
}

/**
 * Dashboard State
 * Complete state of the terminal dashboard
 */
export interface DashboardState {
  activeAgents: Map<string, AgentStatus>;
  recentEvents: AttributionEntry[];
  metrics: MetricsSnapshot;
}

/**
 * Dashboard Configuration
 * Customization options for the dashboard
 */
export interface DashboardConfig {
  updateInterval: number; // milliseconds (default: 100)
  maxRecentEvents: number; // maximum events to show (default: 10)
  showSpinner?: boolean; // show loading spinner (default: true)
  showMetrics?: boolean; // show productivity metrics (default: true)
  showAttribution?: boolean; // show success/error attribution (default: true)
}

/**
 * Privacy Sanitization Options
 * Configuration for removing sensitive information from error reports
 */
export interface SanitizationOptions {
  removeUserPaths?: boolean; // remove user home directory paths (default: true)
  removeApiKeys?: boolean; // remove API keys (default: true)
  removePasswords?: boolean; // remove passwords (default: true)
  removeTokens?: boolean; // remove tokens (default: true)
  customPatterns?: RegExp[]; // additional patterns to remove
}

/**
 * GitHub Issue Generation Options
 * Configuration for auto-generating GitHub issues from errors
 */
export interface GitHubIssueOptions {
  enabled: boolean; // enable auto-generation (default: false)
  repository: string; // target repository (e.g., "owner/repo")
  labels?: string[]; // labels to apply to issues
  assignees?: string[]; // users to assign
  sanitize?: SanitizationOptions; // privacy sanitization options
}
