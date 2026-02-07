/**
 * Server Initialization Logic
 *
 * Responsible for:
 * - Initializing all server components
 * - Setting up memory systems
 * - Creating handler modules
 */

import { ResponseFormatter } from '../ui/ResponseFormatter.js';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { HumanInLoopUI } from './HumanInLoopUI.js';
import { SkillManager } from '../skills/index.js';
import { UninstallManager } from '../management/index.js';
import { CheckpointDetector } from '../core/CheckpointDetector.js';
import { HookIntegration } from '../core/HookIntegration.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { EntityType } from '../knowledge-graph/types.js';
import { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import { UnifiedMemoryStore } from '../memory/UnifiedMemoryStore.js';
import { SessionMemoryPipeline } from '../integrations/session-memory/index.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { ToolHandlers, BuddyHandlers } from './handlers/index.js';
import { SamplingClient } from './SamplingClient.js';
import { SecretManager } from '../memory/SecretManager.js';
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';

/**
 * Initialized Server Components
 */
export interface ServerComponents {
  // Core components
  formatter: ResponseFormatter;
  agentRegistry: AgentRegistry;
  ui: HumanInLoopUI;

  // Management
  skillManager: SkillManager;
  uninstallManager: UninstallManager;

  // Checkpoint & Hook
  checkpointDetector: CheckpointDetector;
  hookIntegration: HookIntegration;
  toolInterface: MCPToolInterface;

  // Memory & Knowledge
  knowledgeGraph: KnowledgeGraph;
  projectMemoryManager: ProjectMemoryManager;
  projectAutoTracker: ProjectAutoTracker;
  unifiedMemoryStore: UnifiedMemoryStore;
  sessionMemoryPipeline: SessionMemoryPipeline;

  // Rate limiting
  rateLimiter: RateLimiter;

  // Sampling
  samplingClient: SamplingClient;

  // Security
  secretManager: SecretManager;

  // Handler modules
  toolHandlers: ToolHandlers;
  buddyHandlers: BuddyHandlers;
}

/**
 * Server Initializer
 *
 * Centralized initialization logic for all server components. Ensures components
 * are initialized in the correct dependency order.
 *
 * Initialization order:
 * 1. Core components (Formatter, Registry, UI)
 * 2. Memory systems (Knowledge Graph, Project Memory, Unified Memory)
 * 3. Hook integration (CheckpointDetector, HookIntegration)
 * 4. Handler modules (Tool, Buddy)
 */
export class ServerInitializer {
  /**
   * Initialize all server components
   *
   * @returns Promise<ServerComponents> - Fully initialized and wired components
   */
  static async initialize(): Promise<ServerComponents> {
    // Track resources that need cleanup on error
    let knowledgeGraph: KnowledgeGraph | undefined;
    let secretManager: SecretManager | undefined;

    try {
      // Core components
      const formatter = new ResponseFormatter();
      const agentRegistry = new AgentRegistry();
      const ui = new HumanInLoopUI();
      const skillManager = new SkillManager();
      const uninstallManager = new UninstallManager(skillManager);

      // Initialize checkpoint & tool interface
      const checkpointDetector = new CheckpointDetector();
      const toolInterface = new MCPToolInterface();

      // Initialize Project Memory System (track for cleanup)
      knowledgeGraph = KnowledgeGraph.createSync();
      const projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);

      // Initialize Unified Memory Store
      const unifiedMemoryStore = new UnifiedMemoryStore(knowledgeGraph);

      // Initialize Session Memory Pipeline (file watcher -> parser -> KG ingester)
      const sessionMemoryPipeline = new SessionMemoryPipeline(knowledgeGraph);

      // Attach memory provider to tool interface
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
        projectAutoTracker
      );

      // Initialize Rate Limiter (30 requests per minute)
      const rateLimiter = new RateLimiter({
        requestsPerMinute: 30,
      });

      // Initialize Sampling Client (placeholder)
      const samplingClient = new SamplingClient(async (_request) => {
        throw new Error('Sampling not yet connected. This will be wired when MCP SDK sampling is available.');
      });

      // Initialize Security
      secretManager = await SecretManager.create();

      // Initialize handler modules
      const toolHandlers = new ToolHandlers(
        agentRegistry,
        skillManager,
        uninstallManager,
        checkpointDetector,
        hookIntegration,
        projectMemoryManager,
        knowledgeGraph,
        ui,
        samplingClient,
        unifiedMemoryStore
      );

      const buddyHandlers = new BuddyHandlers(
        formatter,
        projectMemoryManager,
        projectAutoTracker,
        knowledgeGraph
      );

      // Return all initialized components
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
        secretManager,
        toolHandlers,
        buddyHandlers,
      };
    } catch (error) {
      // Clean up resources on initialization failure
      logger.error('Initialization failed, cleaning up resources...');

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

      logError(error, {
        component: 'ServerInitializer',
        method: 'initialize',
        operation: 'server initialization',
      });
      throw error;
    }
  }
}
