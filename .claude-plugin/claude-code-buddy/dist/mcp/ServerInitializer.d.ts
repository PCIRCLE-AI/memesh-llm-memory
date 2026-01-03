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
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { PlanningEngine } from '../planning/PlanningEngine.js';
import { GitAssistantIntegration } from '../integrations/GitAssistantIntegration.js';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { GitHandlers, ToolHandlers, BuddyHandlers } from './handlers/index.js';
import { DevOpsEngineerAgent } from '../agents/DevOpsEngineerAgent.js';
import { WorkflowOrchestrator } from '../agents/WorkflowOrchestrator.js';
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
    toolInterface: MCPToolInterface;
    planningEngine: PlanningEngine;
    gitAssistant: GitAssistantIntegration;
    knowledgeGraph: KnowledgeGraph;
    projectMemoryManager: ProjectMemoryManager;
    projectAutoTracker: ProjectAutoTracker;
    devopsEngineer: DevOpsEngineerAgent;
    workflowOrchestrator: WorkflowOrchestrator;
    rateLimiter: RateLimiter;
    gitHandlers: GitHandlers;
    toolHandlers: ToolHandlers;
    buddyHandlers: BuddyHandlers;
}
export declare class ServerInitializer {
    static initialize(): ServerComponents;
}
//# sourceMappingURL=ServerInitializer.d.ts.map