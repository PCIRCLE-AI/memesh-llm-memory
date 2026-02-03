import { Router } from '../orchestrator/router.js';
import { ResponseFormatter } from '../ui/ResponseFormatter.js';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { HumanInLoopUI } from './HumanInLoopUI.js';
import { FeedbackCollector } from '../evolution/FeedbackCollector.js';
import { PerformanceTracker } from '../evolution/PerformanceTracker.js';
import { LearningManager } from '../evolution/LearningManager.js';
import { EvolutionMonitor } from '../evolution/EvolutionMonitor.js';
import { SkillManager } from '../skills/index.js';
import { UninstallManager } from '../management/index.js';
import { DevelopmentButler } from '../agents/DevelopmentButler.js';
import { CheckpointDetector } from '../core/CheckpointDetector.js';
import { HookIntegration } from '../core/HookIntegration.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import { UnifiedMemoryStore } from '../memory/UnifiedMemoryStore.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { ToolHandlers, BuddyHandlers, A2AToolHandlers } from './handlers/index.js';
import { SamplingClient } from './SamplingClient.js';
import { SecretManager } from '../memory/SecretManager.js';
import { TaskQueue } from '../a2a/storage/TaskQueue.js';
import { MCPTaskDelegator } from '../a2a/delegator/MCPTaskDelegator.js';
export interface ServerComponents {
    router: Router;
    formatter: ResponseFormatter;
    agentRegistry: AgentRegistry;
    ui: HumanInLoopUI;
    feedbackCollector: FeedbackCollector;
    performanceTracker: PerformanceTracker;
    learningManager: LearningManager;
    evolutionMonitor: EvolutionMonitor;
    skillManager: SkillManager;
    uninstallManager: UninstallManager;
    developmentButler: DevelopmentButler;
    checkpointDetector: CheckpointDetector;
    hookIntegration: HookIntegration;
    toolInterface: MCPToolInterface;
    knowledgeGraph: KnowledgeGraph;
    projectMemoryManager: ProjectMemoryManager;
    projectAutoTracker: ProjectAutoTracker;
    unifiedMemoryStore: UnifiedMemoryStore;
    rateLimiter: RateLimiter;
    samplingClient: SamplingClient;
    secretManager: SecretManager;
    taskQueue: TaskQueue;
    mcpTaskDelegator: MCPTaskDelegator;
    toolHandlers: ToolHandlers;
    buddyHandlers: BuddyHandlers;
    a2aHandlers: A2AToolHandlers;
}
export declare class ServerInitializer {
    static initialize(): Promise<ServerComponents>;
}
//# sourceMappingURL=ServerInitializer.d.ts.map