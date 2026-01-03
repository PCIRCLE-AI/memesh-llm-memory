import { ResourceMonitor } from './ResourceMonitor.js';
import { TaskScheduler } from './TaskScheduler.js';
import { ExecutionConfig, BackgroundTask, Progress, TaskStatus } from './types.js';
import { UIEventBus } from '../ui/UIEventBus.js';
export declare class BackgroundExecutor {
    private scheduler;
    private activeWorkers;
    private resourceMonitor;
    private tasks;
    private processingQueue;
    private eventBus?;
    private attributionManager?;
    private resultHandler;
    private executionMonitor;
    constructor(resourceMonitor: ResourceMonitor, eventBus?: UIEventBus);
    executeTask(task: unknown, config: ExecutionConfig): Promise<string>;
    private processQueue;
    private startTaskExecution;
    private executeTaskInternal;
    private handleTaskCompleted;
    private handleTaskFailed;
    private handleTaskCancelled;
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
}
//# sourceMappingURL=BackgroundExecutor.d.ts.map