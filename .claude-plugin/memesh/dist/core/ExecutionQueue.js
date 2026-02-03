import { logger } from '../utils/logger.js';
import { ValidationError } from '../errors/index.js';
export class ExecutionQueue {
    queues;
    priorityOrder = ['high', 'medium', 'low'];
    constructor() {
        this.queues = new Map([
            ['high', []],
            ['medium', []],
            ['low', []],
        ]);
    }
    enqueue(task) {
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
    dequeue() {
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
    peek() {
        for (const priority of this.priorityOrder) {
            const queue = this.queues.get(priority);
            if (queue && queue.length > 0) {
                return queue[0];
            }
        }
        return undefined;
    }
    size() {
        return Array.from(this.queues.values()).reduce((total, queue) => total + queue.length, 0);
    }
    sizeByPriority(priority) {
        const queue = this.queues.get(priority);
        return queue ? queue.length : 0;
    }
    remove(taskId) {
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
    clear() {
        for (const queue of this.queues.values()) {
            queue.length = 0;
        }
        logger.debug('ExecutionQueue: Cleared all tasks');
    }
    getAllTasks() {
        const allTasks = [];
        for (const priority of this.priorityOrder) {
            const queue = this.queues.get(priority);
            if (queue) {
                allTasks.push(...queue);
            }
        }
        return allTasks;
    }
    findTask(taskId) {
        for (const queue of this.queues.values()) {
            const task = queue.find(t => t.taskId === taskId);
            if (task) {
                return task;
            }
        }
        return undefined;
    }
    getStats() {
        return {
            total: this.size(),
            byPriority: {
                high: this.sizeByPriority('high'),
                medium: this.sizeByPriority('medium'),
                low: this.sizeByPriority('low'),
            },
        };
    }
    isEmpty() {
        return this.size() === 0;
    }
}
//# sourceMappingURL=ExecutionQueue.js.map