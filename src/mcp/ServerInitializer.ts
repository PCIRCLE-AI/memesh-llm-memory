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
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';
import { checkBetterSqlite3Availability } from '../db/adapters/BetterSqlite3Adapter.js';
import { isCloudEnabled } from '../cloud/MeMeshCloudClient.js';
import { ConfigurationError } from '../errors/index.js';

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
  knowledgeGraph: KnowledgeGraph | undefined; // undefined in cloud-only mode
  projectMemoryManager: ProjectMemoryManager | undefined; // undefined in cloud-only mode
  projectAutoTracker: ProjectAutoTracker;
  unifiedMemoryStore: UnifiedMemoryStore | undefined; // undefined in cloud-only mode
  sessionMemoryPipeline: SessionMemoryPipeline | undefined; // undefined in cloud-only mode

  // Mode flags
  cloudOnlyMode: boolean; // true when running in cloud-only mode without local SQLite

  // Rate limiting
  rateLimiter: RateLimiter;

  // Sampling
  samplingClient: SamplingClient;

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

      // ========================================================================
      // Phase 2: Check better-sqlite3 availability and handle cloud-only mode
      // ========================================================================
      const sqliteAvailability = await checkBetterSqlite3Availability();
      const cloudEnabled = isCloudEnabled();
      const cloudOnlyMode = !sqliteAvailability.available && cloudEnabled;

      logger.info('[ServerInitializer] Initialization mode determined', {
        sqliteAvailable: sqliteAvailability.available,
        cloudEnabled,
        cloudOnlyMode,
      });

      // Handle initialization based on availability
      let projectMemoryManager: ProjectMemoryManager | undefined;
      let unifiedMemoryStore: UnifiedMemoryStore | undefined;
      let sessionMemoryPipeline: SessionMemoryPipeline | undefined;

      if (sqliteAvailability.available) {
        // Standard mode: Initialize local SQLite-based memory systems
        logger.info('[ServerInitializer] Initializing with local SQLite storage');
        knowledgeGraph = KnowledgeGraph.createSync();
        projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);
        unifiedMemoryStore = new UnifiedMemoryStore(knowledgeGraph);
        sessionMemoryPipeline = new SessionMemoryPipeline(knowledgeGraph);

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
      } else if (cloudOnlyMode) {
        // Cloud-only mode: Skip local storage initialization
        logger.warn('[ServerInitializer] Running in cloud-only mode (local SQLite unavailable)');
        logger.warn(`[ServerInitializer] Reason: ${sqliteAvailability.error}`);
        logger.info(`[ServerInitializer] Suggestion: ${sqliteAvailability.fallbackSuggestion}`);
        logger.info('[ServerInitializer] Local memory tools will be disabled. Use cloud sync tools instead.');

        // No local memory systems in cloud-only mode
        knowledgeGraph = undefined;
      } else {
        // Neither SQLite nor Cloud available - cannot start
        const errorMsg =
          `Cannot start MCP server: better-sqlite3 is unavailable and no cloud API key is configured.\n\n` +
          `SQLite Error: ${sqliteAvailability.error}\n` +
          `Suggestion: ${sqliteAvailability.fallbackSuggestion || 'Install better-sqlite3'}\n\n` +
          `OR configure cloud-only mode:\n` +
          `  Set MEMESH_API_KEY to use cloud storage instead of local SQLite.\n` +
          `  Get your API key at: https://memesh.ai`;

        logger.error('[ServerInitializer] Cannot start - no storage available', {
          sqliteError: sqliteAvailability.error,
          cloudEnabled: false,
        });

        throw new ConfigurationError(errorMsg, {
          component: 'ServerInitializer',
          method: 'initialize',
          sqliteAvailable: false,
          cloudEnabled: false,
          sqliteError: sqliteAvailability.error,
          suggestion: sqliteAvailability.fallbackSuggestion,
        });
      }

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

      // Initialize handler modules (handle null values in cloud-only mode)
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
        projectAutoTracker
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
        cloudOnlyMode,
        rateLimiter,
        samplingClient,
        toolHandlers,
        buddyHandlers,
      };
    } catch (error) {
      // Clean up resources on initialization failure
      logger.error('Initialization failed, cleaning up resources...');

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
