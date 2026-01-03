import { randomBytes } from 'crypto';
import { TaskScheduler } from './TaskScheduler.js';
import { ResultHandler } from './ResultHandler.js';
import { ExecutionMonitor } from './ExecutionMonitor.js';
import { logger } from '../utils/logger.js';
import { AttributionManager } from '../ui/AttributionManager.js';
import { ValidationError, NotFoundError, StateError } from '../errors/index.js';
export class BackgroundExecutor {
    scheduler;
    activeWorkers;
    resourceMonitor;
    tasks;
    processingQueue = false;
    eventBus;
    attributionManager;
    resultHandler;
    executionMonitor;
    constructor(resourceMonitor, eventBus) {
        this.scheduler = new TaskScheduler(resourceMonitor);
        this.activeWorkers = new Map();
        this.resourceMonitor = resourceMonitor;
        this.tasks = new Map();
        this.eventBus = eventBus;
        this.resultHandler = new ResultHandler();
        this.executionMonitor = new ExecutionMonitor(eventBus);
        if (this.eventBus) {
            this.attributionManager = new AttributionManager(this.eventBus);
        }
    }
    async executeTask(task, config) {
        const resourceCheck = this.resourceMonitor.canRunBackgroundTask(config);
        const canQueue = (resourceCheck.reason?.includes('Max concurrent background agents') &&
            !resourceCheck.reason?.includes('(0)')) ||
            (resourceCheck.reason?.includes('requires') &&
                resourceCheck.reason?.includes('available'));
        if (!resourceCheck.canExecute && !canQueue) {
            throw new ValidationError(`Cannot execute background task: ${resourceCheck.reason}. ${resourceCheck.suggestion}`, {
                reason: resourceCheck.reason,
                suggestion: resourceCheck.suggestion,
                resources: resourceCheck.resources,
                canQueue
            });
        }
        const taskId = `bg-${randomBytes(8).toString('hex')}`;
        const backgroundTask = {
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
        this.tasks.set(taskId, backgroundTask);
        this.executionMonitor.registerTask(taskId, backgroundTask);
        this.scheduler.enqueue(backgroundTask);
        logger.info(`BackgroundExecutor: Task ${taskId} queued with priority ${config.priority}`);
        this.processQueue();
        return taskId;
    }
    async processQueue() {
        if (this.processingQueue) {
            return;
        }
        this.processingQueue = true;
        try {
            while (!this.scheduler.isEmpty()) {
                const backgroundTask = this.scheduler.getNextTask();
                if (!backgroundTask) {
                    break;
                }
                await this.startTaskExecution(backgroundTask);
            }
        }
        finally {
            this.processingQueue = false;
        }
    }
    async startTaskExecution(backgroundTask) {
        const { taskId, task, config } = backgroundTask;
        this.resourceMonitor.registerBackgroundTask();
        backgroundTask.status = 'running';
        backgroundTask.progress = {
            progress: 0,
            currentStage: 'starting',
        };
        this.tasks.set(taskId, backgroundTask);
        logger.info(`BackgroundExecutor: Starting task ${taskId}`);
        let cancelled = false;
        const cancel = () => {
            cancelled = true;
        };
        const updateProgress = (progress, stage) => {
            if (cancelled) {
                return;
            }
            this.executionMonitor.updateProgress(taskId, backgroundTask, progress, stage);
        };
        const promise = this.executeTaskInternal(task, config, updateProgress, () => cancelled);
        this.activeWorkers.set(taskId, {
            promise,
            cancel,
            updateProgress,
        });
        promise
            .then(result => {
            if (cancelled) {
                this.handleTaskCancelled(taskId);
            }
            else {
                this.handleTaskCompleted(taskId, result);
            }
        })
            .catch(error => {
            if (cancelled) {
                this.handleTaskCancelled(taskId);
            }
            else {
                this.handleTaskFailed(taskId, error);
            }
        })
            .finally(() => {
            this.activeWorkers.delete(taskId);
            this.resourceMonitor.unregisterBackgroundTask();
            this.processQueue();
        });
    }
    async executeTaskInternal(task, config, updateProgress, isCancelled) {
        updateProgress(0.1, 'executing');
        if (typeof task === 'function') {
            const result = await task({
                updateProgress,
                isCancelled,
            });
            return result;
        }
        const taskData = task;
        if (task && typeof taskData.execute === 'function') {
            const result = await taskData.execute({
                updateProgress,
                isCancelled,
            });
            return result;
        }
        updateProgress(1.0, 'completed');
        return task;
    }
    handleTaskCompleted(taskId, result) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }
        this.resultHandler.handleCompleted(task, result);
        this.tasks.set(taskId, task);
    }
    handleTaskFailed(taskId, error) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }
        this.resultHandler.handleFailed(task, error);
        this.tasks.set(taskId, task);
    }
    handleTaskCancelled(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }
        this.resultHandler.handleCancelled(task);
        this.tasks.set(taskId, task);
    }
    async getProgress(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new NotFoundError(`Task ${taskId} not found`, 'task', taskId);
        }
        return (task.progress || {
            progress: 0,
            currentStage: task.status,
        });
    }
    async cancelTask(taskId) {
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
        const worker = this.activeWorkers.get(taskId);
        if (worker) {
            worker.cancel();
            const task = this.tasks.get(taskId);
            if (task) {
                task.status = 'cancelled';
                task.endTime = new Date();
                this.tasks.set(taskId, task);
            }
            logger.info(`BackgroundExecutor: Cancelling running task ${taskId}`);
            return;
        }
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new NotFoundError(`Task ${taskId} not found`, 'task', taskId);
        }
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
            throw new StateError(`Cannot cancel task ${taskId} - already ${task.status}`, {
                taskId,
                currentStatus: task.status,
                operation: 'cancel',
                allowedStatuses: ['pending', 'running']
            });
        }
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getTasksByStatus(status) {
        return Array.from(this.tasks.values()).filter(task => task.status === status);
    }
    getStats() {
        return {
            queued: this.getTasksByStatus('queued').length,
            running: this.getTasksByStatus('running').length,
            completed: this.getTasksByStatus('completed').length,
            failed: this.getTasksByStatus('failed').length,
            cancelled: this.getTasksByStatus('cancelled').length,
            queueStats: this.scheduler.getStats(),
        };
    }
    clearFinishedTasks() {
        const finishedStatuses = ['completed', 'failed', 'cancelled'];
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
    async completeTask(taskId, result) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new NotFoundError(`Task ${taskId} not found`, 'task', taskId);
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
        if (this.attributionManager) {
            const timeSaved = this.estimateTimeSaved(task);
            const taskData = task.task;
            this.attributionManager.recordSuccess([taskId], taskData.description || 'Background task completed', { timeSaved });
        }
    }
    async failTask(taskId, error) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new NotFoundError(`Task ${taskId} not found`, 'task', taskId);
        }
        task.status = 'failed';
        task.endTime = new Date();
        task.error = error;
        this.tasks.set(taskId, task);
        logger.error(`BackgroundExecutor: Task ${taskId} manually failed:`, error);
        if (this.attributionManager) {
            const taskData = task.task;
            this.attributionManager.recordError([taskId], taskData.description || 'Background task failed', error, false);
        }
    }
    estimateTimeSaved(task) {
        const duration = task.endTime
            ? task.endTime.getTime() - task.startTime.getTime()
            : 0;
        return Math.floor((duration * 2) / 60000);
    }
}
//# sourceMappingURL=BackgroundExecutor.js.map