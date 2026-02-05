import type { SendMessageRequest, SendMessageResponse, Task, TaskStatus, TaskState, AgentCard, TaskResult } from '../types/index.js';
import { type RetryOptions } from '../../utils/retry.js';
export declare class A2AClient {
    private registry;
    private retryConfig;
    constructor(retryConfig?: Partial<RetryOptions>);
    private validateId;
    private getAuthHeaders;
    private fetchWithTimeout;
    private isRetryableHttpError;
    sendMessage(targetAgentId: string, request: SendMessageRequest): Promise<SendMessageResponse>;
    getTask(targetAgentId: string, taskId: string): Promise<Task>;
    listTasks(targetAgentId: string, params?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<TaskStatus[]>;
    getAgentCard(targetAgentId: string): Promise<AgentCard>;
    cancelTask(targetAgentId: string, taskId: string): Promise<void>;
    getTaskResult(targetAgentId: string, taskId: string): Promise<TaskResult>;
    updateTaskState(taskId: string, state: TaskState, data?: {
        result?: unknown;
        error?: string;
    }): Promise<void>;
    private validateContentType;
    private handleResponse;
    listAvailableAgents(): string[];
}
//# sourceMappingURL=A2AClient.d.ts.map