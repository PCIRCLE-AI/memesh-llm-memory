import { randomBytes } from 'crypto';
import { TaskScheduler } from './TaskScheduler.js';
import { ResultHandler } from './ResultHandler.js';
import { ExecutionMonitor } from './ExecutionMonitor.js';
import { logger } from '../utils/logger.js';
import { AttributionManager } from '../ui/AttributionManager.js';
import { ValidationError, NotFoundError, StateError } from '../errors/index.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';
import { validateFiniteNumber, validateSafeInteger } from '../utils/validation.js';
export class TimeoutError extends Error {
    constructor(duration) {
        super(`Task timed out after ${duration}ms. Consider breaking down the task into smaller operations or increasing maxDuration in config.resourceLimits.`);
        this.name = 'TimeoutError';
    }
}
export class BackgroundExecutor {
    scheduler;
    activeWorkers;
    resourceMonitor;
    tasks;
    processingLock = false;
    cleanupTimers = new Map();
    cleanupScheduled = new Set();
    cleanupCancelCounts = new Map();
    activeTimeouts = new Set();
    eventBus;
    attributionManager;
    resultHandler;
    executionMonitor;
    MAX_TASK_HISTORY = 1000;
    FORCE_CLEANUP_AGE = 3600000;
    MAX_CLEANUP_CANCELS = 10;
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
        if (config.resourceLimits?.maxDuration !== undefined) {
            const duration = config.resourceLimits.maxDuration;
            const MAX_ALLOWED_DURATION = 3600000;
            if (typeof duration !== 'number') {
                throw new ValidationError('maxDuration must be a number', {
                    provided: duration,
                    type: typeof duration,
                });
            }
            validateFiniteNumber(duration, 'maxDuration', { min: 1, max: MAX_ALLOWED_DURATION });
            validateSafeInteger(duration, 'maxDuration');
            if (Object.is(duration, -0)) {
                throw new ValidationError('maxDuration must be positive (> 0)', {
                    provided: duration,
                    isNegativeZero: true,
                });
            }
        }
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
    processQueue() {
        if (this.processingLock) {
            return;
        }
        this.processingLock = true;
        try {
            while (!this.scheduler.isEmpty()) {
                const backgroundTask = this.scheduler.getNextTask();
                if (!backgroundTask) {
                    break;
                }
                this.startTaskExecution(backgroundTask).catch((error) => {
                    logger.error(`[BackgroundExecutor] Task ${backgroundTask.taskId} execution error:`, this.sanitizeErrorForLog(error));
                });
            }
        }
        catch (error) {
            logger.error('[BackgroundExecutor] CRITICAL: Exception in processQueue', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                queueSize: this.scheduler.size(),
                activeTasks: this.activeWorkers.size,
            });
        }
        finally {
            this.processingLock = false;
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
        let executePromise = this.executeTaskInternal(task, config, updateProgress, () => cancelled);
        let timeoutId;
        let timeoutFired = false;
        try {
            if (config.resourceLimits?.maxDuration) {
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        timeoutFired = true;
                        cancel();
                        reject(new TimeoutError(config.resourceLimits.maxDuration));
                    }, config.resourceLimits.maxDuration);
                    this.activeTimeouts.add(timeoutId);
                });
                executePromise = Promise.race([executePromise, timeoutPromise]);
            }
        }
        catch (error) {
            if (timeoutId) {
                this.clearTaskTimeout(timeoutId);
            }
            throw error;
        }
        const promise = executePromise;
        this.activeWorkers.set(taskId, {
            promise,
            cancel,
            updateProgress,
        });
        promise
            .then(result => {
            if (timeoutId && !timeoutFired) {
                this.clearTaskTimeout(timeoutId);
            }
            if (cancelled) {
                this.handleTaskCancelled(taskId);
            }
            else {
                this.handleTaskCompleted(taskId, result);
            }
        })
            .catch(error => {
            if (timeoutId && !timeoutFired) {
                this.clearTaskTimeout(timeoutId);
            }
            if (error instanceof TimeoutError) {
                this.handleTaskFailed(taskId, error);
            }
            else if (cancelled) {
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
    async executeTaskInternal(task, _config, updateProgress, isCancelled) {
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
        this.scheduleTaskCleanup(taskId);
    }
    handleTaskFailed(taskId, error) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }
        this.resultHandler.handleFailed(task, error);
        this.tasks.set(taskId, task);
        this.scheduleTaskCleanup(taskId);
    }
    handleTaskCancelled(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }
        this.resultHandler.handleCancelled(task);
        this.tasks.set(taskId, task);
        this.scheduleTaskCleanup(taskId);
    }
    scheduleTaskCleanup(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }
        if (task.endTime && Date.now() - task.endTime.getTime() > this.FORCE_CLEANUP_AGE) {
            logger.warn(`[BackgroundExecutor] Force cleaning up task ${taskId} - exceeded max age`);
            this.tasks.delete(taskId);
            this.cleanupTimers.delete(taskId);
            this.cleanupScheduled.delete(taskId);
            this.cleanupCancelCounts.delete(taskId);
            return;
        }
        if (this.tasks.size > this.MAX_TASK_HISTORY) {
            this.forceCleanupOldestTasks(100);
        }
        if (this.cleanupScheduled.has(taskId)) {
            return;
        }
        this.cleanupScheduled.add(taskId);
        const timerId = setTimeout(() => {
            setImmediate(() => {
                if (this.cleanupScheduled.has(taskId)) {
                    this.tasks.delete(taskId);
                    this.cleanupTimers.delete(taskId);
                    this.cleanupScheduled.delete(taskId);
                    this.cleanupCancelCounts.delete(taskId);
                }
            });
        }, 60000);
        this.cleanupTimers.set(taskId, timerId);
    }
    cancelTaskCleanup(taskId) {
        const cancelCount = this.cleanupCancelCounts.get(taskId) || 0;
        if (cancelCount >= this.MAX_CLEANUP_CANCELS) {
            logger.warn(`[BackgroundExecutor] Task ${taskId} cleanup cancelled ${cancelCount} times - forcing cleanup`);
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
    clearTaskTimeout(timeoutId) {
        clearTimeout(timeoutId);
        this.activeTimeouts.delete(timeoutId);
    }
    forceCleanupOldestTasks(count) {
        const completedTasks = Array.from(this.tasks.entries())
            .filter(([_, task]) => ['completed', 'failed', 'cancelled'].includes(task.status))
            .sort((a, b) => {
            const aTime = a[1].endTime?.getTime() || 0;
            const bTime = b[1].endTime?.getTime() || 0;
            return aTime - bTime;
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
            logger.warn(`[BackgroundExecutor] Force cleaned ${completedTasks.length} oldest tasks (history limit: ${this.MAX_TASK_HISTORY})`);
        }
    }
    sanitizeErrorForLog(error) {
        const message = error instanceof Error ? error.message : String(error);
        let sanitized = message.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        const lines = sanitized.split(/\r?\n/);
        const sanitizedLines = lines.map((line) => {
            if (looksLikeSensitive(line)) {
                return `[REDACTED:${hashValue(line)}]`;
            }
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
        return sanitized.substring(0, 1000);
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
        this.cancelTaskCleanup(taskId);
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
        const task = this.tasks.get(taskId);
        if (task) {
            this.cancelTaskCleanup(taskId);
        }
        return task;
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getTasksByStatus(status) {
        return Array.from(this.tasks.values()).filter(task => task.status === status);
    }
    getStats() {
        const counts = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
        for (const task of this.tasks.values()) {
            if (task.status in counts) {
                counts[task.status]++;
            }
        }
        return { ...counts, queueStats: this.scheduler.getStats() };
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