/**
 * Core Types for Execution Mode Choice System
 *
 * Provides foundational type definitions for the task execution system,
 * including execution modes, task priorities, resource management, and
 * progress tracking. These types are used throughout the MCP server to
 * manage background task execution and resource allocation.
 *
 * Features:
 * - Three execution modes (background, foreground, auto)
 * - Task priority and status management
 * - Resource limits and monitoring
 * - Progress tracking with callbacks
 * - System resource information
 *
 * @example
 * ```typescript
 * import {
 *   ExecutionConfig,
 *   DEFAULT_EXECUTION_CONFIG,
 *   BackgroundTask,
 *   TaskStatus
 * } from './types.js';
 *
 * // Use default configuration
 * const config: ExecutionConfig = {
 *   ...DEFAULT_EXECUTION_CONFIG,
 *   mode: 'background',
 *   priority: 'high',
 *   callbacks: {
 *     onProgress: (progress) => console.log(`Progress: ${progress * 100}%`),
 *     onComplete: (result) => console.log('Task completed:', result),
 *     onError: (error) => console.error('Task failed:', error)
 *   }
 * };
 *
 * // Create a background task
 * const task: BackgroundTask = {
 *   taskId: 'task-123',
 *   status: 'queued',
 *   task: { type: 'analysis', data: {...} },
 *   config,
 *   startTime: new Date(),
 *   progress: { progress: 0, currentStage: 'Initializing' }
 * };
 * ```
 */

/**
 * Execution mode types
 *
 * Determines how a task is executed:
 * - **background**: Task runs asynchronously without blocking (non-blocking)
 * - **foreground**: Task runs synchronously and blocks until complete (blocking)
 * - **auto**: System decides based on task analysis and resource availability
 *
 * @example
 * ```typescript
 * // Background mode for long-running tasks
 * const mode: ExecutionMode = 'background';
 *
 * // Foreground mode for urgent tasks requiring immediate results
 * const urgentMode: ExecutionMode = 'foreground';
 *
 * // Auto mode lets the system decide based on analysis
 * const smartMode: ExecutionMode = 'auto';
 * ```
 */
export type ExecutionMode = 'background' | 'foreground' | 'auto';

/**
 * Task priority levels
 *
 * Determines execution order in background mode queue:
 * - **high**: Executed first, critical tasks
 * - **medium**: Normal priority, default for most tasks
 * - **low**: Executed last, deferrable tasks
 *
 * @example
 * ```typescript
 * // High priority for critical operations
 * const criticalTask: TaskPriority = 'high';
 *
 * // Medium priority for standard operations
 * const standardTask: TaskPriority = 'medium';
 *
 * // Low priority for background cleanup
 * const cleanupTask: TaskPriority = 'low';
 * ```
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task execution status
 *
 * Lifecycle states of a task:
 * - **queued**: Task is waiting to be executed
 * - **running**: Task is currently executing
 * - **completed**: Task finished successfully
 * - **failed**: Task encountered an error
 * - **cancelled**: Task was cancelled before completion
 *
 * @example
 * ```typescript
 * // Track task lifecycle
 * let status: TaskStatus = 'queued';
 * status = 'running';  // Task started
 * status = 'completed'; // Task finished successfully
 *
 * // Handle different statuses
 * if (status === 'failed') {
 *   console.error('Task failed, see error property');
 * } else if (status === 'completed') {
 *   console.log('Task completed, see result property');
 * }
 * ```
 */
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  /**
   * Execution mode: background (non-blocking), foreground (blocking), or auto (decide based on analysis)
   */
  mode: ExecutionMode;

  /**
   * Task priority (affects queue ordering in background mode)
   */
  priority: TaskPriority;

  /**
   * Resource limits for this task
   */
  resourceLimits: {
    /**
     * Maximum CPU usage (percentage)
     */
    maxCPU: number;

    /**
     * Maximum memory usage (MB)
     */
    maxMemory: number;

    /**
     * Maximum execution duration (seconds)
     */
    maxDuration: number;
  };

  /**
   * Optional callbacks for progress tracking
   */
  callbacks?: {
    /**
     * Called periodically with progress updates (0-1)
     */
    onProgress?: (progress: number) => void;

    /**
     * Called when task completes successfully
     */
    onComplete?: (result: unknown) => void;

    /**
     * Called if task fails
     */
    onError?: (error: Error) => void;
  };
}

/**
 * Default execution configuration
 *
 * Provides sensible defaults for task execution:
 * - Auto mode selection based on system analysis
 * - Medium priority for balanced execution
 * - Conservative resource limits (70% CPU, 2GB memory, 10 min timeout)
 *
 * @example
 * ```typescript
 * import { DEFAULT_EXECUTION_CONFIG } from './types.js';
 *
 * // Use defaults as-is
 * const config = DEFAULT_EXECUTION_CONFIG;
 *
 * // Override specific settings
 * const customConfig = {
 *   ...DEFAULT_EXECUTION_CONFIG,
 *   mode: 'background',
 *   priority: 'high',
 *   resourceLimits: {
 *     ...DEFAULT_EXECUTION_CONFIG.resourceLimits,
 *     maxMemory: 4096 // Increase to 4GB
 *   }
 * };
 * ```
 */
export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  mode: 'auto',
  priority: 'medium',
  resourceLimits: {
    maxCPU: 70,
    maxMemory: 2048, // 2GB
    maxDuration: 600, // 10 minutes
  },
};

/**
 * Task progress information
 */
export interface Progress {
  /**
   * Current progress (0-1)
   */
  progress: number;

  /**
   * Estimated time remaining (seconds)
   */
  estimatedTimeRemaining?: number;

  /**
   * Current stage/step description
   */
  currentStage?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * System resource information
 */
export interface SystemResources {
  /**
   * CPU usage information
   */
  cpu: {
    /**
     * Current usage percentage (0-100)
     */
    usage: number;

    /**
     * Number of cores available
     */
    cores: number;
  };

  /**
   * Memory usage information
   */
  memory: {
    /**
     * Total memory (MB)
     */
    total: number;

    /**
     * Used memory (MB)
     */
    used: number;

    /**
     * Available memory (MB)
     */
    available: number;

    /**
     * Usage percentage (0-100)
     */
    usagePercent: number;
  };

  /**
   * Currently active background agents
   */
  activeBackgroundAgents: number;
}

/**
 * Resource check result
 */
export interface ResourceCheckResult {
  /**
   * Whether the task can execute
   */
  canExecute: boolean;

  /**
   * Reason if cannot execute
   */
  reason?: string;

  /**
   * Suggested action
   */
  suggestion?: string;

  /**
   * Current resource state
   */
  resources?: SystemResources;
}

/**
 * Background task reference
 */
export interface BackgroundTask {
  /**
   * Unique task ID
   */
  taskId: string;

  /**
   * Task status
   */
  status: TaskStatus;

  /**
   * Original task description/data
   * Using unknown for type safety - callers must validate before use
   */
  task: unknown;

  /**
   * Execution configuration
   */
  config: ExecutionConfig;

  /**
   * Start time
   */
  startTime: Date;

  /**
   * End time (if completed/failed)
   */
  endTime?: Date;

  /**
   * Current progress
   */
  progress?: Progress;

  /**
   * Result (if completed)
   * Using unknown for type safety - callers must validate before use
   */
  result?: unknown;

  /**
   * Error (if failed)
   */
  error?: Error;
}

/**
 * Execution mode suggestion
 */
export interface ExecutionModeSuggestion {
  /**
   * Recommended execution mode
   */
  recommended: ExecutionMode;

  /**
   * Confidence in this recommendation (0-1)
   */
  confidence: number;

  /**
   * Reasoning for this recommendation
   */
  reasoning: string;

  /**
   * Alternative options
   */
  alternatives?: Array<{
    mode: ExecutionMode;
    pros: string[];
    cons: string[];
  }>;
}
