import { ExecutionQueue } from './ExecutionQueue.js';
import { logger } from '../utils/logger.js';
export class TaskScheduler {
    queue;
    resourceMonitor;
    constructor(resourceMonitor) {
        this.queue = new ExecutionQueue();
        this.resourceMonitor = resourceMonitor;
    }
    enqueue(task) {
        this.queue.enqueue(task);
        logger.debug(`TaskScheduler: Enqueued task ${task.taskId} with priority ${task.config.priority}`);
    }
    getNextTask(config) {
        if (this.queue.isEmpty()) {
            return undefined;
        }
        const resourceCheck = this.resourceMonitor.canRunBackgroundTask(config);
        if (!resourceCheck.canExecute) {
            logger.debug(`TaskScheduler: Cannot dispatch task - ${resourceCheck.reason}`);
            return undefined;
        }
        const task = this.queue.dequeue();
        if (task) {
            logger.debug(`TaskScheduler: Dispatched task ${task.taskId}`);
        }
        return task;
    }
    peek() {
        return this.queue.peek();
    }
    removeTask(taskId) {
        const removed = this.queue.remove(taskId);
        if (removed) {
            logger.debug(`TaskScheduler: Removed task ${taskId} from queue`);
        }
        return removed;
    }
    isEmpty() {
        return this.queue.isEmpty();
    }
    size() {
        return this.queue.size();
    }
    getStats() {
        return this.queue.getStats();
    }
    getAllTasks() {
        return this.queue.getAllTasks();
    }
    findTask(taskId) {
        return this.queue.findTask(taskId);
    }
    clear() {
        this.queue.clear();
        logger.info('TaskScheduler: Cleared all queued tasks');
    }
}
//# sourceMappingURL=TaskScheduler.js.map