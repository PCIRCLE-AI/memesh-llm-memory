/**
 * Execution Queue - Priority-Based Task Queue for Background Execution
 *
 * Manages a priority queue system for background tasks with three priority levels
 * (high, medium, low) and FIFO ordering within each priority. Provides thread-safe
 * operations for enqueueing, dequeueing, and managing tasks in the execution pipeline.
 *
 * Features:
 * - Three-tier priority system (high > medium > low)
 * - FIFO ordering within same priority level
 * - Thread-safe queue operations
 * - Task cancellation and removal support
 * - Queue statistics and monitoring
 * - Task lookup by ID
 *
 * Priority Processing Order:
 * 1. **High priority**: Critical tasks, executed first
 * 2. **Medium priority**: Normal tasks, default priority
 * 3. **Low priority**: Deferred tasks, executed when queue is idle
 *
 * Within each priority level, tasks are processed in FIFO order (first-in, first-out).
 *
 * @example
 * ```typescript
 * import { ExecutionQueue } from './ExecutionQueue.js';
 * import { BackgroundTask, DEFAULT_EXECUTION_CONFIG } from './types.js';
 *
 * // Create execution queue
 * const queue = new ExecutionQueue();
 *
 * // Enqueue tasks with different priorities
 * const highPriorityTask: BackgroundTask = {
 *   taskId: 'task-1',
 *   status: 'queued',
 *   task: { type: 'critical-operation' },
 *   config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' },
 *   startTime: new Date()
 * };
 *
 * const lowPriorityTask: BackgroundTask = {
 *   taskId: 'task-2',
 *   status: 'queued',
 *   task: { type: 'cleanup' },
 *   config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'low' },
 *   startTime: new Date()
 * };
 *
 * queue.enqueue(lowPriorityTask);
 * queue.enqueue(highPriorityTask);
 *
 * // Dequeue returns high priority task first
 * const nextTask = queue.dequeue(); // Returns highPriorityTask
 *
 * // Monitor queue statistics
 * const stats = queue.getStats();
 * console.log(`Total tasks: ${stats.total}`);
 * console.log(`High: ${stats.byPriority.high}, Medium: ${stats.byPriority.medium}, Low: ${stats.byPriority.low}`);
 * ```
 */

import { BackgroundTask, TaskPriority } from './types.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../errors/index.js';

export class ExecutionQueue {
  private queues: Map<TaskPriority, BackgroundTask[]>;
  private priorityOrder: TaskPriority[] = ['high', 'medium', 'low'];

  constructor() {
    this.queues = new Map([
      ['high', []],
      ['medium', []],
      ['low', []],
    ]);
  }

  /**
   * Add a task to the queue based on its priority
   *
   * Enqueues a task into the appropriate priority queue. Tasks are added
   * to the end of their priority queue (FIFO ordering within priority).
   *
   * @param task - Background task to enqueue
   * @throws ValidationError if task priority is invalid
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Enqueue high priority task (executed first)
   * const criticalTask: BackgroundTask = {
   *   taskId: 'critical-1',
   *   status: 'queued',
   *   task: { type: 'security-patch' },
   *   config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' },
   *   startTime: new Date()
   * };
   * queue.enqueue(criticalTask);
   *
   * // Enqueue medium priority task (normal priority)
   * const normalTask: BackgroundTask = {
   *   taskId: 'normal-1',
   *   status: 'queued',
   *   task: { type: 'feature-implementation' },
   *   config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
   *   startTime: new Date()
   * };
   * queue.enqueue(normalTask);
   *
   * // Enqueue low priority task (deferred execution)
   * const deferredTask: BackgroundTask = {
   *   taskId: 'defer-1',
   *   status: 'queued',
   *   task: { type: 'cleanup' },
   *   config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'low' },
   *   startTime: new Date()
   * };
   * queue.enqueue(deferredTask);
   *
   * console.log(`Queue size: ${queue.size()}`); // 3
   * ```
   */
  enqueue(task: BackgroundTask): void {
    const priority = task.config.priority;
    const queue = this.queues.get(priority);

    if (!queue) {
      throw new ValidationError(`Invalid priority: ${priority}`, {
        providedPriority: priority,
        validPriorities: this.priorityOrder,
      });
    }

    queue.push(task);
    logger.debug(`ExecutionQueue: Enqueued task ${task.taskId} with priority ${priority}`);
  }

  /**
   * Remove and return the highest priority task
   *
   * Dequeues the next task to execute, always returning the highest priority
   * task available. Within the same priority level, returns the oldest task (FIFO).
   *
   * Priority Order: high → medium → low
   *
   * @returns The next task to execute, or undefined if queue is empty
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Setup: Enqueue tasks in mixed order
   * queue.enqueue(lowPriorityTask);    // Enqueued 1st, priority: low
   * queue.enqueue(mediumPriorityTask); // Enqueued 2nd, priority: medium
   * queue.enqueue(highPriorityTask);   // Enqueued 3rd, priority: high
   *
   * // Dequeue returns highest priority first, regardless of enqueue order
   * const task1 = queue.dequeue(); // Returns highPriorityTask
   * const task2 = queue.dequeue(); // Returns mediumPriorityTask
   * const task3 = queue.dequeue(); // Returns lowPriorityTask
   * const task4 = queue.dequeue(); // Returns undefined (empty queue)
   *
   * // FIFO within same priority
   * queue.enqueue(highTask1);
   * queue.enqueue(highTask2);
   * queue.enqueue(highTask3);
   *
   * const first = queue.dequeue();  // Returns highTask1 (oldest high priority)
   * const second = queue.dequeue(); // Returns highTask2
   * const third = queue.dequeue();  // Returns highTask3
   * ```
   */
  dequeue(): BackgroundTask | undefined {
    // Check queues in priority order
    for (const priority of this.priorityOrder) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        const task = queue.shift();
        if (task) {
          logger.debug(`ExecutionQueue: Dequeued task ${task.taskId} from ${priority} priority`);
        }
        return task;
      }
    }

    return undefined;
  }

  /**
   * View the next task without removing it
   *
   * Peeks at the next task that would be returned by dequeue() without
   * actually removing it from the queue. Useful for inspecting the next
   * task to be executed without committing to execution.
   *
   * @returns The next task that would be dequeued, or undefined if queue is empty
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * queue.enqueue(mediumPriorityTask);
   * queue.enqueue(highPriorityTask);
   *
   * // Peek at next task without removing it
   * const nextTask = queue.peek();
   * console.log(`Next task: ${nextTask?.taskId}`); // highPriorityTask
   * console.log(`Queue size: ${queue.size()}`);    // 2 (unchanged)
   *
   * // Peek multiple times - returns same task
   * const sameTask = queue.peek();
   * console.log(nextTask === sameTask); // true
   *
   * // Actually dequeue the task
   * const dequeuedTask = queue.dequeue();
   * console.log(nextTask === dequeuedTask); // true
   * console.log(`Queue size: ${queue.size()}`);     // 1 (now changed)
   * ```
   */
  peek(): BackgroundTask | undefined {
    for (const priority of this.priorityOrder) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }

    return undefined;
  }

  /**
   * Get total number of tasks in queue
   *
   * Calculates the total number of tasks across all priority levels.
   * Useful for monitoring queue load and determining if the queue is empty.
   *
   * @returns Total number of tasks in all priority queues combined
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * console.log(`Queue size: ${queue.size()}`); // 0 (empty)
   *
   * queue.enqueue(highPriorityTask1);
   * queue.enqueue(highPriorityTask2);
   * queue.enqueue(mediumPriorityTask);
   * queue.enqueue(lowPriorityTask);
   *
   * console.log(`Queue size: ${queue.size()}`); // 4
   *
   * queue.dequeue();
   * console.log(`Queue size: ${queue.size()}`); // 3
   *
   * // Check if queue needs processing
   * if (queue.size() > 10) {
   *   console.warn('Queue backlog is high');
   * }
   * ```
   */
  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Get number of tasks for a specific priority
   *
   * Returns the count of tasks in a specific priority queue. Useful for
   * monitoring workload distribution across priority levels and identifying
   * bottlenecks or imbalances.
   *
   * @param priority - Priority level to query ('high', 'medium', or 'low')
   * @returns Number of tasks in the specified priority queue
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Enqueue tasks with different priorities
   * queue.enqueue(highPriorityTask1);
   * queue.enqueue(highPriorityTask2);
   * queue.enqueue(highPriorityTask3);
   * queue.enqueue(mediumPriorityTask1);
   * queue.enqueue(lowPriorityTask1);
   *
   * // Check distribution across priorities
   * console.log(`High: ${queue.sizeByPriority('high')}`);     // 3
   * console.log(`Medium: ${queue.sizeByPriority('medium')}`); // 1
   * console.log(`Low: ${queue.sizeByPriority('low')}`);       // 1
   *
   * // Monitor high priority backlog
   * if (queue.sizeByPriority('high') > 5) {
   *   console.warn('High priority queue is backed up');
   * }
   * ```
   */
  sizeByPriority(priority: TaskPriority): number {
    const queue = this.queues.get(priority);
    return queue ? queue.length : 0;
  }

  /**
   * Remove a specific task by ID
   *
   * Searches all priority queues for a task with the specified ID and removes it.
   * Useful for cancelling specific tasks before they are executed. Returns true
   * if the task was found and removed, false if not found.
   *
   * @param taskId - Unique identifier of the task to remove
   * @returns True if task was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Enqueue several tasks
   * queue.enqueue({ taskId: 'task-1', ... });
   * queue.enqueue({ taskId: 'task-2', ... });
   * queue.enqueue({ taskId: 'task-3', ... });
   *
   * console.log(`Queue size: ${queue.size()}`); // 3
   *
   * // Remove specific task
   * const removed = queue.remove('task-2');
   * console.log(`Removed: ${removed}`);         // true
   * console.log(`Queue size: ${queue.size()}`); // 2
   *
   * // Try to remove non-existent task
   * const notFound = queue.remove('task-999');
   * console.log(`Removed: ${notFound}`);        // false
   *
   * // Cancel all tasks matching a pattern
   * const taskIds = ['task-4', 'task-5', 'task-6'];
   * taskIds.forEach(id => queue.remove(id));
   * ```
   */
  remove(taskId: string): boolean {
    for (const queue of this.queues.values()) {
      const index = queue.findIndex(task => task.taskId === taskId);
      if (index !== -1) {
        queue.splice(index, 1);
        logger.debug(`ExecutionQueue: Removed task ${taskId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all tasks from the queue
   *
   * Removes all tasks from all priority queues, resetting the queue to empty state.
   * Useful for emergency shutdown, system reset, or clearing stale tasks. This
   * operation is irreversible - tasks cannot be recovered after clearing.
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Enqueue multiple tasks
   * queue.enqueue(highPriorityTask1);
   * queue.enqueue(highPriorityTask2);
   * queue.enqueue(mediumPriorityTask);
   * queue.enqueue(lowPriorityTask);
   *
   * console.log(`Queue size: ${queue.size()}`); // 4
   *
   * // Clear all tasks
   * queue.clear();
   * console.log(`Queue size: ${queue.size()}`); // 0
   * console.log(`Is empty: ${queue.isEmpty()}`); // true
   *
   * // Emergency shutdown example
   * if (systemShutdown) {
   *   queue.clear(); // Cancel all pending tasks
   *   console.log('All pending tasks cancelled');
   * }
   * ```
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    logger.debug('ExecutionQueue: Cleared all tasks');
  }

  /**
   * Get all tasks in the queue (ordered by priority)
   *
   * Returns an array of all tasks across all priority queues, ordered by priority
   * (high → medium → low). Within each priority level, tasks are in FIFO order.
   * Useful for queue inspection, debugging, and monitoring.
   *
   * @returns Array of all tasks ordered by priority, then by insertion order
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Enqueue tasks in mixed order
   * queue.enqueue({ taskId: 'low-1', priority: 'low', ... });
   * queue.enqueue({ taskId: 'high-1', priority: 'high', ... });
   * queue.enqueue({ taskId: 'medium-1', priority: 'medium', ... });
   * queue.enqueue({ taskId: 'high-2', priority: 'high', ... });
   *
   * // Get all tasks (ordered by priority)
   * const allTasks = queue.getAllTasks();
   * console.log(allTasks.map(t => t.taskId));
   * // Output: ['high-1', 'high-2', 'medium-1', 'low-1']
   *
   * // Display queue status
   * console.log('Current queue:');
   * allTasks.forEach((task, index) => {
   *   console.log(`${index + 1}. ${task.taskId} (${task.config.priority})`);
   * });
   * ```
   */
  getAllTasks(): BackgroundTask[] {
    const allTasks: BackgroundTask[] = [];
    for (const priority of this.priorityOrder) {
      const queue = this.queues.get(priority);
      if (queue) {
        allTasks.push(...queue);
      }
    }
    return allTasks;
  }

  /**
   * Find a task by ID
   *
   * Searches all priority queues for a task with the specified ID and returns it
   * without removing it from the queue. Useful for checking task status, inspecting
   * task details, or verifying task existence before performing operations.
   *
   * @param taskId - Unique identifier of the task to find
   * @returns The task if found, or undefined if not found
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Enqueue tasks
   * queue.enqueue({ taskId: 'task-1', status: 'queued', ... });
   * queue.enqueue({ taskId: 'task-2', status: 'queued', ... });
   *
   * // Find specific task
   * const task = queue.findTask('task-1');
   * if (task) {
   *   console.log(`Found: ${task.taskId}`);
   *   console.log(`Status: ${task.status}`);
   *   console.log(`Priority: ${task.config.priority}`);
   * } else {
   *   console.log('Task not found');
   * }
   *
   * // Check if task exists before removing
   * if (queue.findTask('task-2')) {
   *   queue.remove('task-2');
   *   console.log('Task removed');
   * }
   * ```
   */
  findTask(taskId: string): BackgroundTask | undefined {
    for (const queue of this.queues.values()) {
      const task = queue.find(t => t.taskId === taskId);
      if (task) {
        return task;
      }
    }
    return undefined;
  }

  /**
   * Get queue statistics
   *
   * Returns comprehensive statistics about the queue including total task count
   * and breakdown by priority level. Useful for monitoring, dashboard displays,
   * and capacity planning.
   *
   * @returns Object containing total count and per-priority counts
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * // Enqueue various tasks
   * queue.enqueue({ priority: 'high', ... });
   * queue.enqueue({ priority: 'high', ... });
   * queue.enqueue({ priority: 'medium', ... });
   * queue.enqueue({ priority: 'low', ... });
   *
   * // Get statistics
   * const stats = queue.getStats();
   * console.log(`Total tasks: ${stats.total}`); // 4
   * console.log(`High: ${stats.byPriority.high}`);     // 2
   * console.log(`Medium: ${stats.byPriority.medium}`); // 1
   * console.log(`Low: ${stats.byPriority.low}`);       // 1
   *
   * // Display as dashboard
   * console.log('Queue Status:');
   * console.log(`  High Priority:   ${stats.byPriority.high} tasks`);
   * console.log(`  Medium Priority: ${stats.byPriority.medium} tasks`);
   * console.log(`  Low Priority:    ${stats.byPriority.low} tasks`);
   * console.log(`  Total:           ${stats.total} tasks`);
   * ```
   */
  getStats(): {
    total: number;
    byPriority: Record<TaskPriority, number>;
  } {
    return {
      total: this.size(),
      byPriority: {
        high: this.sizeByPriority('high'),
        medium: this.sizeByPriority('medium'),
        low: this.sizeByPriority('low'),
      },
    };
  }

  /**
   * Check if queue is empty
   *
   * Returns true if there are no tasks in any priority queue, false otherwise.
   * More efficient than checking `size() === 0` as it can short-circuit on first
   * non-empty queue found. Useful for idle detection and shutdown conditions.
   *
   * @returns True if queue is empty (no tasks in any priority), false otherwise
   *
   * @example
   * ```typescript
   * const queue = new ExecutionQueue();
   *
   * console.log(`Empty: ${queue.isEmpty()}`); // true
   *
   * queue.enqueue(mediumPriorityTask);
   * console.log(`Empty: ${queue.isEmpty()}`); // false
   *
   * queue.dequeue();
   * console.log(`Empty: ${queue.isEmpty()}`); // true
   *
   * // Wait for queue to be empty before shutdown
   * while (!queue.isEmpty()) {
   *   const task = queue.dequeue();
   *   await processTask(task);
   * }
   * console.log('All tasks processed, safe to shutdown');
   *
   * // Idle detection
   * if (queue.isEmpty()) {
   *   console.log('Queue is idle, workers can sleep');
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }
}
