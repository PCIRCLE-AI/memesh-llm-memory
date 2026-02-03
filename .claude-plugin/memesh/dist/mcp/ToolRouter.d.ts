import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { ToolHandlers, BuddyHandlers, A2AToolHandlers } from './handlers/index.js';
import type { SecretManager } from '../memory/SecretManager.js';
import type { TaskQueue } from '../a2a/storage/TaskQueue.js';
import type { MCPTaskDelegator } from '../a2a/delegator/MCPTaskDelegator.js';
export interface ToolRouterConfig {
    rateLimiter: RateLimiter;
    toolHandlers: ToolHandlers;
    buddyHandlers: BuddyHandlers;
    a2aHandlers: A2AToolHandlers;
    secretManager?: SecretManager;
    taskQueue?: TaskQueue;
    mcpTaskDelegator?: MCPTaskDelegator;
    allowedOrigins?: string[];
    transportMode?: 'stdio' | 'http';
}
export declare class ToolRouter {
    private rateLimiter;
    private toolHandlers;
    private buddyHandlers;
    private a2aHandlers;
    private secretManager?;
    private taskQueue?;
    private mcpTaskDelegator?;
    private readonly allowedOrigins?;
    private readonly transportMode;
    constructor(config: ToolRouterConfig);
    private validateRequestOrigin;
    routeToolCall(params: unknown, requestHeaders?: Record<string, string>, requestId?: string): Promise<CallToolResult>;
    private dispatch;
}
//# sourceMappingURL=ToolRouter.d.ts.map