/**
 * ExecutionQueue - Priority-based task queue for background execution
 *
 * Features:
 * - Priority-based ordering (high > medium > low)
 * - FIFO within same priority level
 * - Thread-safe operations
 * - Task cancellation support
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
   * Returns undefined if no tasks available
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
   */
  sizeByPriority(priority: TaskPriority): number {
    const queue = this.queues.get(priority);
    return queue ? queue.length : 0;
  }

  /**
   * Remove a specific task by ID
   * Returns true if task was found and removed
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
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    logger.debug('ExecutionQueue: Cleared all tasks');
  }

  /**
   * Get all tasks in the queue (ordered by priority)
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
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }
}
