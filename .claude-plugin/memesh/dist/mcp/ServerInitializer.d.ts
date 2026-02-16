import { ResponseFormatter } from '../ui/ResponseFormatter.js';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { HumanInLoopUI } from './HumanInLoopUI.js';
import { SkillManager } from '../skills/index.js';
import { UninstallManager } from '../management/index.js';
import { CheckpointDetector } from '../core/CheckpointDetector.js';
import { HookIntegration } from '../core/HookIntegration.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import { UnifiedMemoryStore } from '../memory/UnifiedMemoryStore.js';
import { SessionMemoryPipeline } from '../integrations/session-memory/index.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { ToolHandlers, BuddyHandlers } from './handlers/index.js';
import { SamplingClient } from './SamplingClient.js';
export interface ServerComponents {
    formatter: ResponseFormatter;
    agentRegistry: AgentRegistry;
    ui: HumanInLoopUI;
    skillManager: SkillManager;
    uninstallManager: UninstallManager;
    checkpointDetector: CheckpointDetector;
    hookIntegration: HookIntegration;
    toolInterface: MCPToolInterface;
    knowledgeGraph: KnowledgeGraph | undefined;
    projectMemoryManager: ProjectMemoryManager | undefined;
    projectAutoTracker: ProjectAutoTracker;
    unifiedMemoryStore: UnifiedMemoryStore | undefined;
    sessionMemoryPipeline: SessionMemoryPipeline | undefined;
    cloudOnlyMode: boolean;
    rateLimiter: RateLimiter;
    samplingClient: SamplingClient;
    toolHandlers: ToolHandlers;
    buddyHandlers: BuddyHandlers;
}
export declare class ServerInitializer {
    static initialize(): Promise<ServerComponents>;
}
//# sourceMappingURL=ServerInitializer.d.ts.map