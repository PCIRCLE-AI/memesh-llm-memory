/**
 * Server Initialization Logic
 *
 * Responsible for:
 * - Initializing all server components
 * - Setting up evolution monitoring
 * - Creating handler modules
 */

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
import type { EntityType } from '../knowledge-graph/types.js';
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

/**
 * Initialized Server Components
 */
export interface ServerComponents {
  // Core components
  router: Router;
  formatter: ResponseFormatter;
  agentRegistry: AgentRegistry;
  ui: HumanInLoopUI;

  // Evolution system
  feedbackCollector: FeedbackCollector;
  performanceTracker: PerformanceTracker;
  learningManager: LearningManager;
  evolutionMonitor: EvolutionMonitor;

  // Management
  skillManager: SkillManager;
  uninstallManager: UninstallManager;

  // DevelopmentButler
  developmentButler: DevelopmentButler;
  checkpointDetector: CheckpointDetector;
  hookIntegration: HookIntegration;
  toolInterface: MCPToolInterface;

  // Memory & Knowledge
  knowledgeGraph: KnowledgeGraph;
  projectMemoryManager: ProjectMemoryManager;
  projectAutoTracker: ProjectAutoTracker;
  unifiedMemoryStore: UnifiedMemoryStore;

  // Rate limiting
  rateLimiter: RateLimiter;

  // Sampling
  samplingClient: SamplingClient;

  // Security & Task Management
  secretManager: SecretManager;
  taskQueue: TaskQueue;
  mcpTaskDelegator: MCPTaskDelegator;

  // Handler modules
  toolHandlers: ToolHandlers;
  buddyHandlers: BuddyHandlers;
  a2aHandlers: A2AToolHandlers;
}

/**
 * Server Initializer
 *
 * Centralized initialization logic for all server components. Ensures components
 * are initialized in the correct dependency order to avoid circular dependencies
 * and initialization race conditions.
 *
 * This class uses the static factory pattern to create and wire together all
 * server components in a single, atomic operation.
 *
 * @remarks
 * The initialization order is critical:
 * 1. Core components (Router, Formatter, Registry)
 * 2. Evolution system (Performance, Learning, Monitoring)
 * 3. Development tools (Butler, Planning)
 * 4. Memory systems (Knowledge Graph, Project Memory)
 * 5. Hook integration
 * 6. Handler modules (Tool, Buddy)
 */
export class ServerInitializer {
  /**
   * Initialize all server components
   *
   * Creates and configures all server components in the correct dependency order.
   * This is a static factory method that returns a fully-wired ServerComponents object.
   *
   * **Initialization Phases**:
   * 1. **Core Infrastructure**: Router, Formatter, AgentRegistry, UI
   * 2. **Evolution System**: Performance tracking, learning, adaptation
   * 3. **Development Tools**: DevelopmentButler
   * 4. **Memory Systems**: KnowledgeGraph, ProjectMemoryManager, ProjectAutoTracker
   * 5. **Security & Task Management**: SecretManager, TaskQueue, MCPTaskDelegator
   * 6. **Hook Integration**: HookIntegration
   * 7. **Handler Modules**: ToolHandlers, BuddyHandlers
   *
   * @returns Promise<ServerComponents> - Fully initialized and wired components
   *
   * @example
   * ```typescript
   * const components = await ServerInitializer.initialize();
   *
   * // Access initialized components
   * const router = components.router;
   * const agentRegistry = components.agentRegistry;
   * const knowledgeGraph = components.knowledgeGraph;
   * ```
   */
  static async initialize(): Promise<ServerComponents> {
    // Track resources that need cleanup on error
    let knowledgeGraph: KnowledgeGraph | undefined;
    let secretManager: SecretManager | undefined;
    let taskQueue: TaskQueue | undefined;

    try {
      // Core components
      const router = new Router();
      const formatter = new ResponseFormatter();
      const agentRegistry = new AgentRegistry();
      const ui = new HumanInLoopUI();
      const skillManager = new SkillManager();
      const uninstallManager = new UninstallManager(skillManager);

      // Initialize evolution system
      const performanceTracker = new PerformanceTracker();
      const learningManager = new LearningManager();
      const feedbackCollector = new FeedbackCollector();

      // Initialize evolution monitor using Router's evolution components
      const evolutionMonitor = new EvolutionMonitor(
        router.getPerformanceTracker(),
        router.getLearningManager()
      );

      // Initialize DevelopmentButler components
      const checkpointDetector = new CheckpointDetector();
      const toolInterface = new MCPToolInterface();

      // Initialize Project Memory System (track for cleanup)
      knowledgeGraph = KnowledgeGraph.createSync();
      const projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);

      // Initialize Unified Memory Store (Phase 0.7.0)
      const unifiedMemoryStore = new UnifiedMemoryStore(knowledgeGraph);

      // Initialize DevelopmentButler with UnifiedMemoryStore
      const developmentButler = new DevelopmentButler(
        checkpointDetector,
        toolInterface,
        router.getLearningManager(),
        unifiedMemoryStore
      );
      toolInterface.attachMemoryProvider({
        createEntities: async ({ entities }) => {
          for (const entity of entities) {
            knowledgeGraph!.createEntity({
              name: entity.name,
              entityType: entity.entityType as EntityType,
              observations: entity.observations,
              metadata: entity.metadata,
            });
          }
        },
        searchNodes: async (query: string) => {
          return knowledgeGraph!.searchEntities({
            namePattern: query,
            limit: 10,
          });
        },
      });

      // Initialize ProjectAutoTracker (automatic knowledge tracking)
      const projectAutoTracker = new ProjectAutoTracker(toolInterface);

      // Initialize Hook Integration (bridges Claude Code hooks to checkpoints)
      const hookIntegration = new HookIntegration(
        checkpointDetector,
        developmentButler,
        projectAutoTracker
      );

      // Initialize Rate Limiter (30 requests per minute)
      const rateLimiter = new RateLimiter({
        requestsPerMinute: 30, // Conservative limit to prevent DoS attacks
      });

      // Initialize Sampling Client (placeholder - will be connected when server has sampling capability)
      // Note: The actual sampleFn will be provided by the MCP server instance
      const samplingClient = new SamplingClient(async (request) => {
        throw new Error('Sampling not yet connected. This will be wired when MCP SDK sampling is available.');
      });

      // Initialize Security & Task Management (Phase 5)
      // SecretManager: Secure storage for API tokens and sensitive data (track for cleanup)
      secretManager = await SecretManager.create();

      // TaskQueue: SQLite-based task storage (using 'mcp-server' as default agent ID) (track for cleanup)
      taskQueue = new TaskQueue('mcp-server');

      // MCPTaskDelegator: Manages task delegation from A2A agents to MCP clients
      const mcpTaskDelegator = new MCPTaskDelegator(taskQueue, logger);

      // Initialize handler modules
      const toolHandlers = new ToolHandlers(
        router,
        agentRegistry,
        feedbackCollector,
        performanceTracker,
        learningManager,
        evolutionMonitor,
        skillManager,
        uninstallManager,
        developmentButler,
        checkpointDetector,
        hookIntegration,
        projectMemoryManager,
        knowledgeGraph,
        ui,
        samplingClient,
        unifiedMemoryStore
      );

      const buddyHandlers = new BuddyHandlers(
        router,
        formatter,
        projectMemoryManager,
        projectAutoTracker
      );

      // Initialize A2A handlers
      const a2aHandlers = new A2AToolHandlers();

      // Return all initialized components
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
    } catch (error) {
      // ✅ FIX MAJOR-13: Clean up resources on initialization failure
      logger.error('Initialization failed, cleaning up resources...');

      // Clean up database connections in reverse order of creation
      if (taskQueue) {
        try {
          taskQueue.close();
          logger.info('TaskQueue cleaned up');
        } catch (cleanupError) {
          logger.error('Failed to clean up TaskQueue:', cleanupError);
        }
      }

      if (secretManager) {
        try {
          secretManager.close();
          logger.info('SecretManager cleaned up');
        } catch (cleanupError) {
          logger.error('Failed to clean up SecretManager:', cleanupError);
        }
      }

      if (knowledgeGraph) {
        try {
          await knowledgeGraph.close();
          logger.info('KnowledgeGraph cleaned up');
        } catch (cleanupError) {
          logger.error('Failed to clean up KnowledgeGraph:', cleanupError);
        }
      }

      // Re-throw the original error after cleanup
      logError(error, {
        component: 'ServerInitializer',
        method: 'initialize',
        operation: 'server initialization',
      });
      throw error;
    }
  }
}
