/**
 * Core types for execution mode choice system
 */

/**
 * Execution mode types
 */
export type ExecutionMode = 'background' | 'foreground' | 'auto';

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task execution status
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
