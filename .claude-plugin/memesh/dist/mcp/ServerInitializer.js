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
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';
export class ServerInitializer {
    static async initialize() {
        let knowledgeGraph;
        let secretManager;
        let taskQueue;
        try {
            const router = new Router();
            const formatter = new ResponseFormatter();
            const agentRegistry = new AgentRegistry();
            const ui = new HumanInLoopUI();
            const skillManager = new SkillManager();
            const uninstallManager = new UninstallManager(skillManager);
            const performanceTracker = new PerformanceTracker();
            const learningManager = new LearningManager();
            const feedbackCollector = new FeedbackCollector();
            const evolutionMonitor = new EvolutionMonitor(router.getPerformanceTracker(), router.getLearningManager());
            const checkpointDetector = new CheckpointDetector();
            const toolInterface = new MCPToolInterface();
            knowledgeGraph = KnowledgeGraph.createSync();
            const projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);
            const unifiedMemoryStore = new UnifiedMemoryStore(knowledgeGraph);
            const developmentButler = new DevelopmentButler(checkpointDetector, toolInterface, router.getLearningManager(), unifiedMemoryStore);
            toolInterface.attachMemoryProvider({
                createEntities: async ({ entities }) => {
                    for (const entity of entities) {
                        knowledgeGraph.createEntity({
                            name: entity.name,
                            entityType: entity.entityType,
                            observations: entity.observations,
                            metadata: entity.metadata,
                        });
                    }
                },
                searchNodes: async (query) => {
                    return knowledgeGraph.searchEntities({
                        namePattern: query,
                        limit: 10,
                    });
                },
            });
            const projectAutoTracker = new ProjectAutoTracker(toolInterface);
            const hookIntegration = new HookIntegration(checkpointDetector, developmentButler, projectAutoTracker);
            const rateLimiter = new RateLimiter({
                requestsPerMinute: 30,
            });
            const samplingClient = new SamplingClient(async (request) => {
                throw new Error('Sampling not yet connected. This will be wired when MCP SDK sampling is available.');
            });
            secretManager = await SecretManager.create();
            taskQueue = new TaskQueue('mcp-server');
            const mcpTaskDelegator = new MCPTaskDelegator(taskQueue, logger);
            const toolHandlers = new ToolHandlers(router, agentRegistry, feedbackCollector, performanceTracker, learningManager, evolutionMonitor, skillManager, uninstallManager, developmentButler, checkpointDetector, hookIntegration, projectMemoryManager, knowledgeGraph, ui, samplingClient, unifiedMemoryStore);
            const buddyHandlers = new BuddyHandlers(router, formatter, projectMemoryManager, projectAutoTracker);
            const a2aHandlers = new A2AToolHandlers();
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
                hookIntegration,
                toolInterface,
                knowledgeGraph,
                projectMemoryManager,
                projectAutoTracker,
                unifiedMemoryStore,
                rateLimiter,
                samplingClient,
                secretManager,
                taskQueue,
                mcpTaskDelegator,
                toolHandlers,
                buddyHandlers,
                a2aHandlers,
            };
        }
        catch (error) {
            logger.error('Initialization failed, cleaning up resources...');
            if (taskQueue) {
                try {
                    taskQueue.close();
                    logger.info('TaskQueue cleaned up');
                }
                catch (cleanupError) {
                    logger.error('Failed to clean up TaskQueue:', cleanupError);
                }
            }
            if (secretManager) {
                try {
                    secretManager.close();
                    logger.info('SecretManager cleaned up');
                }
                catch (cleanupError) {
                    logger.error('Failed to clean up SecretManager:', cleanupError);
                }
            }
            if (knowledgeGraph) {
                try {
                    await knowledgeGraph.close();
                    logger.info('KnowledgeGraph cleaned up');
                }
                catch (cleanupError) {
                    logger.error('Failed to clean up KnowledgeGraph:', cleanupError);
                }
            }
            logError(error, {
                component: 'ServerInitializer',
                method: 'initialize',
                operation: 'server initialization',
            });
            throw error;
        }
    }
}
//# sourceMappingURL=ServerInitializer.js.map