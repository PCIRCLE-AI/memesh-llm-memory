import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
export declare class SessionBootstrapper {
    private projectMemoryManager;
    private memoryLimit;
    private hasInjected;
    constructor(projectMemoryManager: ProjectMemoryManager, memoryLimit?: number);
    maybePrepend(result: CallToolResult): Promise<CallToolResult>;
    private buildStartupMessage;
}
//# sourceMappingURL=SessionBootstrapper.d.ts.map