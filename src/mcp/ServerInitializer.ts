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
import { PlanningEngine } from '../planning/PlanningEngine.js';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { EntityType } from '../knowledge-graph/types.js';
import { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { ToolHandlers, BuddyHandlers } from './handlers/index.js';

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

  // Planning
  planningEngine: PlanningEngine;

  // Memory & Knowledge
  knowledgeGraph: KnowledgeGraph;
  projectMemoryManager: ProjectMemoryManager;
  projectAutoTracker: ProjectAutoTracker;

  // Rate limiting
  rateLimiter: RateLimiter;

  // Handler modules
  toolHandlers: ToolHandlers;
  buddyHandlers: BuddyHandlers;
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
   * 3. **Development Tools**: DevelopmentButler, PlanningEngine
   * 4. **Memory Systems**: KnowledgeGraph, ProjectMemoryManager, ProjectAutoTracker
   * 5. **Hook Integration**: HookIntegration
   * 6. **Handler Modules**: ToolHandlers, BuddyHandlers
   *
   * @returns ServerComponents - Fully initialized and wired components
   *
   * @example
   * ```typescript
   * const components = ServerInitializer.initialize();
   *
   * // Access initialized components
   * const router = components.router;
   * const agentRegistry = components.agentRegistry;
   * const knowledgeGraph = components.knowledgeGraph;
   * ```
   */
  static initialize(): ServerComponents {
    // Core components
    const router = new Router();
    const formatter = new ResponseFormatter();
    const agentRegistry = new AgentRegistry();
    const ui = new HumanInLoopUI();
    const skillManager = new SkillManager();
    const uninstallManager = new UninstallManager(skillManager);

    // Initialize evolution system
    const performanceTracker = new PerformanceTracker();
    const learningManager = new LearningManager(performanceTracker);
    const feedbackCollector = new FeedbackCollector(learningManager);

    // Initialize evolution monitor using Router's evolution components
    const evolutionMonitor = new EvolutionMonitor(
      router.getPerformanceTracker(),
      router.getLearningManager(),
      router.getAdaptationEngine()
    );

    // Initialize DevelopmentButler components
    const checkpointDetector = new CheckpointDetector();
    const toolInterface = new MCPToolInterface();
    const developmentButler = new DevelopmentButler(
      checkpointDetector,
      toolInterface,
      router.getLearningManager()
    );

    // Initialize PlanningEngine (Phase 2)
    const planningEngine = new PlanningEngine(
      agentRegistry,
      router.getLearningManager()
    );

    // Initialize Project Memory System
    const knowledgeGraph = KnowledgeGraph.createSync();
    const projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);
    toolInterface.attachMemoryProvider({
      createEntities: async ({ entities }) => {
        for (const entity of entities) {
          knowledgeGraph.createEntity({
            name: entity.name,
            entityType: entity.entityType as EntityType,
            observations: entity.observations,
            metadata: entity.metadata,
          });
        }
      },
      searchNodes: async (query: string) => {
        return knowledgeGraph.searchEntities({
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
      developmentButler
    );

    // Initialize Rate Limiter (30 requests per minute)
    const rateLimiter = new RateLimiter({
      requestsPerMinute: 30, // Conservative limit to prevent DoS attacks
    });

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
      planningEngine,
      projectMemoryManager,
      knowledgeGraph,
      ui
    );

    const buddyHandlers = new BuddyHandlers(
      router,
      formatter,
      projectMemoryManager
    );

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
      planningEngine,
      knowledgeGraph,
      projectMemoryManager,
      projectAutoTracker,
      rateLimiter,
      toolHandlers,
      buddyHandlers,
    };
  }
}
