import { TIME, LIMITS, ENV_KEYS } from '../constants.js';
import { A2AMetrics, METRIC_NAMES } from '../metrics/index.js';
import { ErrorCodes, createError, formatErrorMessage } from '../errors/index.js';
export class MCPTaskDelegator {
    pendingTasks;
    pendingTasksByAgent;
    taskQueue;
    logger;
    metrics;
    constructor(taskQueue, logger) {
        this.pendingTasks = new Map();
        this.pendingTasksByAgent = new Map();
        this.taskQueue = taskQueue;
        this.logger = logger;
        this.metrics = A2AMetrics.getInstance();
    }
    async addTask(taskId, task, priority, agentId) {
        const agentTaskSet = this.pendingTasksByAgent.get(agentId);
        const agentTaskCount = agentTaskSet ? agentTaskSet.size : 0;
        if (agentTaskCount >= LIMITS.MAX_CONCURRENT_TASKS_PHASE_1) {
            throw createError(ErrorCodes.AGENT_ALREADY_PROCESSING, 'Phase 1.0');
        }
        const taskInfo = {
            taskId,
            task,
            priority,
            agentId,
            createdAt: Date.now(),
            status: 'PENDING'
        };
        this.pendingTasks.set(taskId, taskInfo);
        if (!agentTaskSet) {
            this.pendingTasksByAgent.set(agentId, new Set([taskId]));
        }
        else {
            agentTaskSet.add(taskId);
        }
        this.logger.info('[MCPTaskDelegator] Task added to delegation queue', { taskId, agentId });
        this.metrics.incrementCounter(METRIC_NAMES.TASKS_SUBMITTED, { agentId, priority });
        this.metrics.setGauge(METRIC_NAMES.QUEUE_SIZE, this.pendingTasks.size, { agentId });
    }
    async getPendingTasks(agentId) {
        const taskIds = this.pendingTasksByAgent.get(agentId);
        if (!taskIds || taskIds.size === 0) {
            return [];
        }
        const tasks = [];
        for (const taskId of taskIds) {
            const taskInfo = this.pendingTasks.get(taskId);
            if (taskInfo && taskInfo.status === 'PENDING') {
                tasks.push(taskInfo);
            }
        }
        return tasks;
    }
    async markTaskInProgress(taskId) {
        const taskInfo = this.pendingTasks.get(taskId);
        if (taskInfo) {
            taskInfo.status = 'IN_PROGRESS';
            this.logger.info('[MCPTaskDelegator] Task marked as in-progress', { taskId });
        }
        else {
            this.logger.warn('[MCPTaskDelegator] Task not found for progress update', { taskId });
        }
    }
    async removeTask(taskId) {
        const taskInfo = this.pendingTasks.get(taskId);
        const removed = this.pendingTasks.delete(taskId);
        if (removed && taskInfo) {
            const agentTaskSet = this.pendingTasksByAgent.get(taskInfo.agentId);
            if (agentTaskSet) {
                agentTaskSet.delete(taskId);
                if (agentTaskSet.size === 0) {
                    this.pendingTasksByAgent.delete(taskInfo.agentId);
                }
            }
            this.logger.info('[MCPTaskDelegator] Task removed from delegation queue', { taskId });
            this.metrics.setGauge(METRIC_NAMES.QUEUE_SIZE, this.pendingTasks.size, {
                agentId: taskInfo.agentId
            });
        }
        else {
            this.logger.warn('[MCPTaskDelegator] Task not found for removal', { taskId });
        }
    }
    static TIMEOUT_BOUNDS = {
        min: 5_000,
        max: 3_600_000,
        default: TIME.TASK_TIMEOUT_MS,
    };
    getTaskTimeout() {
        const envValue = process.env[ENV_KEYS.TASK_TIMEOUT];
        if (!envValue) {
            return MCPTaskDelegator.TIMEOUT_BOUNDS.default;
        }
        const raw = parseInt(envValue, 10);
        const bounds = MCPTaskDelegator.TIMEOUT_BOUNDS;
        if (Number.isNaN(raw)) {
            this.logger.warn(`[MCPTaskDelegator] Invalid (NaN) ${ENV_KEYS.TASK_TIMEOUT} env var: "${envValue}", using default ${bounds.default}ms`);
            return bounds.default;
        }
        if (raw < bounds.min) {
            this.logger.warn(`[MCPTaskDelegator] ${ENV_KEYS.TASK_TIMEOUT} value ${raw}ms is below minimum ${bounds.min}ms, clamping to ${bounds.min}ms`);
            return bounds.min;
        }
        if (raw > bounds.max) {
            this.logger.warn(`[MCPTaskDelegator] ${ENV_KEYS.TASK_TIMEOUT} value ${raw}ms exceeds maximum ${bounds.max}ms, clamping to ${bounds.max}ms`);
            return bounds.max;
        }
        return raw;
    }
    async checkTimeouts() {
        let tasksChecked = 0;
        try {
            const now = Date.now();
            const timeout = this.getTaskTimeout();
            const timeoutSeconds = timeout / 1000;
            const timedOutTasks = [];
            for (const [taskId, taskInfo] of this.pendingTasks) {
                tasksChecked++;
                if (now - taskInfo.createdAt > timeout) {
                    timedOutTasks.push({ taskId, taskInfo });
                }
            }
            for (const { taskId, taskInfo } of timedOutTasks) {
                try {
                    const timeoutMessage = formatErrorMessage(ErrorCodes.TASK_TIMEOUT, taskId, timeoutSeconds);
                    this.logger.warn('[MCPTaskDelegator] Task timeout detected', {
                        taskId,
                        agentId: taskInfo.agentId,
                        timeoutSeconds,
                        taskAge: Math.floor((now - taskInfo.createdAt) / 1000),
                    });
                    const updated = this.taskQueue.updateTaskStatus(taskId, {
                        state: 'TIMEOUT',
                        metadata: { error: timeoutMessage }
                    });
                    if (!updated) {
                        this.logger.error('[MCPTaskDelegator] Failed to update timeout status for task', { taskId });
                        continue;
                    }
                    this.pendingTasks.delete(taskId);
                    const agentTaskSet = this.pendingTasksByAgent.get(taskInfo.agentId);
                    if (agentTaskSet) {
                        agentTaskSet.delete(taskId);
                        if (agentTaskSet.size === 0) {
                            this.pendingTasksByAgent.delete(taskInfo.agentId);
                        }
                    }
                    this.logger.info('[MCPTaskDelegator] Task removed from pending queue after timeout', { taskId });
                    this.metrics.incrementCounter(METRIC_NAMES.TASKS_TIMEOUT, {
                        agentId: taskInfo.agentId,
                        priority: taskInfo.priority
                    });
                    this.metrics.setGauge(METRIC_NAMES.QUEUE_SIZE, this.pendingTasks.size, {
                        agentId: taskInfo.agentId
                    });
                }
                catch (error) {
                    this.logger.error('[MCPTaskDelegator] Error processing timeout', {
                        taskId,
                        error: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                }
            }
            if (timedOutTasks.length > 0) {
                this.logger.info('[MCPTaskDelegator] Timeout check completed', {
                    timeoutCount: timedOutTasks.length,
                    remainingTasks: this.pendingTasks.size,
                });
            }
        }
        catch (error) {
            this.logger.error('[MCPTaskDelegator] Unhandled error in checkTimeouts', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                tasksChecked,
                pendingTaskCount: this.pendingTasks.size,
            });
        }
    }
}
//# sourceMappingURL=MCPTaskDelegator.js.map