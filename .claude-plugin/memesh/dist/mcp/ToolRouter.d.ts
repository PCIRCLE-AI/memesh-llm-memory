import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { ToolHandlers, BuddyHandlers } from './handlers/index.js';
import type { KnowledgeGraph } from '../knowledge-graph/index.js';
export interface ToolRouterConfig {
    rateLimiter: RateLimiter;
    toolHandlers: ToolHandlers;
    buddyHandlers: BuddyHandlers;
    knowledgeGraph?: KnowledgeGraph;
    allowedOrigins?: string[];
    transportMode?: 'stdio' | 'http';
}
export declare class ToolRouter {
    private rateLimiter;
    private toolHandlers;
    private buddyHandlers;
    private knowledgeGraph?;
    private readonly allowedOrigins?;
    private readonly transportMode;
    constructor(config: ToolRouterConfig);
    private validateRequestOrigin;
    routeToolCall(params: unknown, requestHeaders?: Record<string, string>, requestId?: string): Promise<CallToolResult>;
    private static readonly TOOL_ALIASES;
    private resolveAlias;
    private dispatch;
}
//# sourceMappingURL=ToolRouter.d.ts.map