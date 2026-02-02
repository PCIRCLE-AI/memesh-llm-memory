/**
 * A2A Protocol Constants
 *
 * Centralized configuration values for A2A protocol implementation.
 * All timeout values use underscores for readability (e.g., 60_000 = 60,000 ms = 60 seconds).
 *
 * @module a2a/constants
 */

/**
 * Time duration constants (in milliseconds)
 */
export const TIME = {
  /**
   * Default task timeout duration (5 minutes)
   * Used by MCPTaskDelegator to detect stalled tasks
   */
  TASK_TIMEOUT_MS: 300_000, // 5 minutes

  /**
   * Default timeout checker interval (1 minute)
   * How often the TimeoutChecker runs to detect timed-out tasks
   */
  TIMEOUT_CHECK_INTERVAL_MS: 60_000, // 1 minute

  /**
   * Default heartbeat interval (1 minute)
   * How often agents send heartbeat to maintain active status
   */
  HEARTBEAT_INTERVAL_MS: 60_000, // 1 minute

  /**
   * Default stale agent threshold (5 minutes)
   * Agents without heartbeat for this duration are marked as stale
   */
  STALE_AGENT_THRESHOLD_MS: 5 * 60_000, // 5 minutes
} as const;

/**
 * Phase 1.0 limitations
 */
export const LIMITS = {
  /**
   * Maximum concurrent tasks per agent in Phase 1.0
   * Phase 2.0+ will support multiple concurrent tasks
   */
  MAX_CONCURRENT_TASKS_PHASE_1: 1,
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  /**
   * Default port range for dynamic port allocation
   */
  DEFAULT_PORT_RANGE: {
    min: 3000,
    max: 3999,
  },

  /**
   * Request body size limits
   */
  MAX_REQUEST_BODY_SIZE: '10mb',
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  /**
   * Default rate limit for all endpoints (requests per minute)
   */
  DEFAULT_RPM: 100,

  /**
   * Rate limit for /a2a/send-message endpoint (requests per minute)
   */
  SEND_MESSAGE_RPM: 60,

  /**
   * Rate limit for /a2a/tasks/:taskId endpoint (requests per minute)
   */
  GET_TASK_RPM: 120,

  /**
   * Rate limit for /a2a/tasks endpoint (requests per minute)
   */
  LIST_TASKS_RPM: 100,

  /**
   * Rate limit for /a2a/tasks/:taskId/cancel endpoint (requests per minute)
   */
  CANCEL_TASK_RPM: 60,

  /**
   * Cleanup interval for expired rate limit entries (5 minutes)
   */
  CLEANUP_INTERVAL_MS: 5 * 60_000,
} as const;

/**
 * Environment variable keys
 */
export const ENV_KEYS = {
  /**
   * Bearer token for A2A authentication
   */
  A2A_TOKEN: 'MEMESH_A2A_TOKEN',

  /**
   * Custom task timeout override (in milliseconds)
   */
  TASK_TIMEOUT: 'MEMESH_A2A_TASK_TIMEOUT',

  /**
   * Rate limit overrides (requests per minute)
   */
  RATE_LIMIT_DEFAULT: 'MEMESH_A2A_RATE_LIMIT_DEFAULT',
  RATE_LIMIT_SEND_MESSAGE: 'MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE',
  RATE_LIMIT_GET_TASK: 'MEMESH_A2A_RATE_LIMIT_GET_TASK',
  RATE_LIMIT_LIST_TASKS: 'MEMESH_A2A_RATE_LIMIT_LIST_TASKS',
  RATE_LIMIT_CANCEL_TASK: 'MEMESH_A2A_RATE_LIMIT_CANCEL_TASK',
} as const;
