import { BackgroundTask, TaskPriority } from './types.js';
export declare class ExecutionQueue {
    private queues;
    private priorityOrder;
    constructor();
    enqueue(task: BackgroundTask): void;
    dequeue(): BackgroundTask | undefined;
    peek(): BackgroundTask | undefined;
    size(): number;
    sizeByPriority(priority: TaskPriority): number;
    remove(taskId: string): boolean;
    clear(): void;
    getAllTasks(): BackgroundTask[];
    findTask(taskId: string): BackgroundTask | undefined;
    getStats(): {
        total: number;
        byPriority: Record<TaskPriority, number>;
    };
    isEmpty(): boolean;
}
//# sourceMappingURL=ExecutionQueue.d.ts.map