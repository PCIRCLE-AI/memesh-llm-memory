import { ResourceMonitor } from './ResourceMonitor.js';
import { TaskScheduler } from './TaskScheduler.js';
import { ExecutionConfig, BackgroundTask, Progress, TaskStatus } from './types.js';
import { UIEventBus } from '../ui/UIEventBus.js';
export declare class TimeoutError extends Error {
    constructor(duration: number);
}
export declare class BackgroundExecutor {
    private scheduler;
    private activeWorkers;
    private resourceMonitor;
    private tasks;
    private processingLock;
    private cleanupTimers;
    private cleanupScheduled;
    private cleanupCancelCounts;
    private activeTimeouts;
    private eventBus?;
    private attributionManager?;
    private resultHandler;
    private executionMonitor;
    private isShuttingDown;
    private shutdownPromise;
    private readonly MAX_TASK_HISTORY;
    private readonly FORCE_CLEANUP_AGE;
    private readonly MAX_CLEANUP_CANCELS;
    private readonly SHUTDOWN_TIMEOUT_MS;
    constructor(resourceMonitor: ResourceMonitor, eventBus?: UIEventBus);
    executeTask(task: unknown, config: ExecutionConfig): Promise<string>;
    private processQueue;
    private startTaskExecution;
    private executeTaskInternal;
    private handleTaskCompleted;
    private handleTaskFailed;
    private handleTaskCancelled;
    private scheduleTaskCleanup;
    private cancelTaskCleanup;
    private clearTaskTimeout;
    private forceCleanupOldestTasks;
    private sanitizeErrorForLog;
    getProgress(taskId: string): Promise<Progress>;
    cancelTask(taskId: string): Promise<void>;
    getTask(taskId: string): BackgroundTask | undefined;
    getAllTasks(): BackgroundTask[];
    getTasksByStatus(status: TaskStatus): BackgroundTask[];
    getStats(): {
        queued: number;
        running: number;
        completed: number;
        failed: number;
        cancelled: number;
        queueStats: ReturnType<TaskScheduler['getStats']>;
    };
    clearFinishedTasks(): number;
    completeTask(taskId: string, result: unknown): Promise<void>;
    failTask(taskId: string, error: Error): Promise<void>;
    private estimateTimeSaved;
    private handleBackgroundTaskError;
    destroy(): Promise<void>;
    private performShutdown;
}
//# sourceMappingURL=BackgroundExecutor.d.ts.map