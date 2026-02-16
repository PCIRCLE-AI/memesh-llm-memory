import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import type { SessionMemoryPipeline } from '../integrations/session-memory/index.js';
export declare class SessionBootstrapper {
    private projectMemoryManager;
    private memoryLimit;
    private sessionMemoryPipeline?;
    private hasInjected;
    constructor(projectMemoryManager: ProjectMemoryManager | undefined, memoryLimit?: number, sessionMemoryPipeline?: SessionMemoryPipeline | undefined);
    maybePrepend(result: CallToolResult): Promise<CallToolResult>;
    private buildStartupMessage;
}
//# sourceMappingURL=SessionBootstrapper.d.ts.map