import type { TaskQueue } from '../storage/TaskQueue.js';
import type { ILogger } from '../../utils/ILogger.js';
import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
export declare class TaskExecutor {
    private taskQueue;
    private logger;
    private delegator;
    constructor(taskQueue: TaskQueue, logger: ILogger, delegator: MCPTaskDelegator);
    executeTask(taskId: string, task: string, agentId: string): Promise<void>;
}
//# sourceMappingURL=TaskExecutor.d.ts.map