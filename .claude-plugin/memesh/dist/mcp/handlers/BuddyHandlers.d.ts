import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import type { ProjectAutoTracker } from '../../memory/ProjectAutoTracker.js';
export declare class BuddyHandlers {
    private formatter;
    private projectMemoryManager;
    private autoTracker?;
    constructor(formatter: ResponseFormatter, projectMemoryManager: ProjectMemoryManager | undefined, autoTracker?: ProjectAutoTracker);
    private isCloudOnlyMode;
    private cloudOnlyModeError;
    handleBuddyDo(args: unknown): Promise<CallToolResult>;
    handleBuddyRemember(args: unknown): Promise<CallToolResult>;
    handleBuddyHelp(args: unknown): Promise<CallToolResult>;
}
//# sourceMappingURL=BuddyHandlers.d.ts.map