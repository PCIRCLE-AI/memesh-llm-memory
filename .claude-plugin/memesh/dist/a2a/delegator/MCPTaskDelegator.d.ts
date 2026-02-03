import type { TaskQueue } from '../storage/TaskQueue.js';
import type { ILogger } from '../../utils/ILogger.js';
import type { TaskInfo } from './types.js';
export declare class MCPTaskDelegator {
    private pendingTasks;
    private pendingTasksByAgent;
    private taskQueue;
    private logger;
    private metrics;
    constructor(taskQueue: TaskQueue, logger: ILogger);
    addTask(taskId: string, task: string, priority: 'high' | 'medium' | 'low', agentId: string): Promise<void>;
    getPendingTasks(agentId: string): Promise<TaskInfo[]>;
    markTaskInProgress(taskId: string): Promise<void>;
    removeTask(taskId: string): Promise<void>;
    checkTimeouts(): Promise<void>;
}
//# sourceMappingURL=MCPTaskDelegator.d.ts.map