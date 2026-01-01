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
  private processingQueue: boolean = false;
  private eventBus?: UIEventBus;
  private attributionManager?: AttributionManager;
  private resultHandler: ResultHandler;
  private executionMonitor: ExecutionMonitor;

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
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;

    try {
      while (!this.scheduler.isEmpty()) {
        // Get next task from scheduler (checks resources automatically)
        const backgroundTask = this.scheduler.getNextTask();
        if (!backgroundTask) {
          // No tasks available or resources insufficient
          break;
        }

        // Start execution
        await this.startTaskExecution(backgroundTask);
      }
    } finally {
      this.processingQueue = false;
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
    const promise = this.executeTaskInternal(task, config, updateProgress, () => cancelled);

    // Store worker handle
    this.activeWorkers.set(taskId, {
      promise,
      cancel,
      updateProgress,
    });

    // Handle completion/failure
    promise
      .then(result => {
        if (cancelled) {
          this.handleTaskCancelled(taskId);
        } else {
          this.handleTaskCompleted(taskId, result);
        }
      })
      .catch(error => {
        if (cancelled) {
          this.handleTaskCancelled(taskId);
        } else {
          this.handleTaskFailed(taskId, error);
        }
      })
      .finally(() => {
        // Cleanup
        this.activeWorkers.delete(taskId);
        this.resourceMonitor.unregisterBackgroundTask();

        // Process next task in queue
        this.processQueue();
      });
  }

  /**
   * Internal task execution logic
   */
  private async executeTaskInternal(
    task: unknown,
    config: ExecutionConfig,
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
   */
  private handleTaskCompleted(taskId: string, result: unknown): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.resultHandler.handleCompleted(task, result);
    this.tasks.set(taskId, task);
  }

  /**
   * Handle task failure
   *
   * Delegates to ResultHandler for consistent error handling.
   */
  private handleTaskFailed(taskId: string, error: Error): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.resultHandler.handleFailed(task, error);
    this.tasks.set(taskId, task);
  }

  /**
   * Handle task cancellation
   *
   * Delegates to ResultHandler for consistent cancellation handling.
   */
  private handleTaskCancelled(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.resultHandler.handleCancelled(task);
    this.tasks.set(taskId, task);
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
    return this.tasks.get(taskId);
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
    return {
      queued: this.getTasksByStatus('queued').length,
      running: this.getTasksByStatus('running').length,
      completed: this.getTasksByStatus('completed').length,
      failed: this.getTasksByStatus('failed').length,
      cancelled: this.getTasksByStatus('cancelled').length,
      queueStats: this.scheduler.getStats(),
    };
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
}
