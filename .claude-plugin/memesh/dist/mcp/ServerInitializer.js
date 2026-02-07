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
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';
export class ServerInitializer {
    static async initialize() {
        let knowledgeGraph;
        try {
            const formatter = new ResponseFormatter();
            const agentRegistry = new AgentRegistry();
            const ui = new HumanInLoopUI();
            const skillManager = new SkillManager();
            const uninstallManager = new UninstallManager(skillManager);
            const checkpointDetector = new CheckpointDetector();
            const toolInterface = new MCPToolInterface();
            knowledgeGraph = KnowledgeGraph.createSync();
            const projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);
            const unifiedMemoryStore = new UnifiedMemoryStore(knowledgeGraph);
            const sessionMemoryPipeline = new SessionMemoryPipeline(knowledgeGraph);
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
            const hookIntegration = new HookIntegration(checkpointDetector, projectAutoTracker);
            const rateLimiter = new RateLimiter({
                requestsPerMinute: 30,
            });
            const samplingClient = new SamplingClient(async (_request) => {
                throw new Error('Sampling not yet connected. This will be wired when MCP SDK sampling is available.');
            });
            const toolHandlers = new ToolHandlers(agentRegistry, skillManager, uninstallManager, checkpointDetector, hookIntegration, projectMemoryManager, knowledgeGraph, ui, samplingClient, unifiedMemoryStore);
            const buddyHandlers = new BuddyHandlers(formatter, projectMemoryManager, projectAutoTracker);
            return {
                formatter,
                agentRegistry,
                ui,
                skillManager,
                uninstallManager,
                checkpointDetector,
                hookIntegration,
                toolInterface,
                knowledgeGraph,
                projectMemoryManager,
                projectAutoTracker,
                unifiedMemoryStore,
                sessionMemoryPipeline,
                rateLimiter,
                samplingClient,
                toolHandlers,
                buddyHandlers,
            };
        }
        catch (error) {
            logger.error('Initialization failed, cleaning up resources...');
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