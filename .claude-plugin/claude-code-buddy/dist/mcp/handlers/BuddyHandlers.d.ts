import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
export declare class BuddyHandlers {
    private router;
    private formatter;
    private projectMemoryManager;
    constructor(router: Router, formatter: ResponseFormatter, projectMemoryManager: ProjectMemoryManager);
    handleBuddyDo(args: unknown): Promise<CallToolResult>;
    handleBuddyStats(args: unknown): Promise<CallToolResult>;
    handleBuddyRemember(args: unknown): Promise<CallToolResult>;
    handleBuddyHelp(args: unknown): Promise<CallToolResult>;
}
//# sourceMappingURL=BuddyHandlers.d.ts.map