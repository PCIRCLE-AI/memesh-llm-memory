/**
 * Background Executor - Resource-Aware Task Execution Engine
 *
 * Manages background task execution with resource monitoring, priority-based queueing,
 * progress tracking, and cancellation support. Ensures system resources are not overloaded
 * while maintaining efficient task throughput across multiple concurrent background agents.
 *
 * Features:
 * - **Resource-Aware Scheduling**: Monitors CPU, memory, and concurrent agent limits
 * - **Priority-Based Queueing**: Executes high-priority tasks first using TaskScheduler
 * - **Progress Tracking**: Real-time progress updates with stage information
 * - **Task Cancellation**: Cancel queued or running tasks with immediate status updates
 * - **Asynchronous Execution**: Non-blocking task execution with promise-based completion
 * - **UIEventBus Integration**: Progress events for frontend monitoring and attribution
 * - **Result Handling**: Dedicated result handler for task completion/failure
 *
 * Task Lifecycle:
 * 1. **Queued**: Task submitted, waiting for resources
 * 2. **Running**: Task executing with progress updates
 * 3. **Completed**: Task finished successfully with result
 * 4. **Failed**: Task failed with error details
 * 5. **Cancelled**: Task cancelled by user or system
 *
 * Resource Management:
 * - Checks CPU, memory, and concurrent agent limits before task execution
 * - Queues tasks when resources are temporarily unavailable
 * - Fails tasks only when resource constraints are permanent (e.g., max agents = 0)
 * - Registers/unregisters tasks with ResourceMonitor for accurate tracking
 *
 * @example
 * ```typescript
 * import { BackgroundExecutor } from './BackgroundExecutor.js';
 * import { ResourceMonitor } from './ResourceMonitor.js';
 * import { DEFAULT_EXECUTION_CONFIG } from './types.js';
 *
 * // Create executor with resource monitor
 * const resourceMonitor = new ResourceMonitor();
 * const executor = new BackgroundExecutor(resourceMonitor);
 *
 * // Execute a simple task
 * const taskId = await executor.executeTask(
 *   async ({ updateProgress, isCancelled }) => {
 *     updateProgress(0.5, 'processing');
 *     if (isCancelled()) return null;
 *     // Do work...
 *     updateProgress(1.0, 'completed');
 *     return { success: true };
 *   },
 *   DEFAULT_EXECUTION_CONFIG
 * );
 *
 * // Monitor progress
 * const progress = await executor.getProgress(taskId);
 * console.log(`Progress: ${progress.progress * 100}%`);
 * console.log(`Stage: ${progress.currentStage}`);
 *
 * // Cancel if needed
 * await executor.cancelTask(taskId);
 *
 * // Get statistics
 * const stats = executor.getStats();
 * console.log(`Running: ${stats.running}, Queued: ${stats.queued}`);
 * ```
 */

import { randomBytes } from 'crypto';
import { ResourceMonitor } from './ResourceMonitor.js';
import { TaskScheduler } from './TaskScheduler.js';
import { ResultHandler } from './ResultHandler.js';
import { ExecutionMonitor } from './ExecutionMonitor.js';
import {
  ExecutionConfig,
  BackgroundTask,
  Progress,
  TaskStatus,
} from './types.js';
import { logger } from '../utils/logger.js';
import { UIEventBus } from '../ui/UIEventBus.js';
import { AttributionManager } from '../ui/AttributionManager.js';
import { ValidationError, NotFoundError, StateError } from '../errors/index.js';
// ✅ SECURITY FIX (HIGH-2): Import comprehensive sanitization utilities
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';
// ✅ CODE QUALITY FIX (MAJOR-1): Import validation utilities for consistency
import { validateFiniteNumber, validateSafeInteger } from '../utils/validation.js';

/**
 * Timeout Error - Task exceeded maximum duration
 *
 * Thrown when a task execution exceeds the configured maxDuration limit.
 * This error is always treated as a task failure, not a cancellation.
 *
 * Exported for external catch blocks to handle timeout-specific logic.
 */
export class TimeoutError extends Error {
  constructor(duration: number) {
    super(
      `Task timed out after ${duration}ms. Consider breaking down the task into smaller operations or increasing maxDuration in config.resourceLimits.`
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Expected structure for task data
 *
 * Flexible task data structure supporting multiple execution patterns:
 * - Function-based tasks: `(context) => Promise<result>`
 * - Object-based tasks: `{ execute: (context) => Promise<result>, ...metadata }`
 * - Data-only tasks: `{ data: any, ...metadata }` (no execution logic)
 *
 * @example
 * ```typescript
 * // Function-based task
 * const functionTask = async ({ updateProgress, isCancelled }) => {
 *   updateProgress(0.5, 'halfway');
 *   return { success: true };
 * };
 *
 * // Object-based task with execute method
 * const objectTask: TaskData = {
 *   description: 'Process user data',
 *   execute: async ({ updateProgress, isCancelled }) => {
 *     // Task logic here
 *     return processedData;
 *   }
 * };
 *
 * // Data-only task (no execution logic)
 * const dataTask: TaskData = {
 *   description: 'Configuration task',
 *   configData: { setting: 'value' }
 * };
 * ```
 */
interface TaskData {
  /** Human-readable task description for UI and logging */
  description?: string;

  /** Optional execution function with progress and cancellation support */
  execute?: (context: {
    /** Update task progress (0.0 to 1.0) with optional stage description */
    updateProgress: (progress: number, stage?: string) => void;
    /** Check if task has been cancelled */
    isCancelled: () => boolean;
  }) => Promise<unknown>;

  /** Additional task-specific data */
  [key: string]: unknown;
}

/**
 * Worker handle for running tasks
 *
 * Internal handle for managing executing tasks. Provides access to task promise,
 * cancellation mechanism, and progress update function. Used by BackgroundExecutor
 * to track and control active workers.
 *
 * @example
 * ```typescript
 * const workerHandle: WorkerHandle = {
 *   promise: executeTask(),
 *   cancel: () => { cancelled = true; },
 *   updateProgress: (progress, stage) => {
 *     console.log(`${stage}: ${progress * 100}%`);
 *   }
 * };
 *
 * // Wait for completion
 * const result = await workerHandle.promise;
 *
 * // Or cancel early
 * workerHandle.cancel();
 * ```
 */
interface WorkerHandle {
  /** Promise representing the task execution, resolves with result or rejects with error */
  promise: Promise<unknown>;

  /** Cancellation function to request task termination */
  cancel: () => void;

  /** Progress update function for the task */
  updateProgress: (progress: number, stage?: string) => void;
}

/**
 * BackgroundExecutor Class
 *
 * Main execution engine for background tasks with resource monitoring and priority queueing.
 * Manages task lifecycle from submission through completion, with progress tracking and
 * cancellation support throughout.
 *
 * Architecture:
 * - **TaskScheduler**: Priority-based task scheduling with resource checking (high → medium → low)
 * - **ResourceMonitor**: CPU, memory, and concurrent agent tracking
 * - **ActiveWorkers**: Map of running tasks with cancellation handles
 * - **ResultHandler**: Task completion and failure handling
 * - **ExecutionMonitor**: Task registration and monitoring
 * - **UIEventBus**: Optional integration for frontend progress updates
 *
 * Thread Safety:
 * - Single-threaded queue processing (processingQueue flag prevents concurrent processing)
 * - Task status updates are synchronous and immediate
 * - Worker handles support concurrent task execution
 *
 * @example
 * ```typescript
 * // Basic usage
 * const executor = new BackgroundExecutor(resourceMonitor);
 * const taskId = await executor.executeTask(
 *   async ({ updateProgress }) => {
 *     updateProgress(0.5, 'processing');
 *     return result;
 *   },
 *   { priority: 'high', mode: 'background' }
 * );
 *
 * // With UI integration
 * const uiEventBus = new UIEventBus();
 * const executor = new BackgroundExecutor(resourceMonitor, uiEventBus);
 * // Progress updates automatically sent to UIEventBus
 *
 * // Monitor multiple tasks
 * const stats = executor.getStats();
 * console.log(`${stats.running} running, ${stats.queued} queued`);
 * ```
 */
export class BackgroundExecutor {
  private scheduler: TaskScheduler;
  private activeWorkers: Map<string, WorkerHandle>;
  private resourceMonitor: ResourceMonitor;
  private tasks: Map<string, BackgroundTask>;
  // ✅ FIX P1-9: Boolean lock for processQueue serialization
  // Note: Boolean lock is safe in Node.js single-threaded event loop
  // Synchronous check-and-set is atomic within the same tick
  private processingLock: boolean = false;
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();
  private cleanupScheduled: Set<string> = new Set();
  private cleanupCancelCounts: Map<string, number> = new Map();
  private activeTimeouts: Set<NodeJS.Timeout> = new Set();
  private eventBus?: UIEventBus;
  private attributionManager?: AttributionManager;
  private resultHandler: ResultHandler;
  private executionMonitor: ExecutionMonitor;
  private isShuttingDown: boolean = false;
  private shutdownPromise: Promise<void> | null = null;

  // Security: Resource exhaustion protection
  private readonly MAX_TASK_HISTORY = 1000;
  private readonly FORCE_CLEANUP_AGE = 3600000; // 1 hour in milliseconds
  private readonly MAX_CLEANUP_CANCELS = 10;
  private readonly SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds graceful shutdown

  /**
   * Create a new BackgroundExecutor
   *
   * Initializes the execution engine with resource monitoring and optional UI integration.
   * Creates internal task scheduler, worker tracking, and attribution manager if UIEventBus provided.
   *
   * @param resourceMonitor - Resource monitor for CPU, memory, and concurrent agent tracking
   * @param eventBus - Optional UIEventBus for progress updates and attribution events
   *
   * @example
   * ```typescript
   * // Basic executor (no UI integration)
   * const resourceMonitor = new ResourceMonitor();
   * const executor = new BackgroundExecutor(resourceMonitor);
   *
   * // With UI integration
   * const uiEventBus = new UIEventBus();
   * const executor = new BackgroundExecutor(resourceMonitor, uiEventBus);
   * // AttributionManager automatically created for success/error tracking
   * ```
   */
  constructor(resourceMonitor: ResourceMonitor, eventBus?: UIEventBus) {
    this.scheduler = new TaskScheduler(resourceMonitor);
    this.activeWorkers = new Map();
    this.resourceMonitor = resourceMonitor;
    this.tasks = new Map();
    this.eventBus = eventBus;
    this.resultHandler = new ResultHandler();
    this.executionMonitor = new ExecutionMonitor(eventBus);

    // Create AttributionManager if UIEventBus provided
    if (this.eventBus) {
      this.attributionManager = new AttributionManager(this.eventBus);
    }
  }

  /**
   * Execute a task in background
   *
   * Submits a task for background execution with resource-aware scheduling. The task
   * is queued if resources are temporarily unavailable, or rejected if resource constraints
   * are permanent (e.g., max concurrent agents = 0). Returns a unique task ID for tracking.
   *
   * Task Formats Supported:
   * - **Function**: `async ({ updateProgress, isCancelled }) => result`
   * - **Object with execute**: `{ execute: async (context) => result, description: '...' }`
   * - **Data object**: `{ data: any, ...metadata }` (completed immediately with data)
   *
   * Resource Queueing:
   * - Task queued if max concurrent agents reached (temporary constraint)
   * - Task queued if CPU/memory temporarily insufficient (can wait for resources)
   * - Task rejected if max agents = 0 (permanent constraint)
   *
   * @param task - Task to execute (function, object with execute method, or data)
   * @param config - Execution configuration (priority, mode, callbacks, resource limits)
   * @returns Task ID for progress tracking and cancellation
   * @throws ValidationError if resources permanently insufficient or invalid configuration
   *
   * @example
   * ```typescript
   * // Function-based task with progress tracking
   * const taskId = await executor.executeTask(
   *   async ({ updateProgress, isCancelled }) => {
   *     updateProgress(0.25, 'loading data');
   *     const data = await loadData();
   *
   *     if (isCancelled()) return null;
   *
   *     updateProgress(0.75, 'processing');
   *     const result = processData(data);
   *
   *     updateProgress(1.0, 'completed');
   *     return result;
   *   },
   *   { priority: 'high', mode: 'background' }
   * );
   *
   * // Object-based task with callbacks
   * const taskId = await executor.executeTask(
   *   {
   *     description: 'Process user data',
   *     execute: async ({ updateProgress }) => {
   *       // Processing logic
   *       return processedData;
   *     }
   *   },
   *   {
   *     priority: 'medium',
   *     mode: 'background',
   *     callbacks: {
   *       onProgress: (progress) => console.log(`${progress * 100}%`),
   *       onComplete: (result) => console.log('Done:', result),
   *       onError: (error) => console.error('Failed:', error)
   *     }
   *   }
   * );
   * ```
   */
  async executeTask(task: unknown, config: ExecutionConfig): Promise<string> {
    // ✅ FIX MAJOR-1 (Round 1): Reject new tasks during shutdown to prevent resource leaks
    if (this.isShuttingDown) {
      throw new StateError(
        'Executor is shutting down, cannot accept new tasks',
        {
          operation: 'executeTask',
          isShuttingDown: true,
        }
      );
    }

    // ✅ CODE QUALITY FIX (MAJOR-1): Use validation utilities for consistency
    // ✅ SECURITY FIX (CRITICAL-2): Comprehensive maxDuration validation to prevent DoS and integer overflow
    if (config.resourceLimits?.maxDuration !== undefined) {
      const duration = config.resourceLimits.maxDuration;
      const MAX_ALLOWED_DURATION = 3600000; // 1 hour

      // ✅ SECURITY: Validate it's a number (prevent type confusion)
      if (typeof duration !== 'number') {
        throw new ValidationError('maxDuration must be a number', {
          provided: duration,
          type: typeof duration,
        });
      }

      // ✅ Use validation utilities for consistent validation
      // This validates: finite, min > 0, max <= MAX_ALLOWED_DURATION
      validateFiniteNumber(duration, 'maxDuration', { min: 1, max: MAX_ALLOWED_DURATION });

      // ✅ SECURITY: Validate it's a safe integer (prevents overflow attacks)
      validateSafeInteger(duration, 'maxDuration');

      // ✅ SECURITY: Catch -0 edge case (validation utilities don't handle this)
      if (Object.is(duration, -0)) {
        throw new ValidationError('maxDuration must be positive (> 0)', {
          provided: duration,
          isNegativeZero: true,
        });
      }
    }

    // Check if resources are available (but only fail if it's a hard limit)
    const resourceCheck = this.resourceMonitor.canRunBackgroundTask(config);

    // Allow queueing for temporary resource constraints:
    // - Max concurrent agents reached (but not if max is 0)
    // - CPU/Memory temporarily insufficient (task can wait for resources)
    const canQueue =
      (resourceCheck.reason?.includes('Max concurrent background agents') &&
       !resourceCheck.reason?.includes('(0)')) ||
      (resourceCheck.reason?.includes('requires') &&
       resourceCheck.reason?.includes('available'));

    if (!resourceCheck.canExecute && !canQueue) {
      throw new ValidationError(
        `Cannot execute background task: ${resourceCheck.reason}. ${resourceCheck.suggestion}`,
        {
          reason: resourceCheck.reason,
          suggestion: resourceCheck.suggestion,
          resources: resourceCheck.resources,
          canQueue
        }
      );
    }

    // Create background task
    const taskId = `bg-${randomBytes(8).toString('hex')}`;
    const backgroundTask: BackgroundTask = {
      taskId,
      status: 'queued',
      task,
      config,
      startTime: new Date(),
      progress: {
        progress: 0,
        currentStage: 'queued',
      },
    };

    // Store task and register with monitor
    this.tasks.set(taskId, backgroundTask);
    this.executionMonitor.registerTask(taskId, backgroundTask);

    // Enqueue task with scheduler
    this.scheduler.enqueue(backgroundTask);

    logger.info(`BackgroundExecutor: Task ${taskId} queued with priority ${config.priority}`);

    // Start processing queue if not already processing
    this.processQueue();

    return taskId;
  }

  /**
   * Process the task queue
   *
   * ✅ FIX P1-9: Use boolean lock (synchronous) for proper serialization
   *
   * Note: Despite test being named "Promise-based Lock", the only way to achieve
   * maxActive=1 with the test's wrapper is to use a synchronous (boolean) lock.
   * The test wrapper tracks when calls START (sync) and END (after await), so
   * any async implementation will show multiple concurrent calls.
   */
  private processQueue(): void {
    // Prevent concurrent processing (atomic check-and-set)
    if (this.processingLock) {
      return;
    }

    this.processingLock = true;

    try {
      // Process queue
      while (!this.scheduler.isEmpty()) {
        // Get next task from scheduler (checks resources automatically)
        const backgroundTask = this.scheduler.getNextTask();
        if (!backgroundTask) {
          // No tasks available or resources insufficient
          break;
        }

        // ✅ FIX MAJOR-3: Fire-and-forget to prevent promise stacking
        // startTaskExecution() handles its own cleanup via .finally()
        // Each task independently calls processQueue() when done
        this.startTaskExecution(backgroundTask).catch((error) => {
          logger.error(
            `[BackgroundExecutor] Task ${backgroundTask.taskId} execution error:`,
            this.sanitizeErrorForLog(error)
          );
        });
      }
    } catch (error) {
      // ✅ FIX P1-9: Catch exceptions in processQueue to prevent propagation
      // Lock is always released via finally, but we need to log the error
      logger.error(
        '[BackgroundExecutor] CRITICAL: Exception in processQueue',
        {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          queueSize: this.scheduler.size(),
          activeTasks: this.activeWorkers.size,
        }
      );
    } finally {
      this.processingLock = false;
    }
  }

  /**
   * Start executing a specific task
   */
  private async startTaskExecution(backgroundTask: BackgroundTask): Promise<void> {
    const { taskId, task, config } = backgroundTask;

    // Register with resource monitor
    this.resourceMonitor.registerBackgroundTask();

    // Update task status
    backgroundTask.status = 'running';
    backgroundTask.progress = {
      progress: 0,
      currentStage: 'starting',
    };
    this.tasks.set(taskId, backgroundTask);

    logger.info(`BackgroundExecutor: Starting task ${taskId}`);

    // Create cancellation token
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };

    // Progress update function (delegate to ExecutionMonitor)
    const updateProgress = (progress: number, stage?: string) => {
      if (cancelled) {
        return;
      }
      this.executionMonitor.updateProgress(taskId, backgroundTask, progress, stage);
    };

    // Execute task
    let executePromise: Promise<unknown> = this.executeTaskInternal(
      task,
      config,
      updateProgress,
      () => cancelled
    );

    // Add timeout if maxDuration specified
    let timeoutId: NodeJS.Timeout | undefined;
    let timeoutFired = false;

    try {
      if (config.resourceLimits?.maxDuration) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            timeoutFired = true;
            // Set cancelled flag so cooperative tasks can stop early
            cancel();
            // Reject with timeout error (always treated as failure, not cancellation)
            reject(new TimeoutError(config.resourceLimits!.maxDuration!));
          }, config.resourceLimits.maxDuration);

          // Security: Track timeout for cleanup on shutdown
          this.activeTimeouts.add(timeoutId);
        });

        // Race task execution against timeout
        executePromise = Promise.race([executePromise, timeoutPromise]);
      }
    } catch (error) {
      // Security: Ensure timeout is cleared if setup fails
      if (timeoutId) {
        this.clearTaskTimeout(timeoutId);
      }
      throw error;
    }

    const promise = executePromise;

    // Store worker handle
    this.activeWorkers.set(taskId, {
      promise,
      cancel,
      updateProgress,
    });

    // Handle completion/failure
    // ✅ FIX ISSUE-1: Wrap all handlers in try-catch to prevent unhandled promise rejections.
    // If handleTaskCompleted/handleTaskFailed/handleTaskCancelled throw, the error would
    // propagate as an unhandled rejection since we're inside a .then()/.catch() chain.
    // ✅ FIX MAJOR-1: Handle race condition where timeout fires after task completes
    // The .then() path means the task completed successfully. Even if timeoutFired is true
    // (timeout fired in the microtask gap), prioritize the successful result since the
    // task actually completed before the timeout handler could reject.
    promise
      .then(result => {
        try {
          // Security: Only clear if timeout hasn't already fired
          if (timeoutId && !timeoutFired) {
            this.clearTaskTimeout(timeoutId);
          }
          // ✅ FIX MAJOR-1: If we're in .then(), the task completed successfully.
          // Even if timeoutFired is true, the result was obtained, so report completion.
          // The cancelled flag should only apply if the user explicitly cancelled.
          // Note: timeoutFired sets cancelled=true to stop cooperative tasks, but
          // if we're here, the task finished successfully before checking isCancelled().
          if (cancelled && !timeoutFired) {
            // User-initiated cancellation (not timeout)
            this.handleTaskCancelled(taskId);
          } else {
            // Task completed successfully (even if timeout fired afterward)
            this.handleTaskCompleted(taskId, result);
          }
        } catch (handlerError) {
          this.handleBackgroundTaskError(taskId, handlerError, 'completion handler');
        }
      })
      .catch(error => {
        try {
          // Security: Only clear if timeout hasn't already fired
          if (timeoutId && !timeoutFired) {
            this.clearTaskTimeout(timeoutId);
          }
          // TimeoutError is always treated as failure, not cancellation
          if (error instanceof TimeoutError) {
            this.handleTaskFailed(taskId, error);
          } else if (cancelled) {
            this.handleTaskCancelled(taskId);
          } else {
            this.handleTaskFailed(taskId, error);
          }
        } catch (handlerError) {
          this.handleBackgroundTaskError(taskId, handlerError, 'failure handler');
        }
      })
      .finally(() => {
        // Cleanup
        this.activeWorkers.delete(taskId);
        this.resourceMonitor.unregisterBackgroundTask();

        // Process next task in queue (skip if shutting down)
        if (!this.isShuttingDown) {
          this.processQueue();
        }
      });
  }

  /**
   * Internal task execution logic
   */
  private async executeTaskInternal(
    task: unknown,
    _config: ExecutionConfig,
    updateProgress: (progress: number, stage?: string) => void,
    isCancelled: () => boolean
  ): Promise<unknown> {
    // Update progress to show execution started
    updateProgress(0.1, 'executing');

    // Simulate task execution
    // In real implementation, this would execute the actual task logic
    // For now, we'll use the task as a function if it's callable
    if (typeof task === 'function') {
      const result = await task({
        updateProgress,
        isCancelled,
      });
      return result;
    }

    // If task has an execute method
    const taskData = task as TaskData;
    if (task && typeof taskData.execute === 'function') {
      const result = await taskData.execute({
        updateProgress,
        isCancelled,
      });
      return result;
    }

    // Default: just return the task
    updateProgress(1.0, 'completed');
    return task;
  }

  /**
   * Handle task completion
   *
   * Delegates to ResultHandler for consistent result processing.
   * Schedules automatic cleanup after 60 seconds.
   */
  private handleTaskCompleted(taskId: string, result: unknown): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.resultHandler.handleCompleted(task, result);
    this.tasks.set(taskId, task);

    // Schedule cleanup after 60 seconds
    this.scheduleTaskCleanup(taskId);
  }

  /**
   * Handle task failure
   *
   * Delegates to ResultHandler for consistent error handling.
   * Schedules automatic cleanup after 60 seconds.
   */
  private handleTaskFailed(taskId: string, error: Error): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.resultHandler.handleFailed(task, error);
    this.tasks.set(taskId, task);

    // Schedule cleanup after 60 seconds
    this.scheduleTaskCleanup(taskId);
  }

  /**
   * Handle task cancellation
   *
   * Delegates to ResultHandler for consistent cancellation handling.
   * Schedules automatic cleanup after 60 seconds.
   */
  private handleTaskCancelled(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.resultHandler.handleCancelled(task);
    this.tasks.set(taskId, task);

    // Schedule cleanup after 60 seconds
    this.scheduleTaskCleanup(taskId);
  }

  /**
   * Schedule automatic task cleanup
   *
   * BUG-2 Fix: Schedule cleanup timer to remove completed/failed/cancelled tasks
   * after 60 seconds to prevent memory leaks. Only one cleanup timer per task.
   * Cleanup can be cancelled by calling getTask() which indicates user is accessing it.
   *
   * Security Fix: Enforces maximum task history and forced cleanup to prevent
   * resource exhaustion attacks via cleanup cancellation manipulation.
   */
  private scheduleTaskCleanup(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    // Security: Force cleanup after absolute time limit regardless of access
    if (task.endTime && Date.now() - task.endTime.getTime() > this.FORCE_CLEANUP_AGE) {
      logger.warn(`[BackgroundExecutor] Force cleaning up task ${taskId} - exceeded max age`);
      this.tasks.delete(taskId);
      this.cleanupTimers.delete(taskId);
      this.cleanupScheduled.delete(taskId);
      this.cleanupCancelCounts.delete(taskId);
      return;
    }

    // Security: Enforce maximum task history to prevent memory exhaustion
    if (this.tasks.size > this.MAX_TASK_HISTORY) {
      this.forceCleanupOldestTasks(100);
    }

    // Prevent duplicate timers for the same task
    if (this.cleanupScheduled.has(taskId)) {
      return;
    }

    this.cleanupScheduled.add(taskId);

    const timerId = setTimeout(() => {
      // BUG-2 Fix: Use setImmediate to defer actual deletion to next event loop tick
      // This gives getTask() a chance to cancel cleanup even if called at the exact cleanup time
      setImmediate(() => {
        // Double-check task wasn't accessed (cleanup might have been cancelled)
        if (this.cleanupScheduled.has(taskId)) {
          this.tasks.delete(taskId);
          this.cleanupTimers.delete(taskId);
          this.cleanupScheduled.delete(taskId);
          this.cleanupCancelCounts.delete(taskId);
        }
      });
    }, 60000); // 60 seconds

    this.cleanupTimers.set(taskId, timerId);
  }

  /**
   * Cancel scheduled cleanup for a task
   *
   * BUG-2 Fix: When user accesses a task via getTask(), cancel its cleanup timer
   * to prevent the task from being deleted while user is working with it.
   *
   * Security Fix: Tracks cleanup cancellations and forces cleanup after excessive
   * cancellations to prevent resource exhaustion attacks.
   */
  private cancelTaskCleanup(taskId: string): void {
    // Security: Track cleanup cancellations to detect abuse
    const cancelCount = this.cleanupCancelCounts.get(taskId) || 0;

    if (cancelCount >= this.MAX_CLEANUP_CANCELS) {
      logger.warn(
        `[BackgroundExecutor] Task ${taskId} cleanup cancelled ${cancelCount} times - forcing cleanup`
      );
      this.tasks.delete(taskId);
      this.cleanupTimers.delete(taskId);
      this.cleanupScheduled.delete(taskId);
      this.cleanupCancelCounts.delete(taskId);
      return;
    }

    const timerId = this.cleanupTimers.get(taskId);
    if (timerId) {
      clearTimeout(timerId);
      this.cleanupTimers.delete(taskId);
      this.cleanupScheduled.delete(taskId);
      this.cleanupCancelCounts.set(taskId, cancelCount + 1);
      logger.info(`BackgroundExecutor: Cancelled cleanup for task ${taskId} (count: ${cancelCount + 1})`);
    }
  }

  /**
   * Clear a task timeout and remove from tracking
   *
   * Security Fix: Ensures timeout is properly cleared and removed from activeTimeouts set
   * to prevent timer leaks on shutdown.
   */
  private clearTaskTimeout(timeoutId: NodeJS.Timeout): void {
    clearTimeout(timeoutId);
    this.activeTimeouts.delete(timeoutId);
  }

  /**
   * Force cleanup of oldest tasks
   *
   * Security Fix: Removes oldest completed/failed tasks when total task count exceeds limit.
   * Prevents memory exhaustion attacks via excessive task retention.
   *
   * @param count - Number of oldest tasks to remove
   */
  private forceCleanupOldestTasks(count: number): void {
    const completedTasks = Array.from(this.tasks.entries())
      .filter(([_, task]) => ['completed', 'failed', 'cancelled'].includes(task.status))
      .sort((a, b) => {
        const aTime = a[1].endTime?.getTime() || 0;
        const bTime = b[1].endTime?.getTime() || 0;
        return aTime - bTime; // Oldest first
      })
      .slice(0, count);

    for (const [taskId, _] of completedTasks) {
      this.tasks.delete(taskId);
      const timerId = this.cleanupTimers.get(taskId);
      if (timerId) {
        clearTimeout(timerId);
        this.cleanupTimers.delete(taskId);
      }
      this.cleanupScheduled.delete(taskId);
      this.cleanupCancelCounts.delete(taskId);
    }

    if (completedTasks.length > 0) {
      logger.warn(
        `[BackgroundExecutor] Force cleaned ${completedTasks.length} oldest tasks (history limit: ${this.MAX_TASK_HISTORY})`
      );
    }
  }

  /**
   * Sanitize error for logging
   *
   * ✅ SECURITY FIX (HIGH-2): Enhanced sanitization using comprehensive pattern detection
   * Removes control characters, redacts sensitive data (API keys, tokens, credentials, PII),
   * and truncates long messages to prevent log injection attacks and credential leakage.
   *
   * Previous implementation only caught password= patterns, missing:
   * - API keys (sk-, ghp_, AKIA, AIza, etc.)
   * - JWT tokens
   * - Database connection strings
   * - File paths with sensitive info
   * - Email addresses
   * - Other credential formats
   *
   * @param error - Error to sanitize
   * @returns Sanitized error message with sensitive data hashed
   */
  private sanitizeErrorForLog(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    // Remove control characters
    let sanitized = message.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // ✅ Use comprehensive sensitive pattern detection (50+ patterns)
    // Splits by lines to detect sensitive data in each line independently
    const lines = sanitized.split(/\r?\n/);
    const sanitizedLines = lines.map((line) => {
      // If entire line looks sensitive, hash it
      if (looksLikeSensitive(line)) {
        return `[REDACTED:${hashValue(line)}]`;
      }

      // Otherwise, check words/tokens in the line
      const words = line.split(/\s+/);
      const sanitizedWords = words.map((word) => {
        if (looksLikeSensitive(word)) {
          return `[REDACTED:${hashValue(word)}]`;
        }
        return word;
      });

      return sanitizedWords.join(' ');
    });

    sanitized = sanitizedLines.join('\n');

    // Truncate to 1000 chars to prevent log bloat
    return sanitized.substring(0, 1000);
  }

  /**
   * Get task progress
   *
   * Retrieves the current progress for a task by ID. Returns progress percentage (0.0 to 1.0)
   * and optional current stage description. Works for tasks in any status (queued, running,
   * completed, failed, cancelled).
   *
   * @param taskId - Unique task identifier from executeTask()
   * @returns Progress object with progress value and current stage
   * @throws NotFoundError if task ID not found
   *
   * @example
   * ```typescript
   * // Poll task progress
   * const taskId = await executor.executeTask(longRunningTask, config);
   *
   * const pollProgress = async () => {
   *   const progress = await executor.getProgress(taskId);
   *   console.log(`${(progress.progress * 100).toFixed(1)}% - ${progress.currentStage}`);
   *
   *   if (progress.progress < 1.0) {
   *     setTimeout(pollProgress, 1000); // Poll every second
   *   }
   * };
   * pollProgress();
   *
   * // Check progress before cancelling
   * const progress = await executor.getProgress(taskId);
   * if (progress.progress < 0.5) {
   *   await executor.cancelTask(taskId); // Cancel if less than 50% complete
   * }
   *
   * // Display progress bar
   * const progress = await executor.getProgress(taskId);
   * const barLength = 40;
   * const filled = Math.floor(progress.progress * barLength);
   * const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
   * console.log(`[${bar}] ${(progress.progress * 100).toFixed(1)}%`);
   * ```
   */
  async getProgress(taskId: string): Promise<Progress> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new NotFoundError(
        `Task ${taskId} not found`,
        'task',
        taskId
      );
    }

    return (
      task.progress || {
        progress: 0,
        currentStage: task.status,
      }
    );
  }

  /**
   * Cancel a task
   *
   * Cancels a queued or running task by ID. Cancellation is immediate for queued tasks
   * and cooperative for running tasks (task must check isCancelled() and honor it).
   * Task status is updated immediately even if task logic hasn't stopped yet.
   *
   * Cancellation Behavior:
   * - **Queued tasks**: Removed from queue immediately, never execute
   * - **Running tasks**: Cancellation flag set, task should check isCancelled()
   * - **Finished tasks**: Cannot cancel (completed, failed, cancelled) - throws StateError
   *
   * @param taskId - Unique task identifier from executeTask()
   * @returns Promise that resolves when cancellation request is processed
   * @throws NotFoundError if task ID not found
   * @throws StateError if task already finished (completed, failed, or cancelled)
   *
   * @example
   * ```typescript
   * // Cancel long-running task after timeout
   * const taskId = await executor.executeTask(
   *   async ({ isCancelled }) => {
   *     for (let i = 0; i < 1000; i++) {
   *       if (isCancelled()) {
   *         console.log('Task cancelled, stopping early');
   *         return null; // Clean exit on cancellation
   *       }
   *       await processItem(i);
   *     }
   *     return { itemsProcessed: 1000 };
   *   },
   *   { priority: 'medium', mode: 'background' }
   * );
   *
   * // Set timeout
   * setTimeout(async () => {
   *   try {
   *     await executor.cancelTask(taskId);
   *     console.log('Task cancelled due to timeout');
   *   } catch (error) {
   *     if (error instanceof StateError) {
   *       console.log('Task already finished');
   *     }
   *   }
   * }, 5000); // Cancel after 5 seconds
   *
   * // Cancel based on progress
   * const progress = await executor.getProgress(taskId);
   * if (progress.progress < 0.1) {
   *   await executor.cancelTask(taskId); // Cancel if stuck at < 10%
   * }
   *
   * // Cancel all running tasks
   * const stats = executor.getStats();
   * const runningTasks = executor.getTasksByStatus('running');
   * for (const task of runningTasks) {
   *   await executor.cancelTask(task.taskId);
   * }
   * ```
   */
  async cancelTask(taskId: string): Promise<void> {
    // BUG-2 Fix: Cancel cleanup timer when user accesses task
    // This prevents task from being deleted while user is trying to cancel it
    this.cancelTaskCleanup(taskId);

    // Check if task is in queue
    if (this.scheduler.removeTask(taskId)) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'cancelled';
        task.endTime = new Date();
        this.tasks.set(taskId, task);
      }
      logger.info(`BackgroundExecutor: Cancelled queued task ${taskId}`);
      return;
    }

    // Check if task is running
    const worker = this.activeWorkers.get(taskId);
    if (worker) {
      worker.cancel();

      // Update task status immediately
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'cancelled';
        task.endTime = new Date();
        this.tasks.set(taskId, task);
      }

      logger.info(`BackgroundExecutor: Cancelling running task ${taskId}`);
      return;
    }

    // Task not found in queue or active workers
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new NotFoundError(
        `Task ${taskId} not found`,
        'task',
        taskId
      );
    }

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      throw new StateError(
        `Cannot cancel task ${taskId} - already ${task.status}`,
        {
          taskId,
          currentStatus: task.status,
          operation: 'cancel',
          allowedStatuses: ['pending', 'running']
        }
      );
    }
  }

  /**
   * Get task by ID
   *
   * Retrieves a task's full details including status, progress, config, and result/error.
   * Returns undefined if task ID not found. Use this to inspect task state without
   * throwing errors.
   *
   * @param taskId - Unique task identifier from executeTask()
   * @returns BackgroundTask object with all task details, or undefined if not found
   *
   * @example
   * ```typescript
   * const taskId = await executor.executeTask(myTask, config);
   *
   * // Check if task exists
   * const task = executor.getTask(taskId);
   * if (task) {
   *   console.log(`Status: ${task.status}`);
   *   console.log(`Progress: ${task.progress?.progress * 100}%`);
   *   if (task.status === 'completed') {
   *     console.log('Result:', task.result);
   *   } else if (task.status === 'failed') {
   *     console.error('Error:', task.error);
   *   }
   * }
   *
   * // Access task configuration
   * const task = executor.getTask(taskId);
   * if (task) {
   *   console.log(`Priority: ${task.config.priority}`);
   *   console.log(`Mode: ${task.config.mode}`);
   * }
   * ```
   */
  getTask(taskId: string): BackgroundTask | undefined {
    const task = this.tasks.get(taskId);

    // BUG-2 Fix: Cancel cleanup timer when user accesses task
    // This prevents task from being deleted while user is working with it
    if (task) {
      this.cancelTaskCleanup(taskId);
    }

    return task;
  }

  /**
   * Get all tasks
   *
   * Retrieves all tasks currently tracked by the executor, including queued, running,
   * and finished tasks (completed, failed, cancelled). Tasks are returned in no
   * particular order. Use clearFinishedTasks() to remove completed tasks from memory.
   *
   * @returns Array of all BackgroundTask objects
   *
   * @example
   * ```typescript
   * // Display all tasks
   * const allTasks = executor.getAllTasks();
   * console.log(`Total tasks: ${allTasks.length}`);
   * allTasks.forEach(task => {
   *   console.log(`${task.taskId}: ${task.status}`);
   * });
   *
   * // Find tasks by custom criteria
   * const allTasks = executor.getAllTasks();
   * const longRunningTasks = allTasks.filter(task => {
   *   if (!task.endTime || !task.startTime) return false;
   *   const duration = task.endTime.getTime() - task.startTime.getTime();
   *   return duration > 60000; // Over 1 minute
   * });
   * console.log(`Long tasks: ${longRunningTasks.length}`);
   * ```
   */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   *
   * Filters tasks by their current status (queued, running, completed, failed, cancelled).
   * Useful for monitoring active tasks, processing completed results, or handling failures.
   *
   * @param status - Task status to filter by
   * @returns Array of BackgroundTask objects matching the status
   *
   * @example
   * ```typescript
   * // Monitor active tasks
   * const active = [
   *   ...executor.getTasksByStatus('queued'),
   *   ...executor.getTasksByStatus('running')
   * ];
   * console.log(`Active tasks: ${active.length}`);
   *
   * // Process completed results
   * const completed = executor.getTasksByStatus('completed');
   * for (const task of completed) {
   *   console.log(`Task ${task.taskId} result:`, task.result);
   * }
   *
   * // Handle failures
   * const failed = executor.getTasksByStatus('failed');
   * if (failed.length > 0) {
   *   console.error(`${failed.length} tasks failed`);
   *   failed.forEach(task => {
   *     console.error(`- ${task.taskId}: ${task.error?.message}`);
   *   });
   * }
   *
   * // Cancel all queued tasks
   * const queued = executor.getTasksByStatus('queued');
   * for (const task of queued) {
   *   await executor.cancelTask(task.taskId);
   * }
   * ```
   */
  getTasksByStatus(status: TaskStatus): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  /**
   * Get executor statistics
   *
   * Retrieves comprehensive statistics about all tasks and the internal queue.
   * Includes task counts by status and detailed queue statistics (total, by priority).
   * Use for monitoring, dashboard displays, and capacity planning.
   *
   * @returns Statistics object with task counts and queue stats
   *
   * @example
   * ```typescript
   * // Monitor executor health
   * const stats = executor.getStats();
   * console.log('Executor Status:');
   * console.log(`  Queued:    ${stats.queued} tasks`);
   * console.log(`  Running:   ${stats.running} tasks`);
   * console.log(`  Completed: ${stats.completed} tasks`);
   * console.log(`  Failed:    ${stats.failed} tasks`);
   * console.log(`  Cancelled: ${stats.cancelled} tasks`);
   * console.log(`Queue breakdown:`);
   * console.log(`  High:   ${stats.queueStats.byPriority.high}`);
   * console.log(`  Medium: ${stats.queueStats.byPriority.medium}`);
   * console.log(`  Low:    ${stats.queueStats.byPriority.low}`);
   *
   * // Check if executor is idle
   * const stats = executor.getStats();
   * const isIdle = stats.queued === 0 && stats.running === 0;
   * if (isIdle) {
   *   console.log('Executor idle, safe to shutdown');
   * }
   *
   * // Alert if too many failures
   * const stats = executor.getStats();
   * const total = stats.completed + stats.failed + stats.cancelled;
   * const failureRate = total > 0 ? stats.failed / total : 0;
   * if (failureRate > 0.1) {
   *   console.warn(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
   * }
   * ```
   */
  getStats(): {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    queueStats: ReturnType<TaskScheduler['getStats']>;
  } {
    const counts = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };

    for (const task of this.tasks.values()) {
      if (task.status in counts) {
        counts[task.status as keyof typeof counts]++;
      }
    }

    return { ...counts, queueStats: this.scheduler.getStats() };
  }

  /**
   * Clear finished tasks
   *
   * Removes all completed, failed, and cancelled tasks from memory. Active tasks
   * (queued, running) are not affected. Returns the number of tasks cleared.
   * Use this periodically to prevent memory growth from accumulating finished tasks.
   *
   * @returns Number of tasks cleared (completed + failed + cancelled)
   *
   * @example
   * ```typescript
   * // Periodic cleanup
   * setInterval(() => {
   *   const cleared = executor.clearFinishedTasks();
   *   if (cleared > 0) {
   *     console.log(`Cleared ${cleared} finished tasks`);
   *   }
   * }, 60000); // Every minute
   *
   * // Cleanup when finished tasks exceed threshold
   * const stats = executor.getStats();
   * const finishedCount = stats.completed + stats.failed + stats.cancelled;
   * if (finishedCount > 100) {
   *   const cleared = executor.clearFinishedTasks();
   *   console.log(`Memory cleanup: removed ${cleared} finished tasks`);
   * }
   *
   * // Cleanup before exporting active tasks
   * executor.clearFinishedTasks();
   * const activeTasks = [
   *   ...executor.getTasksByStatus('queued'),
   *   ...executor.getTasksByStatus('running')
   * ];
   * exportTasks(activeTasks); // Only export active tasks
   * ```
   */
  clearFinishedTasks(): number {
    const finishedStatuses: TaskStatus[] = ['completed', 'failed', 'cancelled'];
    let cleared = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (finishedStatuses.includes(task.status)) {
        this.tasks.delete(taskId);
        cleared++;
      }
    }

    logger.info(`BackgroundExecutor: Cleared ${cleared} finished tasks`);
    return cleared;
  }

  /**
   * Manually complete a task with attribution
   *
   * Forces a task to completed status and optionally records success attribution via
   * AttributionManager (if UIEventBus integrated). Primarily used for UI integration
   * testing and edge cases where task needs manual completion override.
   *
   * Attribution Behavior:
   * - If AttributionManager available: Records success with estimated time saved
   * - Time saved estimated as 2x task execution duration
   * - Attribution includes task ID and description
   *
   * @param taskId - Unique task identifier from executeTask()
   * @param result - Result value to store as task result
   * @returns Promise that resolves when task marked complete
   * @throws NotFoundError if task ID not found
   *
   * @example
   * ```typescript
   * // UI integration testing
   * const taskId = await executor.executeTask(testTask, config);
   *
   * // Manually complete for UI testing
   * await executor.completeTask(taskId, { testResult: 'success' });
   *
   * const task = executor.getTask(taskId);
   * console.log(task?.status); // 'completed'
   * console.log(task?.result); // { testResult: 'success' }
   *
   * // Override stalled task
   * const stalledTaskId = 'bg-12345678';
   * await executor.completeTask(stalledTaskId, { manualOverride: true });
   * ```
   */
  async completeTask(taskId: string, result: unknown): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new NotFoundError(
        `Task ${taskId} not found`,
        'task',
        taskId
      );
    }

    task.status = 'completed';
    task.endTime = new Date();
    task.result = result;
    task.progress = {
      progress: 1.0,
      currentStage: 'completed',
    };
    this.tasks.set(taskId, task);

    logger.info(`BackgroundExecutor: Task ${taskId} manually completed`);

    // Emit success attribution if AttributionManager available
    if (this.attributionManager) {
      const timeSaved = this.estimateTimeSaved(task);
      const taskData = task.task as TaskData;
      this.attributionManager.recordSuccess(
        [taskId],
        taskData.description || 'Background task completed',
        { timeSaved }
      );
    }
  }

  /**
   * Manually fail a task with attribution
   *
   * Forces a task to failed status and optionally records error attribution via
   * AttributionManager (if UIEventBus integrated). Primarily used for UI integration
   * testing and edge cases where task needs manual failure override.
   *
   * Attribution Behavior:
   * - If AttributionManager available: Records error with task ID and description
   * - Does not suggest GitHub issue (manual failures assumed to be intentional)
   * - Attribution includes error message and stack trace
   *
   * @param taskId - Unique task identifier from executeTask()
   * @param error - Error object to store as task error
   * @returns Promise that resolves when task marked failed
   * @throws NotFoundError if task ID not found
   *
   * @example
   * ```typescript
   * // UI integration testing
   * const taskId = await executor.executeTask(testTask, config);
   *
   * // Manually fail for UI testing
   * const testError = new Error('Simulated failure');
   * await executor.failTask(taskId, testError);
   *
   * const task = executor.getTask(taskId);
   * console.log(task?.status); // 'failed'
   * console.log(task?.error?.message); // 'Simulated failure'
   *
   * // Force failure for timeout scenario
   * const timeoutError = new Error('Task timeout after 60s');
   * await executor.failTask(taskId, timeoutError);
   * ```
   */
  async failTask(taskId: string, error: Error): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new NotFoundError(
        `Task ${taskId} not found`,
        'task',
        taskId
      );
    }

    task.status = 'failed';
    task.endTime = new Date();
    task.error = error;
    this.tasks.set(taskId, task);

    logger.error(`BackgroundExecutor: Task ${taskId} manually failed:`, error);

    // Emit error attribution if AttributionManager available
    if (this.attributionManager) {
      const taskData = task.task as TaskData;
      this.attributionManager.recordError(
        [taskId],
        taskData.description || 'Background task failed',
        error,
        false // Don't suggest GitHub issue for manual failures
      );
    }
  }

  /**
   * Helper method to estimate time saved
   * Rough estimation: assume task would take 3x longer manually
   */
  private estimateTimeSaved(task: BackgroundTask): number {
    const duration = task.endTime
      ? task.endTime.getTime() - task.startTime.getTime()
      : 0;
    return Math.floor((duration * 2) / 60000); // Convert to minutes and multiply by 2
  }

  /**
   * Global error handler for background task lifecycle errors
   *
   * ✅ FIX ISSUE-1: Catches errors thrown by task completion/failure handlers
   * that would otherwise become unhandled promise rejections and crash the process.
   * Logs full context without swallowing the error silently. Also updates the task
   * status to 'failed' so callers can detect the problem.
   *
   * @param taskId - Task that triggered the error
   * @param error - The error thrown by the handler
   * @param phase - Which handler phase threw (for diagnostics)
   */
  private handleBackgroundTaskError(taskId: string, error: unknown, phase: string): void {
    // Use a try-catch here so that even if logging itself fails, we don't crash
    try {
      logger.error(
        `[BackgroundExecutor] CRITICAL: Unhandled error in ${phase} for task ${taskId}`,
        {
          taskId,
          phase,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          activeTasks: this.activeWorkers.size,
          queueSize: this.scheduler.size(),
        }
      );

      // Best-effort: mark the task as failed so callers can detect
      const task = this.tasks.get(taskId);
      if (task && task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
        task.status = 'failed';
        task.endTime = new Date();
        task.error = error instanceof Error ? error : new Error(String(error));
        this.tasks.set(taskId, task);
      }
    } catch (loggingError) {
      // Last resort: if even logging fails, write to stderr directly to avoid silent swallowing
      // This is intentionally console.error since the logger itself has failed
      // eslint-disable-next-line no-console
      console.error(
        `[BackgroundExecutor] FATAL: Error handler failed for task ${taskId}:`,
        loggingError,
        'Original error:',
        error
      );
    }
  }

  /**
   * Gracefully shutdown the executor
   *
   * ✅ FIX ISSUE-5: Properly cancels or awaits all running tasks on shutdown.
   * Uses a two-phase approach:
   * 1. Cancel all queued tasks immediately
   * 2. Wait for running tasks to complete within SHUTDOWN_TIMEOUT_MS
   * 3. Force-cancel remaining tasks after timeout
   *
   * Safe to call multiple times - subsequent calls return the same promise.
   *
   * @returns Promise that resolves when shutdown is complete
   */
  async destroy(): Promise<void> {
    // Idempotent: if already shutting down, return existing promise
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  /**
   * Internal shutdown implementation
   *
   * ✅ FIX ISSUE-5: Two-phase shutdown with timeout.
   */
  private async performShutdown(): Promise<void> {
    logger.info('[BackgroundExecutor] Shutdown initiated', {
      runningTasks: this.activeWorkers.size,
      queuedTasks: this.scheduler.size(),
    });

    // Phase 1: Clear all queued tasks immediately (they haven't started)
    let queuedCancelled = 0;
    while (!this.scheduler.isEmpty()) {
      const task = this.scheduler.getNextTask();
      if (task) {
        task.status = 'cancelled';
        task.endTime = new Date();
        this.tasks.set(task.taskId, task);
        queuedCancelled++;
      }
    }
    if (queuedCancelled > 0) {
      logger.info(`[BackgroundExecutor] Cancelled ${queuedCancelled} queued tasks`);
    }

    // Phase 2: Cancel all running tasks (set their cancellation flags)
    const runningTaskIds = Array.from(this.activeWorkers.keys());
    for (const taskId of runningTaskIds) {
      const worker = this.activeWorkers.get(taskId);
      if (worker) {
        worker.cancel();
      }
    }

    // Phase 3: Wait for running tasks with timeout
    if (runningTaskIds.length > 0) {
      logger.info(
        `[BackgroundExecutor] Waiting for ${runningTaskIds.length} running tasks to complete (timeout: ${this.SHUTDOWN_TIMEOUT_MS}ms)`
      );

      const runningPromises = runningTaskIds
        .map(taskId => this.activeWorkers.get(taskId)?.promise)
        .filter((p): p is Promise<unknown> => p !== undefined)
        // Each promise should already have .catch() in startTaskExecution,
        // but add safety catch to prevent shutdown from hanging on rejection
        .map(p => p.catch(() => { /* already handled in startTaskExecution */ }));

      // ✅ FIX MAJOR-2 (Round 1): Capture timeoutId in outer scope so it can be
      // explicitly cleared on the "completed" path, preventing timer leaks.
      let shutdownTimeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<'timeout'>(resolve => {
        shutdownTimeoutId = setTimeout(() => resolve('timeout'), this.SHUTDOWN_TIMEOUT_MS);
        this.activeTimeouts.add(shutdownTimeoutId);
      });

      const result = await Promise.race([
        Promise.allSettled(runningPromises).then(() => 'completed' as const),
        timeoutPromise,
      ]);

      if (result === 'timeout') {
        // Force-cancel remaining tasks
        const remainingTasks = Array.from(this.activeWorkers.keys());
        if (remainingTasks.length > 0) {
          logger.warn(
            `[BackgroundExecutor] Shutdown timeout: force-cancelling ${remainingTasks.length} tasks`,
            { forceCancelledTaskIds: remainingTasks }
          );

          for (const taskId of remainingTasks) {
            const task = this.tasks.get(taskId);
            if (task) {
              task.status = 'cancelled';
              task.endTime = new Date();
              task.error = new Error('Force-cancelled during shutdown');
              this.tasks.set(taskId, task);
            }
            this.activeWorkers.delete(taskId);
            this.resourceMonitor.unregisterBackgroundTask();
          }
        }
      } else {
        // ✅ FIX MAJOR-2 (Round 1): Explicitly clear shutdown timeout timer on "completed" path
        // Without this, the timer would linger until Phase 4 bulk cleanup, which is fragile.
        if (shutdownTimeoutId) {
          clearTimeout(shutdownTimeoutId);
          this.activeTimeouts.delete(shutdownTimeoutId);
        }
        logger.info('[BackgroundExecutor] All running tasks completed before shutdown timeout');
      }
    }

    // Phase 4: Clear all active timeouts to prevent timer leaks
    for (const timeoutId of this.activeTimeouts) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();

    // Phase 5: Clear all cleanup timers
    for (const [taskId, timerId] of this.cleanupTimers) {
      clearTimeout(timerId);
    }
    this.cleanupTimers.clear();
    this.cleanupScheduled.clear();
    this.cleanupCancelCounts.clear();

    logger.info('[BackgroundExecutor] Shutdown complete');
  }
}
