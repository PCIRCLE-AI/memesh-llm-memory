import { BackgroundTask, Progress } from './types.js';
import { UIEventBus } from '../ui/UIEventBus.js';
export interface ExecutionStats {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
}
export declare class ExecutionMonitor {
    private tasks;
    private eventBus?;
    private attributionManager?;
    constructor(eventBus?: UIEventBus);
    registerTask(taskId: string, task: BackgroundTask): void;
    unregisterTask(taskId: string): void;
    getTask(taskId: string): BackgroundTask | undefined;
    createProgressUpdater(taskId: string, task: BackgroundTask): (progress: number, stage?: string) => void;
    updateProgress(taskId: string, task: BackgroundTask, progress: number, stage?: string): void;
    handleTaskCompleted(taskId: string, task: BackgroundTask, result: unknown): void;
    handleTaskFailed(taskId: string, task: BackgroundTask, error: Error): void;
    handleTaskCancelled(taskId: string, task: BackgroundTask): void;
    getProgress(taskId: string): Progress | null;
    getStats(): ExecutionStats;
    getAllTasks(): BackgroundTask[];
    clearFinishedTasks(): number;
    private estimateTimeSaved;
}
//# sourceMappingURL=ExecutionMonitor.d.ts.map