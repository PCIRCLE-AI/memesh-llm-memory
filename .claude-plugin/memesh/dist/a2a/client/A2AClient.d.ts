import type { SendMessageRequest, SendMessageResponse, Task, TaskStatus, AgentCard } from '../types/index.js';
import { type RetryOptions } from '../../utils/retry.js';
export declare class A2AClient {
    private registry;
    private retryConfig;
    constructor(retryConfig?: Partial<RetryOptions>);
    private getAuthHeaders;
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
    private handleResponse;
    listAvailableAgents(): string[];
}
//# sourceMappingURL=A2AClient.d.ts.map