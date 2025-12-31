/**
 * BackgroundExecutor - Manages background task execution
 *
 * Features:
 * - Resource-aware task scheduling
 * - Progress tracking
 * - Task cancellation
 * - Asynchronous execution
 */

import { randomBytes } from 'crypto';
import { ResourceMonitor } from './ResourceMonitor.js';
import { ExecutionQueue } from './ExecutionQueue.js';
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

interface WorkerHandle {
  promise: Promise<any>;
  cancel: () => void;
  updateProgress: (progress: number, stage?: string) => void;
}

export class BackgroundExecutor {
  private taskQueue: ExecutionQueue;
  private activeWorkers: Map<string, WorkerHandle>;
  private resourceMonitor: ResourceMonitor;
  private tasks: Map<string, BackgroundTask>;
  private processingQueue: boolean = false;
  private eventBus?: UIEventBus;
  private attributionManager?: AttributionManager;

  constructor(resourceMonitor: ResourceMonitor, eventBus?: UIEventBus) {
    this.taskQueue = new ExecutionQueue();
    this.activeWorkers = new Map();
    this.resourceMonitor = resourceMonitor;
    this.tasks = new Map();
    this.eventBus = eventBus;

    // Create AttributionManager if UIEventBus provided
    if (this.eventBus) {
      this.attributionManager = new AttributionManager(this.eventBus);
    }
  }

  /**
   * Execute a task in background
   * Returns taskId for tracking
   * @param task - Task data (using unknown for type safety - validate before use)
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

    // Store task
    this.tasks.set(taskId, backgroundTask);

    // Enqueue task
    this.taskQueue.enqueue(backgroundTask);

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
      while (!this.taskQueue.isEmpty()) {
        // Check if we can run more tasks
        const resourceCheck = this.resourceMonitor.canRunBackgroundTask();
        if (!resourceCheck.canExecute) {
          logger.warn(
            `BackgroundExecutor: Cannot start new tasks - ${resourceCheck.reason}`
          );
          break;
        }

        // Dequeue next task
        const backgroundTask = this.taskQueue.dequeue();
        if (!backgroundTask) {
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

    // Progress update function
    const updateProgress = (progress: number, stage?: string) => {
      if (cancelled) {
        return;
      }

      const currentTask = this.tasks.get(taskId);
      if (currentTask) {
        currentTask.progress = {
          progress: Math.max(0, Math.min(1, progress)),
          currentStage: stage,
        };
        this.tasks.set(taskId, currentTask);

        // Emit UIEventBus progress event if available
        if (this.eventBus) {
          this.eventBus.emitProgress({
            agentId: taskId,
            agentType: 'background-executor',
            taskDescription: currentTask.task.description || 'Background task',
            progress: Math.max(0, Math.min(1, progress)),
            currentStage: stage,
            startTime: currentTask.startTime,
          });
        }

        // Call progress callback if provided
        config.callbacks?.onProgress?.(progress);
      }
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
    if (task && typeof task.execute === 'function') {
      const result = await task.execute({
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
   */
  private handleTaskCompleted(taskId: string, result: unknown): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    task.status = 'completed';
    task.endTime = new Date();
    task.result = result;
    task.progress = {
      progress: 1.0,
      currentStage: 'completed',
    };
    this.tasks.set(taskId, task);

    logger.info(`BackgroundExecutor: Task ${taskId} completed`);

    // Call completion callback
    task.config.callbacks?.onComplete?.(result);
  }

  /**
   * Handle task failure
   */
  private handleTaskFailed(taskId: string, error: Error): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    task.status = 'failed';
    task.endTime = new Date();
    task.error = error;
    this.tasks.set(taskId, task);

    logger.error(`BackgroundExecutor: Task ${taskId} failed:`, error);

    // Call error callback
    task.config.callbacks?.onError?.(error);
  }

  /**
   * Handle task cancellation
   */
  private handleTaskCancelled(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    task.status = 'cancelled';
    task.endTime = new Date();
    this.tasks.set(taskId, task);

    logger.info(`BackgroundExecutor: Task ${taskId} cancelled`);
  }

  /**
   * Get task progress
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
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<void> {
    // Check if task is in queue
    if (this.taskQueue.remove(taskId)) {
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
   */
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    queueStats: ReturnType<ExecutionQueue['getStats']>;
  } {
    return {
      queued: this.getTasksByStatus('queued').length,
      running: this.getTasksByStatus('running').length,
      completed: this.getTasksByStatus('completed').length,
      failed: this.getTasksByStatus('failed').length,
      cancelled: this.getTasksByStatus('cancelled').length,
      queueStats: this.taskQueue.getStats(),
    };
  }

  /**
   * Clear completed/failed/cancelled tasks
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
   * Used for UI integration testing and manual task completion
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
      this.attributionManager.recordSuccess(
        [taskId],
        task.task.description || 'Background task completed',
        { timeSaved }
      );
    }
  }

  /**
   * Manually fail a task with attribution
   * Used for UI integration testing and manual task failure
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
      this.attributionManager.recordError(
        [taskId],
        task.task.description || 'Background task failed',
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
