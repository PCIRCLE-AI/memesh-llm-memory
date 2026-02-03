import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { A2AClient } from '../../a2a/client/A2AClient.js';
import { AgentRegistry } from '../../a2a/storage/AgentRegistry.js';
export declare class A2AToolHandlers {
    private client;
    private registry;
    constructor(client?: A2AClient, registry?: AgentRegistry);
    handleA2ASendTask(args: unknown): Promise<CallToolResult>;
    handleA2AGetTask(args: unknown): Promise<CallToolResult>;
    handleA2AListTasks(args: unknown): Promise<CallToolResult>;
    handleA2AListAgents(args: unknown): Promise<CallToolResult>;
    private formatTaskSentResponse;
    private formatTaskDetailsResponse;
    private formatTaskListResponse;
    private formatAgentListResponse;
}
//# sourceMappingURL=A2AToolHandlers.d.ts.map