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
export class ServerInitializer {
    static initialize() {
        const router = new Router();
        const formatter = new ResponseFormatter();
        const agentRegistry = new AgentRegistry();
        const ui = new HumanInLoopUI();
        const skillManager = new SkillManager();
        const uninstallManager = new UninstallManager(skillManager);
        const performanceTracker = new PerformanceTracker();
        const learningManager = new LearningManager(performanceTracker);
        const feedbackCollector = new FeedbackCollector(learningManager);
        const evolutionMonitor = new EvolutionMonitor(router.getPerformanceTracker(), router.getLearningManager(), router.getAdaptationEngine());
        const checkpointDetector = new CheckpointDetector();
        const toolInterface = new MCPToolInterface();
        const developmentButler = new DevelopmentButler(checkpointDetector, toolInterface, router.getLearningManager());
        const planningEngine = new PlanningEngine(agentRegistry, router.getLearningManager());
        const gitAssistant = new GitAssistantIntegration(toolInterface);
        const knowledgeGraph = KnowledgeGraph.createSync();
        const projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);
        const projectAutoTracker = new ProjectAutoTracker(toolInterface);
        const devopsEngineer = new DevOpsEngineerAgent(toolInterface);
        const workflowOrchestrator = new WorkflowOrchestrator(toolInterface);
        const rateLimiter = new RateLimiter({
            requestsPerMinute: 30,
        });
        const gitHandlers = new GitHandlers(gitAssistant);
        const toolHandlers = new ToolHandlers(router, agentRegistry, feedbackCollector, performanceTracker, learningManager, evolutionMonitor, skillManager, uninstallManager, developmentButler, checkpointDetector, planningEngine, projectMemoryManager, knowledgeGraph, ui, devopsEngineer, workflowOrchestrator);
        const buddyHandlers = new BuddyHandlers(router, formatter, projectMemoryManager);
        return {
            router,
            formatter,
            agentRegistry,
            ui,
            feedbackCollector,
            performanceTracker,
            learningManager,
            evolutionMonitor,
            skillManager,
            uninstallManager,
            developmentButler,
            checkpointDetector,
            toolInterface,
            planningEngine,
            gitAssistant,
            knowledgeGraph,
            projectMemoryManager,
            projectAutoTracker,
            devopsEngineer,
            workflowOrchestrator,
            rateLimiter,
            gitHandlers,
            toolHandlers,
            buddyHandlers,
        };
    }
}
//# sourceMappingURL=ServerInitializer.js.map