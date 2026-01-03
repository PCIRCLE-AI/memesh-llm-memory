import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResponseFormatter } from '../ui/ResponseFormatter.js';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { Router } from '../orchestrator/router.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { GitHandlers, ToolHandlers, BuddyHandlers } from './handlers/index.js';
export interface ToolRouterConfig {
    router: Router;
    formatter: ResponseFormatter;
    agentRegistry: AgentRegistry;
    rateLimiter: RateLimiter;
    gitHandlers: GitHandlers;
    toolHandlers: ToolHandlers;
    buddyHandlers: BuddyHandlers;
}
export declare class ToolRouter {
    private router;
    private formatter;
    private agentRegistry;
    private rateLimiter;
    private gitHandlers;
    private toolHandlers;
    private buddyHandlers;
    constructor(config: ToolRouterConfig);
    routeToolCall(params: unknown): Promise<CallToolResult>;
    private dispatch;
    private handleAgentInvocation;
    private isValidAgent;
}
//# sourceMappingURL=ToolRouter.d.ts.map