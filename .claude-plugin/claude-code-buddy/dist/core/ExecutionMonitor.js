import { AttributionManager } from '../ui/AttributionManager.js';
import { logger } from '../utils/logger.js';
export class ExecutionMonitor {
    tasks;
    eventBus;
    attributionManager;
    constructor(eventBus) {
        this.tasks = new Map();
        this.eventBus = eventBus;
        if (this.eventBus) {
            this.attributionManager = new AttributionManager(this.eventBus);
        }
    }
    registerTask(taskId, task) {
        this.tasks.set(taskId, task);
    }
    unregisterTask(taskId) {
        this.tasks.delete(taskId);
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    createProgressUpdater(taskId, task) {
        return (progress, stage) => {
            this.updateProgress(taskId, task, progress, stage);
        };
    }
    updateProgress(taskId, task, progress, stage) {
        const normalizedProgress = Math.max(0, Math.min(1, progress));
        task.progress = {
            progress: normalizedProgress,
            currentStage: stage,
        };
        this.tasks.set(taskId, task);
        if (this.eventBus) {
            const taskData = task.task;
            this.eventBus.emitProgress({
                agentId: taskId,
                agentType: 'background-executor',
                taskDescription: taskData.description || 'Background task',
                progress: normalizedProgress,
                currentStage: stage,
                startTime: task.startTime,
            });
        }
        task.config.callbacks?.onProgress?.(normalizedProgress);
    }
    handleTaskCompleted(taskId, task, result) {
        task.status = 'completed';
        task.endTime = new Date();
        task.result = result;
        task.progress = {
            progress: 1.0,
            currentStage: 'completed',
        };
        this.tasks.set(taskId, task);
        logger.info(`ExecutionMonitor: Task ${taskId} completed`);
        task.config.callbacks?.onComplete?.(result);
        if (this.attributionManager) {
            const timeSaved = this.estimateTimeSaved(task);
            const taskData = task.task;
            this.attributionManager.recordSuccess([taskId], taskData.description || 'Background task completed', { timeSaved });
        }
    }
    handleTaskFailed(taskId, task, error) {
        task.status = 'failed';
        task.endTime = new Date();
        task.error = error;
        this.tasks.set(taskId, task);
        logger.error(`ExecutionMonitor: Task ${taskId} failed:`, error);
        task.config.callbacks?.onError?.(error);
        if (this.attributionManager) {
            const taskData = task.task;
            this.attributionManager.recordError([taskId], taskData.description || 'Background task failed', error, true);
        }
    }
    handleTaskCancelled(taskId, task) {
        task.status = 'cancelled';
        task.endTime = new Date();
        this.tasks.set(taskId, task);
        logger.info(`ExecutionMonitor: Task ${taskId} cancelled`);
    }
    getProgress(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return null;
        }
        return (task.progress || {
            progress: 0,
            currentStage: task.status,
        });
    }
    getStats() {
        const tasks = Array.from(this.tasks.values());
        return {
            queued: tasks.filter(t => t.status === 'queued').length,
            running: tasks.filter(t => t.status === 'running').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
            cancelled: tasks.filter(t => t.status === 'cancelled').length,
        };
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
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
        logger.info(`ExecutionMonitor: Cleared ${cleared} finished tasks`);
        return cleared;
    }
    estimateTimeSaved(task) {
        const duration = task.endTime
            ? task.endTime.getTime() - task.startTime.getTime()
            : 0;
        return Math.floor((duration * 2) / 60000);
    }
}
//# sourceMappingURL=ExecutionMonitor.js.map