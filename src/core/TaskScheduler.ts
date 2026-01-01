/**
 * Task Scheduler - Resource-Aware Task Scheduling
 *
 * Coordinates task queuing, resource checking, and task dispatch for the BackgroundExecutor.
 * Separates scheduling concerns from execution logic, providing a focused interface for
 * managing task lifecycle from queue entry to execution start.
 *
 * Responsibilities:
 * - Task queue management (enqueue, dequeue, remove)
 * - Resource availability checking before dispatch
 * - Priority-based task selection
 * - Queue statistics and monitoring
 *
 * Single Responsibility: Task scheduling and queue coordination.
 *
 * @example
 * ```typescript
 * import { TaskScheduler } from './TaskScheduler.js';
 * import { ResourceMonitor } from './ResourceMonitor.js';
 * import { DEFAULT_EXECUTION_CONFIG } from './types.js';
 *
 * // Create scheduler with resource monitor
 * const resourceMonitor = new ResourceMonitor();
 * const scheduler = new TaskScheduler(resourceMonitor);
 *
 * // Enqueue task
 * const task: BackgroundTask = {
 *   taskId: 'task-1',
 *   status: 'queued',
 *   task: async () => { ... },
 *   config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' },
 *   startTime: new Date()
 * };
 * scheduler.enqueue(task);
 *
 * // Get next task if resources available
 * const nextTask = scheduler.getNextTask();
 * if (nextTask) {
 *   console.log(`Executing ${nextTask.taskId}`);
 * }
 *
 * // Monitor queue
 * const stats = scheduler.getStats();
 * console.log(`Queued: ${stats.total}`);
 * ```
 */

import { ResourceMonitor } from './ResourceMonitor.js';
import { ExecutionQueue } from './ExecutionQueue.js';
import { BackgroundTask, ExecutionConfig } from './types.js';
import { logger } from '../utils/logger.js';

export class TaskScheduler {
  private queue: ExecutionQueue;
  private resourceMonitor: ResourceMonitor;

  /**
   * Create a new TaskScheduler
   *
   * @param resourceMonitor - Resource monitor for checking execution capacity
   *
   * @example
   * ```typescript
   * const resourceMonitor = new ResourceMonitor();
   * const scheduler = new TaskScheduler(resourceMonitor);
   * ```
   */
  constructor(resourceMonitor: ResourceMonitor) {
    this.queue = new ExecutionQueue();
    this.resourceMonitor = resourceMonitor;
  }

  /**
   * Enqueue a task for execution
   *
   * Adds a task to the priority queue. Task will be dispatched when resources are
   * available and it becomes the highest priority task in the queue.
   *
   * @param task - Background task to enqueue
   *
   * @example
   * ```typescript
   * const task: BackgroundTask = {
   *   taskId: 'task-1',
   *   status: 'queued',
   *   task: async () => { return 'result'; },
   *   config: { priority: 'high', mode: 'background' },
   *   startTime: new Date()
   * };
   * scheduler.enqueue(task);
   * ```
   */
  enqueue(task: BackgroundTask): void {
    this.queue.enqueue(task);
    logger.debug(`TaskScheduler: Enqueued task ${task.taskId} with priority ${task.config.priority}`);
  }

  /**
   * Get next task to execute (if resources available)
   *
   * Checks resource availability and returns the next high-priority task if:
   * 1. Resources are available (CPU, memory, concurrent agents)
   * 2. Queue is not empty
   *
   * Returns undefined if:
   * - Queue is empty
   * - Resources are insufficient (task should wait)
   *
   * @param config - Optional execution config for resource checking (uses default if not provided)
   * @returns Next task to execute, or undefined if none available or resources insufficient
   *
   * @example
   * ```typescript
   * // Get next task
   * const nextTask = scheduler.getNextTask();
   * if (nextTask) {
   *   console.log(`Dispatching ${nextTask.taskId}`);
   *   await executeTask(nextTask);
   * } else {
   *   console.log('No tasks ready or resources unavailable');
   * }
   * ```
   */
  getNextTask(config?: ExecutionConfig): BackgroundTask | undefined {
    // Check if queue is empty
    if (this.queue.isEmpty()) {
      return undefined;
    }

    // Check if resources are available
    const resourceCheck = this.resourceMonitor.canRunBackgroundTask(config);
    if (!resourceCheck.canExecute) {
      logger.debug(`TaskScheduler: Cannot dispatch task - ${resourceCheck.reason}`);
      return undefined;
    }

    // Dequeue next task
    const task = this.queue.dequeue();
    if (task) {
      logger.debug(`TaskScheduler: Dispatched task ${task.taskId}`);
    }

    return task;
  }

  /**
   * Peek at next task without removing it
   *
   * Returns the next task that would be dispatched, without actually removing it
   * from the queue. Does NOT check resource availability.
   *
   * @returns Next task in queue, or undefined if queue is empty
   *
   * @example
   * ```typescript
   * const nextTask = scheduler.peek();
   * if (nextTask) {
   *   console.log(`Next task: ${nextTask.taskId} (${nextTask.config.priority})`);
   * }
   * ```
   */
  peek(): BackgroundTask | undefined {
    return this.queue.peek();
  }

  /**
   * Remove a specific task from queue
   *
   * Removes a queued task by ID. Returns true if task was found and removed,
   * false if task not in queue.
   *
   * @param taskId - ID of task to remove
   * @returns True if task was removed, false if not found
   *
   * @example
   * ```typescript
   * const removed = scheduler.removeTask('task-123');
   * if (removed) {
   *   console.log('Task cancelled');
   * }
   * ```
   */
  removeTask(taskId: string): boolean {
    const removed = this.queue.remove(taskId);
    if (removed) {
      logger.debug(`TaskScheduler: Removed task ${taskId} from queue`);
    }
    return removed;
  }

  /**
   * Check if queue is empty
   *
   * @returns True if no tasks in queue, false otherwise
   *
   * @example
   * ```typescript
   * if (scheduler.isEmpty()) {
   *   console.log('Scheduler idle');
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  /**
   * Get total number of queued tasks
   *
   * @returns Total number of tasks across all priorities
   *
   * @example
   * ```typescript
   * console.log(`Queue depth: ${scheduler.size()}`);
   * ```
   */
  size(): number {
    return this.queue.size();
  }

  /**
   * Get queue statistics
   *
   * Returns comprehensive statistics about the queue including total task count
   * and breakdown by priority level.
   *
   * @returns Object containing total count and per-priority counts
   *
   * @example
   * ```typescript
   * const stats = scheduler.getStats();
   * console.log(`Total: ${stats.total}`);
   * console.log(`High: ${stats.byPriority.high}`);
   * console.log(`Medium: ${stats.byPriority.medium}`);
   * console.log(`Low: ${stats.byPriority.low}`);
   * ```
   */
  getStats(): ReturnType<ExecutionQueue['getStats']> {
    return this.queue.getStats();
  }

  /**
   * Get all tasks in queue (for inspection/debugging)
   *
   * Returns array of all queued tasks, ordered by priority (high → medium → low).
   *
   * @returns Array of all queued tasks
   *
   * @example
   * ```typescript
   * const allTasks = scheduler.getAllTasks();
   * allTasks.forEach(task => {
   *   console.log(`${task.taskId}: ${task.config.priority}`);
   * });
   * ```
   */
  getAllTasks(): BackgroundTask[] {
    return this.queue.getAllTasks();
  }

  /**
   * Find a task by ID
   *
   * Searches queue for a task with the specified ID without removing it.
   *
   * @param taskId - ID of task to find
   * @returns Task if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const task = scheduler.findTask('task-123');
   * if (task) {
   *   console.log(`Found: ${task.taskId}`);
   * }
   * ```
   */
  findTask(taskId: string): BackgroundTask | undefined {
    return this.queue.findTask(taskId);
  }

  /**
   * Clear all tasks from queue
   *
   * Removes all queued tasks. Use with caution - this operation is irreversible.
   *
   * @example
   * ```typescript
   * scheduler.clear();
   * console.log('All queued tasks cleared');
   * ```
   */
  clear(): void {
    this.queue.clear();
    logger.info('TaskScheduler: Cleared all queued tasks');
  }
}
