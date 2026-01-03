import { ResourceMonitor } from './ResourceMonitor.js';
import { ExecutionQueue } from './ExecutionQueue.js';
import { BackgroundTask, ExecutionConfig } from './types.js';
export declare class TaskScheduler {
    private queue;
    private resourceMonitor;
    constructor(resourceMonitor: ResourceMonitor);
    enqueue(task: BackgroundTask): void;
    getNextTask(config?: ExecutionConfig): BackgroundTask | undefined;
    peek(): BackgroundTask | undefined;
    removeTask(taskId: string): boolean;
    isEmpty(): boolean;
    size(): number;
    getStats(): ReturnType<ExecutionQueue['getStats']>;
    getAllTasks(): BackgroundTask[];
    findTask(taskId: string): BackgroundTask | undefined;
    clear(): void;
}
//# sourceMappingURL=TaskScheduler.d.ts.map