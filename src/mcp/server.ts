/**
 * Claude Code Buddy MCP Server
 *
 * Features:
 * - Exposes 12 specialized agents as MCP tools
 * - Routes tasks through TaskAnalyzer → AgentRouter pipeline
 * - Returns enhanced prompts (Prompt Enhancement Mode)
 * - Formats responses using ResponseFormatter
 * - Integrates with Claude Code via Model Context Protocol
 *
 * Architecture:
 * - MCP Server → Router → TaskAnalyzer → AgentRouter → PromptEnhancer
 * - Responses formatted via ResponseFormatter for Terminal output
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ValidationError, NotFoundError, OperationError } from '../errors/index.js';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Router } from '../orchestrator/router.js';
import { Task, AgentType, TaskAnalysis, RoutingDecision } from '../orchestrator/types.js';
import { ResponseFormatter, AgentResponse } from '../ui/ResponseFormatter.js';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { HumanInLoopUI } from './HumanInLoopUI.js';
import { FeedbackCollector } from '../evolution/FeedbackCollector.js';
import { PerformanceTracker } from '../evolution/PerformanceTracker.js';
import { LearningManager } from '../evolution/LearningManager.js';
import { EvolutionMonitor } from '../evolution/EvolutionMonitor.js';
import { getRAGAgent } from '../agents/rag/index.js';
import { FileWatcher } from '../agents/rag/FileWatcher.js';
import { SkillManager } from '../skills/index.js';
import { UninstallManager } from '../management/index.js';
import { DevelopmentButler } from '../agents/DevelopmentButler.js';
import { CheckpointDetector } from '../core/CheckpointDetector.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { PlanningEngine } from '../planning/PlanningEngine.js';
import { GitAssistantIntegration } from '../integrations/GitAssistantIntegration.js';
import { getAllToolDefinitions } from './ToolDefinitions.js';
import {
  GitHandlers,
  ToolHandlers,
  BuddyHandlers,
  setupResourceHandlers,
} from './handlers/index.js';
import { RateLimiter } from '../utils/RateLimiter.js';

// Buddy Commands (user-friendly layer)
import {
  executeBuddyDo,
  BuddyDoInputSchema,
  type ValidatedBuddyDoInput,
} from './tools/buddy-do.js';
import {
  executeBuddyStats,
  BuddyStatsInputSchema,
  type ValidatedBuddyStatsInput,
} from './tools/buddy-stats.js';
import {
  executeBuddyRemember,
  BuddyRememberInputSchema,
  type ValidatedBuddyRememberInput,
} from './tools/buddy-remember.js';
import {
  executeBuddyHelp,
  BuddyHelpInputSchema,
  type ValidatedBuddyHelpInput,
} from './tools/buddy-help.js';

import { z } from 'zod';
import {
  TaskInputSchema,
  DashboardInputSchema,
  ListAgentsInputSchema,
  ListSkillsInputSchema,
  UninstallInputSchema,
  WorkflowGuidanceInputSchema,
  RecordTokenUsageInputSchema,
  GenerateSmartPlanInputSchema,
  GitSaveWorkInputSchema,
  GitListVersionsInputSchema,
  GitShowChangesInputSchema,
  GitGoBackInputSchema,
  GitSetupInputSchema,
  RecallMemoryInputSchema,
  formatValidationError,
  type ValidatedTaskInput,
  type ValidatedDashboardInput,
  type ValidatedListSkillsInput,
  type ValidatedUninstallInput,
  type ValidatedWorkflowGuidanceInput,
  type ValidatedRecordTokenUsageInput,
  type ValidatedGenerateSmartPlanInput,
  type ValidatedGitSaveWorkInput,
  type ValidatedGitListVersionsInput,
  type ValidatedGitShowChangesInput,
  type ValidatedGitGoBackInput,
  type ValidatedGitSetupInput,
  type ValidatedRecallMemoryInput,
} from './validation.js';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { recallMemoryTool } from './tools/recall-memory.js';
import { logger } from '../utils/logger.js';
import { logError, formatMCPError } from '../utils/errorHandler.js';
import { validateAllApiKeys } from '../utils/apiKeyValidator.js';

// Agent Registry is now used instead of static AGENT_TOOLS array
// See src/core/AgentRegistry.ts for agent definitions

/**
 * MCP Server Main Class
 */
class ClaudeCodeBuddyMCPServer {
  private server: Server;
  private router: Router;
  private formatter: ResponseFormatter;
  private agentRegistry: AgentRegistry;
  private ui: HumanInLoopUI;
  private feedbackCollector: FeedbackCollector;
  private performanceTracker: PerformanceTracker;
  private learningManager: LearningManager;
  private evolutionMonitor: EvolutionMonitor;
  private fileWatcher?: FileWatcher;
  private skillManager: SkillManager;
  private uninstallManager: UninstallManager;
  private developmentButler: DevelopmentButler;
  private checkpointDetector: CheckpointDetector;
  private toolInterface: MCPToolInterface;
  private planningEngine: PlanningEngine;
  private gitAssistant: GitAssistantIntegration;
  private knowledgeGraph: KnowledgeGraph;
  private projectMemoryManager: ProjectMemoryManager;
  private rateLimiter: RateLimiter;

  // Handler modules (public for testing)
  public gitHandlers: GitHandlers;
  public toolHandlers: ToolHandlers;
  public buddyHandlers: BuddyHandlers;

  constructor() {
    this.server = new Server(
      {
        name: 'claude-code-buddy',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.router = new Router();
    this.formatter = new ResponseFormatter();
    this.agentRegistry = new AgentRegistry();
    this.ui = new HumanInLoopUI();
    this.skillManager = new SkillManager();
    this.uninstallManager = new UninstallManager(this.skillManager);

    // Initialize evolution system
    this.performanceTracker = new PerformanceTracker();
    this.learningManager = new LearningManager(this.performanceTracker);
    this.feedbackCollector = new FeedbackCollector(this.learningManager);

    // Initialize evolution monitor using Router's evolution components
    this.evolutionMonitor = new EvolutionMonitor(
      this.router.getPerformanceTracker(),
      this.router.getLearningManager(),
      this.router.getAdaptationEngine()
    );

    // Initialize DevelopmentButler components
    this.checkpointDetector = new CheckpointDetector();
    this.toolInterface = new MCPToolInterface();
    this.developmentButler = new DevelopmentButler(
      this.checkpointDetector,
      this.toolInterface,
      this.router.getLearningManager()
    );

    // Initialize PlanningEngine (Phase 2)
    this.planningEngine = new PlanningEngine(
      this.agentRegistry,
      this.router.getLearningManager()
    );

    // Initialize Git Assistant
    this.gitAssistant = new GitAssistantIntegration(this.toolInterface);

    // Initialize Project Memory System
    this.knowledgeGraph = KnowledgeGraph.createSync();
    this.projectMemoryManager = new ProjectMemoryManager(this.knowledgeGraph);

    // Initialize Rate Limiter (100 requests per minute)
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: 100, // Reasonable limit for local MCP server
    });

    // Initialize handler modules
    this.gitHandlers = new GitHandlers(this.gitAssistant);

    this.toolHandlers = new ToolHandlers(
      this.router,
      this.agentRegistry,
      this.feedbackCollector,
      this.performanceTracker,
      this.learningManager,
      this.evolutionMonitor,
      this.skillManager,
      this.uninstallManager,
      this.developmentButler,
      this.checkpointDetector,
      this.planningEngine,
      this.projectMemoryManager,
      this.ui
    );

    this.buddyHandlers = new BuddyHandlers(
      this.router,
      this.formatter,
      this.projectMemoryManager
    );

    this.setupHandlers();
    setupResourceHandlers(this.server);
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools (smart router + individual agents)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allAgents = this.agentRegistry.getAllAgents();
      const tools = getAllToolDefinitions(allAgents);

      return { tools
      };
    });

    // Execute tool (route task to agent)
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      // Safely extract and validate parameters
      const params = request.params;

      // Type guard: validate params structure
      if (
        !params ||
        typeof params !== 'object' ||
        typeof params.name !== 'string' ||
        !params.arguments ||
        typeof params.arguments !== 'object'
      ) {
        throw new ValidationError(
          'Invalid request parameters',
          {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'call_tool',
            providedParams: params,
            requiredFields: ['name (string)', 'arguments (object)'],
          }
        );
      }

      // Rate limiting check
      if (!this.rateLimiter.consume(1)) {
        const status = this.rateLimiter.getStatus();
        throw new OperationError(
          'Rate limit exceeded. Please try again in a moment.',
          {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'call_tool',
            rateLimitStatus: status,
            hint: 'Too many requests. The server allows up to 100 requests per minute.',
          }
        );
      }

      const toolName = params.name;
      const args = params.arguments;

      // Handle sa_task (new name) - Delegate to ToolHandlers
      if (toolName === 'sa_task') {
        return await this.toolHandlers.handleSmartRouteTask(args as any);
      }

      // Handle sa_dashboard (new name) - Delegate to ToolHandlers
      if (toolName === 'sa_dashboard') {
        return await this.toolHandlers.handleEvolutionDashboard(args as any);
      }

      // Handle sa_agents (new tool) - Delegate to ToolHandlers
      if (toolName === 'sa_agents') {
        return await this.toolHandlers.handleListAgents();
      }

      // Handle sa_skills (new tool) - Delegate to ToolHandlers
      if (toolName === 'sa_skills') {
        return await this.toolHandlers.handleListSkills(args as any);
      }

      // Handle sa_uninstall (new tool) - Delegate to ToolHandlers
      if (toolName === 'sa_uninstall') {
        return await this.toolHandlers.handleUninstall(args as any);
      }

      // Handle Buddy Commands - Delegate to BuddyHandlers
      if (toolName === 'buddy_do') {
        return await this.buddyHandlers.handleBuddyDo(args);
      }

      if (toolName === 'buddy_stats') {
        return await this.buddyHandlers.handleBuddyStats(args);
      }

      if (toolName === 'buddy_remember') {
        return await this.buddyHandlers.handleBuddyRemember(args);
      }

      if (toolName === 'buddy_help') {
        return await this.buddyHandlers.handleBuddyHelp(args);
      }

      // Handle workflow guidance tools - Delegate to ToolHandlers
      if (toolName === 'get-workflow-guidance') {
        return await this.toolHandlers.handleGetWorkflowGuidance(args as any);
      }

      if (toolName === 'get-session-health') {
        return await this.toolHandlers.handleGetSessionHealth();
      }

      if (toolName === 'reload-context') {
        return await this.toolHandlers.handleReloadContext(args as any);
      }

      if (toolName === 'record-token-usage') {
        return await this.toolHandlers.handleRecordTokenUsage(args as any);
      }

      // Handle generate-smart-plan (Phase 2) - Delegate to ToolHandlers
      if (toolName === 'generate-smart-plan') {
        return await this.toolHandlers.handleGenerateSmartPlan(args as any);
      }

      // Handle Git Assistant tools - Delegate to GitHandlers
      if (toolName === 'git-save-work') {
        return await this.gitHandlers.handleGitSaveWork(args);
      }

      if (toolName === 'git-list-versions') {
        return await this.gitHandlers.handleGitListVersions(args);
      }

      if (toolName === 'git-status') {
        return await this.gitHandlers.handleGitStatus(args);
      }

      if (toolName === 'git-show-changes') {
        return await this.gitHandlers.handleGitShowChanges(args);
      }

      if (toolName === 'git-go-back') {
        return await this.gitHandlers.handleGitGoBack(args);
      }

      if (toolName === 'git-create-backup') {
        return await this.gitHandlers.handleGitCreateBackup(args);
      }

      if (toolName === 'git-setup') {
        return await this.gitHandlers.handleGitSetup(args);
      }

      if (toolName === 'git-help') {
        return await this.gitHandlers.handleGitHelp(args);
      }

      // Handle recall-memory tool - Delegate to ToolHandlers
      if (toolName === 'recall-memory') {
        return await this.toolHandlers.handleRecallMemory(args as any);
      }

      // Handle smart_route_task (legacy name - backward compatibility) - Delegate to ToolHandlers
      if (toolName === 'smart_route_task') {
        return await this.toolHandlers.handleSmartRouteTask(args as any);
      }

      // Handle evolution_dashboard (legacy name - backward compatibility) - Delegate to ToolHandlers
      if (toolName === 'evolution_dashboard') {
        return await this.toolHandlers.handleEvolutionDashboard(args as any);
      }

      // Handle individual agent invocation (advanced mode)
      const agentName = toolName;

      // Validate input using Zod schema
      let validatedInput: ValidatedTaskInput;
      try {
        validatedInput = TaskInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Log validation error with context
          logError(error, {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'setupHandlers.CallToolRequestSchema',
            operation: 'validating task input schema',
            data: { agentName, schema: 'TaskInputSchema' },
          });
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'call_tool',
              schema: 'TaskInputSchema',
              providedArgs: args,
            }
          );
        }
        // Log unexpected error
        logError(error, {
          component: 'ClaudeCodeBuddyMCPServer',
          method: 'setupHandlers.CallToolRequestSchema',
          operation: 'parsing task input',
          data: { agentName },
        });
        throw error;
      }

      // Extract validated task description and priority
      const taskDescription = validatedInput.taskDescription || validatedInput.task_description!;
      const priority = validatedInput.priority;

      try {
        // Validate agent name
        if (!this.isValidAgent(agentName)) {
          throw new NotFoundError(
            `Unknown agent: ${agentName}`,
            'agent',
            agentName,
            { availableAgents: this.agentRegistry.getAllAgents().map(a => a.name) }
          );
        }

        // Create task
        const task: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          description: taskDescription,
          priority,
        };

        // Route task through the pipeline
        const startTime = Date.now();
        const result = await this.router.routeTask(task);
        const duration = Date.now() - startTime;

        // Build agent response
        const agentResponse: AgentResponse = {
          agentType: result.routing.selectedAgent,
          taskDescription: task.description,
          status: result.approved ? 'success' : 'error',
          enhancedPrompt: result.routing.enhancedPrompt,
          metadata: {
            duration,
            tokensUsed: result.analysis.estimatedTokens,
            model: result.routing.enhancedPrompt.suggestedModel,
          },
        };

        // If not approved (budget exceeded), add error
        if (!result.approved) {
          agentResponse.status = 'error';
          agentResponse.error = new Error(result.message);
        }

        // Format response using ResponseFormatter
        const formattedOutput = this.formatter.format(agentResponse);

        return {
          content: [
            {
              type: 'text',
              text: formattedOutput,
            },
          ],
        };
      } catch (error) {
        // Log error with full context and stack trace
        logError(error, {
          component: 'ClaudeCodeBuddyMCPServer',
          method: 'setupHandlers.CallToolRequestSchema',
          operation: `routing task to agent: ${agentName}`,
          data: { agentName, taskDescription: taskDescription.substring(0, 100) },
        });

        // Error handling - format error response
        // Safe cast: agentName has been validated by isValidAgent
        const errorResponse: AgentResponse = {
          agentType: agentName as AgentType,
          taskDescription: taskDescription,
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        };

        const formattedError = this.formatter.format(errorResponse);

        return {
          content: [
            {
              type: 'text',
              text: formattedError,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Validate if agent name is valid
   * Type guard that narrows string to AgentType
   */
  private isValidAgent(name: string): name is AgentType {
    return this.agentRegistry.hasAgent(name as AgentType);
  }









  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Server ready
    logger.error('Claude Code Buddy MCP Server started');
    logger.error(`Available agents: ${this.agentRegistry.getAgentCount()}`);

    // Auto-start FileWatcher if RAG is enabled
    await this.startFileWatcherIfEnabled();

    logger.error('Waiting for requests...');
  }

  /**
   * Auto-start FileWatcher if RAG is enabled
   *
   * This method checks if RAG functionality is enabled (by checking OPENAI_API_KEY)
   * and automatically starts the FileWatcher to monitor the watch directory for new files.
   *
   * Files dropped into ~/Documents/claude-code-buddy-knowledge/ will be automatically indexed.
   */
  private async startFileWatcherIfEnabled(): Promise<void> {
    try {
      // Check if OPENAI_API_KEY is configured
      if (!process.env.OPENAI_API_KEY) {
        logger.error('RAG File Watcher: Skipped (no OpenAI API key)');
        return;
      }

      // Initialize RAG Agent
      const rag = await getRAGAgent();

      if (!rag.isRAGEnabled()) {
        logger.error('RAG File Watcher: Skipped (RAG not enabled)');
        return;
      }

      // Start FileWatcher
      this.fileWatcher = new FileWatcher(rag, {
        onIndexed: (files) => {
          logger.error(`RAG: Indexed ${files.length} file(s)`);
        },
        onError: (error, file) => {
          logger.error(`RAG Error: ${file || 'unknown'}:`, error.message);
        },
      });

      await this.fileWatcher.start();
      logger.error(`RAG File Watcher: Started monitoring ${this.fileWatcher.getWatchDir()}`);
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'startFileWatcherIfEnabled',
        operation: 'starting RAG file watcher',
      });
      logger.error('RAG File Watcher: Failed to start:', error);
    }
  }
}

/**
 * Main Entry Point
 */
async function main() {
  try {
    // Validate API keys on startup
    // Note: Invalid keys are logged but don't block startup (since OPENAI_API_KEY is optional)
    validateAllApiKeys();

    const mcpServer = new ClaudeCodeBuddyMCPServer();
    await mcpServer.start();
  } catch (error) {
    logError(error, {
      component: 'ClaudeCodeBuddyMCPServer',
      method: 'main',
      operation: 'starting MCP server',
    });
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ClaudeCodeBuddyMCPServer };
