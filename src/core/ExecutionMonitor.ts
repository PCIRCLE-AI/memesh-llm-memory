/**
 * Execution Monitor
 *
 * Handles task monitoring, progress tracking, and status updates for background tasks.
 * Separated from BackgroundExecutor to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Track task progress (0.0 to 1.0 with stage descriptions)
 * - Update task status (queued, running, completed, failed, cancelled)
 * - Emit progress events via UIEventBus
 * - Collect execution statistics
 * - Record attributions for completed/failed tasks
 *
 * @example
 * ```typescript
 * import { ExecutionMonitor } from './ExecutionMonitor.js';
 * import { UIEventBus } from '../ui/UIEventBus.js';
 *
 * const eventBus = new UIEventBus();
 * const monitor = new ExecutionMonitor(eventBus);
 *
 * // Update progress
 * monitor.updateProgress(taskId, task, 0.5, 'processing');
 *
 * // Handle completion
 * monitor.handleTaskCompleted(taskId, task, result);
 *
 * // Get statistics
 * const stats = monitor.getStats();
 * console.log(`Running: ${stats.running}, Completed: ${stats.completed}`);
 * ```
 */

import { BackgroundTask, Progress } from './types.js';
import { UIEventBus } from '../ui/UIEventBus.js';
import { AttributionManager } from '../ui/AttributionManager.js';
import { logger } from '../utils/logger.js';

/**
 * Task data structure (same as BackgroundExecutor)
 */
interface TaskData {
  description?: string;
  execute?: (context: {
    updateProgress: (progress: number, stage?: string) => void;
    isCancelled: () => boolean;
  }) => Promise<unknown>;
  [key: string]: unknown;
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * ExecutionMonitor Class
 *
 * Monitors and tracks execution progress, status, and statistics for background tasks.
 * Provides progress updates via UIEventBus and maintains execution metrics.
 *
 * Architecture:
 * - **Progress Tracking**: Updates task progress (0.0 to 1.0) with optional stage info
 * - **Status Management**: Tracks task lifecycle (queued → running → completed/failed/cancelled)
 * - **Event Emission**: Integrates with UIEventBus for real-time progress updates
 * - **Attribution**: Records success/error attributions via AttributionManager
 * - **Statistics**: Collects execution metrics by status
 *
 * Thread Safety:
 * - All updates are synchronous and immediate
 * - Tasks Map is the single source of truth for task state
 *
 * @example
 * ```typescript
 * // Create monitor with UI integration
 * const uiEventBus = new UIEventBus();
 * const monitor = new ExecutionMonitor(uiEventBus);
 *
 * // Track progress
 * const updateFn = monitor.createProgressUpdater(taskId, task);
 * updateFn(0.5, 'halfway done');
 *
 * // Handle completion
 * monitor.handleTaskCompleted(taskId, task, { success: true });
 *
 * // Get statistics
 * const stats = monitor.getStats();
 * console.log(`${stats.running} running, ${stats.completed} completed`);
 * ```
 */
export class ExecutionMonitor {
  private tasks: Map<string, BackgroundTask>;
  private eventBus?: UIEventBus;
  private attributionManager?: AttributionManager;

  /**
   * Create a new ExecutionMonitor
   *
   * Initializes the monitor with optional UIEventBus integration for progress events
   * and attribution tracking.
   *
   * @param eventBus - Optional UIEventBus for progress updates and attribution events
   *
   * @example
   * ```typescript
   * // Basic monitor (no UI integration)
   * const monitor = new ExecutionMonitor();
   *
   * // With UI integration
   * const uiEventBus = new UIEventBus();
   * const monitor = new ExecutionMonitor(uiEventBus);
   * // AttributionManager automatically created for success/error tracking
   * ```
   */
  constructor(eventBus?: UIEventBus) {
    this.tasks = new Map();
    this.eventBus = eventBus;

    // Create AttributionManager if UIEventBus provided
    if (this.eventBus) {
      this.attributionManager = new AttributionManager(this.eventBus);
    }
  }

  /**
   * Register a new task for monitoring
   *
   * Adds a task to the monitoring system. Must be called before any progress updates.
   *
   * @param taskId - Unique task identifier
   * @param task - BackgroundTask object to monitor
   */
  registerTask(taskId: string, task: BackgroundTask): void {
    this.tasks.set(taskId, task);
  }

  /**
   * Unregister a task from monitoring
   *
   * Removes a task from the monitoring system. Typically called after task completion
   * or during cleanup.
   *
   * @param taskId - Unique task identifier
   */
  unregisterTask(taskId: string): void {
    this.tasks.delete(taskId);
  }

  /**
   * Get a task by ID
   *
   * Retrieves the current state of a monitored task.
   *
   * @param taskId - Unique task identifier
   * @returns BackgroundTask object or undefined if not found
   */
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Create a progress updater function for a task
   *
   * Returns a function that can be used to update task progress. This function
   * handles progress normalization (0.0 to 1.0), task state updates, event emission,
   * and callback invocation.
   *
   * @param taskId - Unique task identifier
   * @param task - BackgroundTask object
   * @returns Progress update function
   *
   * @example
   * ```typescript
   * const updateProgress = monitor.createProgressUpdater(taskId, task);
   *
   * // Update to 25% complete
   * updateProgress(0.25, 'loading data');
   *
   * // Update to 75% complete
   * updateProgress(0.75, 'processing');
   *
   * // Mark as complete
   * updateProgress(1.0, 'completed');
   * ```
   */
  createProgressUpdater(
    taskId: string,
    task: BackgroundTask
  ): (progress: number, stage?: string) => void {
    return (progress: number, stage?: string) => {
      this.updateProgress(taskId, task, progress, stage);
    };
  }

  /**
   * Update task progress
   *
   * Updates the progress for a task, normalizes the progress value (0.0 to 1.0),
   * updates the task state, emits UIEventBus events, and calls progress callbacks.
   *
   * @param taskId - Unique task identifier
   * @param task - BackgroundTask object
   * @param progress - Progress value (0.0 to 1.0, will be clamped)
   * @param stage - Optional stage description
   *
   * @example
   * ```typescript
   * // Update to 50% with stage
   * monitor.updateProgress(taskId, task, 0.5, 'processing data');
   *
   * // Update to 100% without stage
   * monitor.updateProgress(taskId, task, 1.0);
   * ```
   */
  updateProgress(
    taskId: string,
    task: BackgroundTask,
    progress: number,
    stage?: string
  ): void {
    // Normalize progress to [0, 1]
    const normalizedProgress = Math.max(0, Math.min(1, progress));

    // Update task progress
    task.progress = {
      progress: normalizedProgress,
      currentStage: stage,
    };
    this.tasks.set(taskId, task);

    // Emit UIEventBus progress event if available
    if (this.eventBus) {
      const taskData = task.task as TaskData;
      this.eventBus.emitProgress({
        agentId: taskId,
        agentType: 'background-executor',
        taskDescription: taskData.description || 'Background task',
        progress: normalizedProgress,
        currentStage: stage,
        startTime: task.startTime,
      });
    }

    // Call progress callback if provided
    task.config.callbacks?.onProgress?.(normalizedProgress);
  }

  /**
   * Handle task completion
   *
   * Marks a task as completed, stores the result, updates timestamps, and records
   * success attribution if AttributionManager is available.
   *
   * @param taskId - Unique task identifier
   * @param task - BackgroundTask object
   * @param result - Task execution result
   *
   * @example
   * ```typescript
   * monitor.handleTaskCompleted(taskId, task, { success: true, data: processedData });
   * ```
   */
  handleTaskCompleted(taskId: string, task: BackgroundTask, result: unknown): void {
    task.status = 'completed';
    task.endTime = new Date();
    task.result = result;
    task.progress = {
      progress: 1.0,
      currentStage: 'completed',
    };
    this.tasks.set(taskId, task);

    logger.info(`ExecutionMonitor: Task ${taskId} completed`);

    // Call completion callback
    task.config.callbacks?.onComplete?.(result);

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
   * Handle task failure
   *
   * Marks a task as failed, stores the error, updates timestamps, and records
   * error attribution if AttributionManager is available.
   *
   * @param taskId - Unique task identifier
   * @param task - BackgroundTask object
   * @param error - Error that caused the failure
   *
   * @example
   * ```typescript
   * monitor.handleTaskFailed(taskId, task, new Error('Processing failed'));
   * ```
   */
  handleTaskFailed(taskId: string, task: BackgroundTask, error: Error): void {
    task.status = 'failed';
    task.endTime = new Date();
    task.error = error;
    this.tasks.set(taskId, task);

    logger.error(`ExecutionMonitor: Task ${taskId} failed:`, error);

    // Call error callback
    task.config.callbacks?.onError?.(error);

    // Emit error attribution if AttributionManager available
    if (this.attributionManager) {
      const taskData = task.task as TaskData;
      this.attributionManager.recordError(
        [taskId],
        taskData.description || 'Background task failed',
        error,
        true // Suggest GitHub issue for actual failures
      );
    }
  }

  /**
   * Handle task cancellation
   *
   * Marks a task as cancelled and updates timestamps.
   *
   * @param taskId - Unique task identifier
   * @param task - BackgroundTask object
   *
   * @example
   * ```typescript
   * monitor.handleTaskCancelled(taskId, task);
   * ```
   */
  handleTaskCancelled(taskId: string, task: BackgroundTask): void {
    task.status = 'cancelled';
    task.endTime = new Date();
    this.tasks.set(taskId, task);

    logger.info(`ExecutionMonitor: Task ${taskId} cancelled`);
  }

  /**
   * Get task progress by ID
   *
   * Retrieves the current progress for a task. Returns progress percentage (0.0 to 1.0)
   * and optional current stage description.
   *
   * @param taskId - Unique task identifier
   * @returns Progress object or null if task not found
   *
   * @example
   * ```typescript
   * const progress = monitor.getProgress(taskId);
   * if (progress) {
   *   console.log(`${(progress.progress * 100).toFixed(1)}% - ${progress.currentStage}`);
   * }
   * ```
   */
  getProgress(taskId: string): Progress | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    return (
      task.progress || {
        progress: 0,
        currentStage: task.status,
      }
    );
  }

  /**
   * Get execution statistics
   *
   * Retrieves comprehensive statistics about monitored tasks by status.
   * Includes counts for queued, running, completed, failed, and cancelled tasks.
   *
   * @returns Statistics object with task counts by status
   *
   * @example
   * ```typescript
   * const stats = monitor.getStats();
   * console.log('Execution Statistics:');
   * console.log(`  Queued:    ${stats.queued}`);
   * console.log(`  Running:   ${stats.running}`);
   * console.log(`  Completed: ${stats.completed}`);
   * console.log(`  Failed:    ${stats.failed}`);
   * console.log(`  Cancelled: ${stats.cancelled}`);
   * ```
   */
  getStats(): ExecutionStats {
    const tasks = Array.from(this.tasks.values());

    return {
      queued: tasks.filter(t => t.status === 'queued').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }

  /**
   * Get all monitored tasks
   *
   * Returns all tasks currently being monitored.
   *
   * @returns Array of all BackgroundTask objects
   */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Clear finished tasks from monitoring
   *
   * Removes all completed, failed, and cancelled tasks from the monitoring system.
   * Returns the number of tasks cleared.
   *
   * @returns Number of tasks cleared
   *
   * @example
   * ```typescript
   * const cleared = monitor.clearFinishedTasks();
   * console.log(`Cleared ${cleared} finished tasks`);
   * ```
   */
  clearFinishedTasks(): number {
    const finishedStatuses = ['completed', 'failed', 'cancelled'] as const;
    let cleared = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (finishedStatuses.includes(task.status as any)) {
        this.tasks.delete(taskId);
        cleared++;
      }
    }

    logger.info(`ExecutionMonitor: Cleared ${cleared} finished tasks`);
    return cleared;
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
