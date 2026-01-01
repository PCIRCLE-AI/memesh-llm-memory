/**
 * Server Initialization Logic
 *
 * Responsible for:
 * - Initializing all server components
 * - Setting up evolution monitoring
 * - Configuring RAG if enabled
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
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { PlanningEngine } from '../planning/PlanningEngine.js';
import { GitAssistantIntegration } from '../integrations/GitAssistantIntegration.js';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { GitHandlers, ToolHandlers, BuddyHandlers } from './handlers/index.js';

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
  toolInterface: MCPToolInterface;

  // Planning & Git
  planningEngine: PlanningEngine;
  gitAssistant: GitAssistantIntegration;

  // Memory & Knowledge
  knowledgeGraph: KnowledgeGraph;
  projectMemoryManager: ProjectMemoryManager;

  // Rate limiting
  rateLimiter: RateLimiter;

  // Handler modules
  gitHandlers: GitHandlers;
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
 * 3. Development tools (Butler, Planning, Git)
 * 4. Memory systems (Knowledge Graph, Project Memory)
 * 5. Handler modules (Git, Tool, Buddy)
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
   * 3. **Development Tools**: DevelopmentButler, PlanningEngine, GitAssistant
   * 4. **Memory Systems**: KnowledgeGraph, ProjectMemoryManager
   * 5. **Handler Modules**: GitHandlers, ToolHandlers, BuddyHandlers
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

    // Initialize Git Assistant
    const gitAssistant = new GitAssistantIntegration(toolInterface);

    // Initialize Project Memory System
    const knowledgeGraph = KnowledgeGraph.createSync();
    const projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);

    // Initialize Rate Limiter (30 requests per minute)
    const rateLimiter = new RateLimiter({
      requestsPerMinute: 30, // Conservative limit to prevent DoS attacks
    });

    // Initialize handler modules
    const gitHandlers = new GitHandlers(gitAssistant);

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
      planningEngine,
      projectMemoryManager,
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
      toolInterface,
      planningEngine,
      gitAssistant,
      knowledgeGraph,
      projectMemoryManager,
      rateLimiter,
      gitHandlers,
      toolHandlers,
      buddyHandlers,
    };
  }
}
