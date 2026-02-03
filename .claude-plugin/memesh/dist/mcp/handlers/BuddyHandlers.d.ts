import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Router } from '../../orchestrator/router.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import type { ProjectAutoTracker } from '../../memory/ProjectAutoTracker.js';
export declare class BuddyHandlers {
    private router;
    private formatter;
    private projectMemoryManager;
    private autoTracker?;
    constructor(router: Router, formatter: ResponseFormatter, projectMemoryManager: ProjectMemoryManager, autoTracker?: ProjectAutoTracker);
    handleBuddyDo(args: unknown): Promise<CallToolResult>;
    handleBuddyRemember(args: unknown): Promise<CallToolResult>;
    handleBuddyHelp(args: unknown): Promise<CallToolResult>;
}
//# sourceMappingURL=BuddyHandlers.d.ts.map