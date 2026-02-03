export class TaskExecutor {
    taskQueue;
    logger;
    delegator;
    constructor(taskQueue, logger, delegator) {
        this.taskQueue = taskQueue;
        this.logger = logger;
        this.delegator = delegator;
    }
    async executeTask(taskId, task, agentId) {
        await this.delegator.addTask(taskId, task, 'medium', agentId);
        this.logger.info(`Task delegated to MCP Client: ${taskId}`);
    }
}
//# sourceMappingURL=TaskExecutor.js.map