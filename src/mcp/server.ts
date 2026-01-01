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
import { GitHandlers } from './handlers/GitHandlers.js';
import { ToolHandlers } from './handlers/ToolHandlers.js';
import { BuddyHandlers } from './handlers/BuddyHandlers.js';

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

  // Handler modules
  private gitHandlers: GitHandlers;
  private toolHandlers: ToolHandlers;
  private buddyHandlers: BuddyHandlers;

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
    this.knowledgeGraph = new KnowledgeGraph();
    this.projectMemoryManager = new ProjectMemoryManager(this.knowledgeGraph);

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
    this.setupResourceHandlers();
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
          id: this.generateTaskId(),
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
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle smart routing with human-in-the-loop confirmation
   *
   * Steps:
   * 1. Analyze task using Router
   * 2. Generate alternatives
   * 3. Format confirmation request using HumanInLoopUI
   * 4. Return formatted confirmation to user
   */
  private async handleSmartRouting(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Validate input using Zod schema
    let validatedInput: ValidatedTaskInput;
    try {
      validatedInput = TaskInputSchema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          formatValidationError(error),
          {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'handleSmartRouting',
            schema: 'TaskInputSchema',
            providedArgs: args,
          }
        );
      }
      throw error;
    }

    const taskDescription = validatedInput.taskDescription || validatedInput.task_description!;
    const priority = validatedInput.priority;

    // Create task
    const task: Task = {
      id: this.generateTaskId(),
      description: taskDescription,
      priority,
    };

    try {
      // Route task through pipeline
      const result = await this.router.routeTask(task);

      // Generate alternatives (top 2-3 other suitable agents)
      const alternatives = this.generateAlternatives(result.routing.selectedAgent, result.analysis);

      // Create confirmation request
      const confirmationRequest = {
        taskDescription: task.description,
        recommendedAgent: result.routing.selectedAgent,
        confidence: this.estimateConfidence(result.analysis, result.routing),
        reasoning: result.routing.reasoning.split('. ').slice(0, 3).filter(r => r.length > 0),
        alternatives,
      };

      // Format using HumanInLoopUI
      const formattedConfirmation = this.ui.formatConfirmationRequest(confirmationRequest);

      // Return formatted confirmation
      return {
        content: [
          {
            type: 'text',
            text: formattedConfirmation,
          },
        ],
      };
    } catch (error) {
      // Return formatted error response
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Smart routing failed: ${errorMessage}\n\nPlease try again or use a specific agent directly.`,
          },
        ],
      };
    }
  }

  /**
   * Generate alternative agent options
   */
  private generateAlternatives(
    selectedAgent: AgentType,
    analysis: TaskAnalysis
  ): Array<{ agent: AgentType; confidence: number; reason: string }> {
    const alternatives: Array<{ agent: AgentType; confidence: number; reason: string }> = [];

    // Get fallback agent if available
    const agentsByCategory = this.agentRegistry.getAgentsByCategory(
      this.agentRegistry.getAgent(selectedAgent)?.category || 'general'
    );

    // Add agents from same category (excluding selected)
    agentsByCategory
      .filter(a => a.name !== selectedAgent)
      .slice(0, 2)
      .forEach((agent, index) => {
        alternatives.push({
          agent: agent.name,
          confidence: 0.7 - index * 0.1,
          reason: `Alternative from ${agent.category} category`,
        });
      });

    // Add general-agent as fallback if not already selected
    if (selectedAgent !== 'general-agent' && alternatives.length < 3) {
      alternatives.push({
        agent: 'general-agent',
        confidence: 0.5,
        reason: 'General-purpose fallback',
      });
    }

    return alternatives.slice(0, 3);
  }

  /**
   * Estimate confidence based on analysis
   */
  private estimateConfidence(analysis: TaskAnalysis, routing: RoutingDecision): number {
    // Simple confidence estimation based on complexity match
    const baseConfidence = 0.75;

    // Higher confidence for specific agent matches
    if (routing.selectedAgent !== 'general-agent') {
      return Math.min(baseConfidence + 0.15, 0.95);
    }

    return baseConfidence;
  }

  /**
   * Handle evolution_dashboard tool call
   *
   * Returns evolution system dashboard with agent learning progress
   */
  private async handleEvolutionDashboard(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input using Zod schema
      let validatedInput: ValidatedDashboardInput;
      try {
        validatedInput = DashboardInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleEvolutionDashboard',
              schema: 'DashboardInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const format = validatedInput.format;
      const exportFormat = validatedInput.exportFormat;
      const includeCharts = validatedInput.includeCharts;
      const chartHeight = validatedInput.chartHeight;

      let dashboardText: string;

      // If export format is specified, use export methods
      if (exportFormat === 'json') {
        dashboardText = this.evolutionMonitor.exportAsJSON();
      } else if (exportFormat === 'csv') {
        dashboardText = this.evolutionMonitor.exportAsCSV();
      } else if (exportFormat === 'markdown') {
        dashboardText = this.evolutionMonitor.exportAsMarkdown();
      } else if (format === 'detailed') {
        // Detailed format: formatted dashboard + learning progress
        dashboardText = this.evolutionMonitor.formatDashboard({
          includeCharts,
          chartHeight,
        });

        // Add detailed learning progress
        const progress = this.evolutionMonitor.getLearningProgress();
        const activeAgents = progress.filter(p => p.learnedPatterns > 0);

        if (activeAgents.length > 0) {
          dashboardText += '\n\n📋 Detailed Learning Progress:\n';
          activeAgents.forEach(agent => {
            dashboardText += `\n${agent.agentId}:\n`;
            dashboardText += `  - Total Executions: ${agent.totalExecutions}\n`;
            dashboardText += `  - Learned Patterns: ${agent.learnedPatterns}\n`;
            dashboardText += `  - Applied Adaptations: ${agent.appliedAdaptations}\n`;
            dashboardText += `  - Success Rate Improvement: ${agent.successRateImprovement >= 0 ? '+' : ''}${(agent.successRateImprovement * 100).toFixed(1)}%\n`;
            dashboardText += `  - Last Learning: ${agent.lastLearningDate ? agent.lastLearningDate.toISOString() : 'Never'}\n`;
          });
        }
      } else {
        // Summary format: use formatted dashboard with chart options
        dashboardText = this.evolutionMonitor.formatDashboard({
          includeCharts,
          chartHeight,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: dashboardText,
          },
        ],
      };
    } catch (error) {
      // Return formatted error response
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Evolution dashboard failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle list agents request (sa_agents tool)
   */
  private async handleListAgents(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input using Zod schema
      try {
        ListAgentsInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleListAgents',
              schema: 'ListAgentsInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const allAgents = this.agentRegistry.getAllAgents();

      // Group agents by category
      const categories = new Map<string, typeof allAgents>();
      allAgents.forEach(agent => {
        if (!categories.has(agent.category)) {
          categories.set(agent.category, []);
        }
        categories.get(agent.category)!.push(agent);
      });

      // Category emojis
      const categoryEmojis: Record<string, string> = {
        development: '💻',
        analysis: '🔍',
        knowledge: '📚',
        operations: '⚙️',
        creative: '🎨',
        utility: '🔧',
        general: '🤖',
      };

      // Build formatted output
      let output = '📋 Claude Code Buddy: All Available Agents\n';
      output += '━'.repeat(60) + '\n\n';
      output += `Total: ${allAgents.length} specialized agents across ${categories.size} categories\n\n`;

      // Sort categories for consistent display
      const sortedCategories = ['development', 'analysis', 'knowledge', 'operations', 'creative', 'utility', 'general'];

      sortedCategories.forEach(categoryName => {
        const agents = categories.get(categoryName);
        if (!agents || agents.length === 0) return;

        const emoji = categoryEmojis[categoryName] || '📌';
        const categoryTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

        output += `${emoji} ${categoryTitle} (${agents.length})\n`;
        output += '─'.repeat(60) + '\n';

        agents.forEach(agent => {
          output += `  • ${agent.name}\n`;
          output += `    ${agent.description}\n\n`;
        });

        output += '\n';
      });

      output += '━'.repeat(60) + '\n';
      output += '\n💡 Usage:\n';
      output += '  • sa_task - Route task to best agent automatically\n';
      output += '  • <agent-name> - Call specific agent directly (advanced)\n';
      output += '  • sa_dashboard - View learning progress\n';

      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ List agents failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle list skills request (sa_skills tool)
   */
  private async handleListSkills(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input using Zod schema
      let validatedInput: ValidatedListSkillsInput;
      try {
        validatedInput = ListSkillsInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleListSkills',
              schema: 'ListSkillsInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const filter = validatedInput.filter;

      // Get skills based on filter
      let skills: string[];
      let title: string;

      switch (filter) {
        case 'claude-code-buddy':
          skills = await this.skillManager.listSmartAgentsSkills();
          title = '🎓 Claude Code Buddy Skills (sa: prefix)';
          break;
        case 'user':
          skills = await this.skillManager.listUserSkills();
          title = '👤 User Skills';
          break;
        case 'all':
        default:
          const allSkillsMetadata = await this.skillManager.listAllSkills();
          skills = allSkillsMetadata.map(s => s.name);
          title = '🎓 All Skills';
          break;
      }

      // Build formatted output
      let output = `${title}\n`;
      output += '━'.repeat(60) + '\n\n';

      if (skills.length === 0) {
        output += '  No skills found.\n\n';
        if (filter === 'claude-code-buddy') {
          output += '💡 Claude Code Buddy can generate skills automatically.\n';
          output += '   Skills will appear here once generated.\n';
        }
      } else {
        output += `Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}\n\n`;

        // Group by prefix
        const saSkills = skills.filter(s => s.startsWith('sa:'));
        const userSkills = skills.filter(s => !s.startsWith('sa:'));

        if (filter === 'all') {
          if (saSkills.length > 0) {
            output += '🎓 Claude Code Buddy Skills:\n';
            output += '─'.repeat(60) + '\n';
            saSkills.forEach(skill => {
              output += `  • ${skill}\n`;
            });
            output += '\n';
          }

          if (userSkills.length > 0) {
            output += '👤 User Skills:\n';
            output += '─'.repeat(60) + '\n';
            userSkills.forEach(skill => {
              output += `  • ${skill}\n`;
            });
            output += '\n';
          }
        } else {
          skills.forEach(skill => {
            output += `  • ${skill}\n`;
          });
          output += '\n';
        }
      }

      output += '━'.repeat(60) + '\n';
      output += '\n💡 Usage:\n';
      output += '  • sa_skills - List all skills\n';
      output += '  • sa_skills --filter claude-code-buddy - List only sa: skills\n';
      output += '  • sa_skills --filter user - List only user skills\n';
      output += '\n📚 Skill Naming Convention:\n';
      output += '  • sa:<name> - Claude Code Buddy generated skills\n';
      output += '  • <name> - User-installed skills\n';

      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ List skills failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle uninstall request (sa_uninstall tool)
   */
  private async handleUninstall(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input using Zod schema
      let validatedInput: ValidatedUninstallInput;
      try {
        validatedInput = UninstallInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleUninstallAgent',
              schema: 'UninstallInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      // Extract uninstall options from validated input
      const options = {
        keepData: validatedInput.keepData,
        keepConfig: validatedInput.keepConfig,
        dryRun: validatedInput.dryRun,
      };

      // Perform uninstallation
      const report = await this.uninstallManager.uninstall(options);

      // Format report for display
      const formattedReport = this.uninstallManager.formatReport(report);

      return {
        content: [
          {
            type: 'text',
            text: formattedReport,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Uninstall failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle get-workflow-guidance tool
   */
  private async handleGetWorkflowGuidance(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedWorkflowGuidanceInput;
      try {
        validatedInput = WorkflowGuidanceInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleWorkflowGuidance',
              schema: 'WorkflowGuidanceInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const result = await this.developmentButler.processCheckpoint(
        validatedInput.phase,
        validatedInput
      );

      return {
        content: [
          {
            type: 'text',
            text: result.formattedRequest,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Workflow guidance failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle get-session-health tool
   */
  private async handleGetSessionHealth(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const health = this.developmentButler.getContextMonitor().checkSessionHealth();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(health, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Session health check failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle reload-context tool
   */
  private async handleReloadContext(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const data = args as Record<string, unknown>;
      const requestId = `manual_${Date.now()}`;
      const result = await this.developmentButler.executeContextReload(requestId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Context reload failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle record-token-usage tool
   */
  private async handleRecordTokenUsage(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedRecordTokenUsageInput;
      try {
        validatedInput = RecordTokenUsageInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleRecordTokenUsage',
              schema: 'RecordTokenUsageInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      this.developmentButler.getTokenTracker().recordUsage({
        inputTokens: validatedInput.inputTokens,
        outputTokens: validatedInput.outputTokens,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Token usage recording failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle generate-smart-plan tool (Phase 2)
   */
  private async handleGenerateSmartPlan(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedGenerateSmartPlanInput;
      try {
        validatedInput = GenerateSmartPlanInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleGenerateSmartPlan',
              schema: 'GenerateSmartPlanInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      // Generate plan using PlanningEngine
      const plan = await this.planningEngine.generatePlan({
        featureDescription: validatedInput.featureDescription,
        requirements: validatedInput.requirements,
        constraints: validatedInput.constraints,
      });

      // Format plan as text
      let planText = `# ${plan.title}\n\n`;
      planText += `**Goal**: ${plan.goal}\n\n`;
      planText += `**Architecture**: ${plan.architecture}\n\n`;
      planText += `**Tech Stack**: ${plan.techStack.join(', ')}\n\n`;
      planText += `**Total Estimated Time**: ${plan.totalEstimatedTime}\n\n`;
      planText += `---\n\n`;
      planText += `## Tasks\n\n`;

      for (const task of plan.tasks) {
        planText += `### ${task.id}: ${task.description}\n\n`;
        planText += `- **Priority**: ${task.priority}\n`;
        planText += `- **Estimated Duration**: ${task.estimatedDuration}\n`;

        if (task.suggestedAgent) {
          planText += `- **Suggested Agent**: ${task.suggestedAgent}\n`;
        }

        if (task.dependencies.length > 0) {
          planText += `- **Dependencies**: ${task.dependencies.join(', ')}\n`;
        }

        planText += `\n**Steps**:\n`;
        task.steps.forEach((step, index) => {
          planText += `${index + 1}. ${step}\n`;
        });

        if (task.files.create && task.files.create.length > 0) {
          planText += `\n**Files to Create**: ${task.files.create.join(', ')}\n`;
        }
        if (task.files.modify && task.files.modify.length > 0) {
          planText += `**Files to Modify**: ${task.files.modify.join(', ')}\n`;
        }
        if (task.files.test && task.files.test.length > 0) {
          planText += `**Test Files**: ${task.files.test.join(', ')}\n`;
        }

        planText += `\n---\n\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: planText,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Smart plan generation failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-save-work tool
   */
  private async handleGitSaveWork(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedGitSaveWorkInput;
      try {
        validatedInput = GitSaveWorkInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleGitSaveWork',
              schema: 'GitSaveWorkInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      await this.gitAssistant.saveWork(validatedInput.description, validatedInput.autoBackup);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Work saved successfully with description: "${validatedInput.description}"`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to save work: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-list-versions tool
   */
  private async handleGitListVersions(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedGitListVersionsInput;
      try {
        validatedInput = GitListVersionsInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleGitListVersions',
              schema: 'GitListVersionsInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const versions = await this.gitAssistant.listVersions(validatedInput.limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(versions, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list versions: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-status tool
   */
  private async handleGitStatus(
    _args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      await this.gitAssistant.status();

      return {
        content: [
          {
            type: 'text',
            text: '✅ Git status displayed',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get status: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-show-changes tool
   */
  private async handleGitShowChanges(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedGitShowChangesInput;
      try {
        validatedInput = GitShowChangesInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleGitShowChanges',
              schema: 'GitShowChangesInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const changes = await this.gitAssistant.showChanges(validatedInput.compareWith);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(changes, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to show changes: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-go-back tool
   */
  private async handleGitGoBack(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedGitGoBackInput;
      try {
        validatedInput = GitGoBackInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleGitGoBack',
              schema: 'GitGoBackInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      await this.gitAssistant.goBackTo(validatedInput.identifier);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully went back to version: ${validatedInput.identifier}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to go back: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-create-backup tool
   */
  private async handleGitCreateBackup(
    _args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const backupPath = await this.gitAssistant.createBackup();

      return {
        content: [
          {
            type: 'text',
            text: `✅ Backup created at: ${backupPath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to create backup: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-setup tool
   */
  private async handleGitSetup(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedGitSetupInput;
      try {
        validatedInput = GitSetupInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleGitSetup',
              schema: 'GitSetupInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      if (validatedInput.existingGit) {
        await this.gitAssistant.configureExistingProject();
      } else {
        await this.gitAssistant.setupNewProject();
      }

      return {
        content: [
          {
            type: 'text',
            text: '✅ Git setup completed successfully',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Git setup failed: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-help tool
   */
  private async handleGitHelp(
    _args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      await this.gitAssistant.showHelp();

      return {
        content: [
          {
            type: 'text',
            text: '✅ Git Assistant help displayed',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to show help: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Handle recall-memory tool
   */
  private async handleRecallMemory(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let validatedInput: ValidatedRecallMemoryInput;
      try {
        validatedInput = RecallMemoryInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ClaudeCodeBuddyMCPServer',
              method: 'handleRecallMemory',
              schema: 'RecallMemoryInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const result = await recallMemoryTool.handler(
        validatedInput,
        this.projectMemoryManager
      );

      // Format the memories into readable text
      let text = '📚 Project Memory Recall\n';
      text += '━'.repeat(60) + '\n\n';

      if (result.memories.length === 0) {
        text += 'No memories found.\n\n';
        text += '💡 Memories will be created as you work on the project.\n';
      } else {
        text += `Found ${result.memories.length} recent memories:\n\n`;

        result.memories.forEach((memory, index) => {
          text += `${index + 1}. ${memory.type}\n`;
          if (memory.timestamp) {
            text += `   Timestamp: ${memory.timestamp}\n`;
          }
          if (memory.observations && memory.observations.length > 0) {
            text += '   Observations:\n';
            memory.observations.forEach(obs => {
              text += `   - ${obs}\n`;
            });
          }
          text += '\n';
        });
      }

      text += '━'.repeat(60) + '\n';

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to recall memory: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Setup MCP Resource handlers
   */
  private setupResourceHandlers(): void {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const resourcesDir = path.join(__dirname, 'resources');

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'claude-code-buddy://usage-guide',
          name: 'Claude Code Buddy Complete Usage Guide',
          mimeType: 'text/markdown',
          description: 'Comprehensive guide to all 13 specialized agents with examples and best practices',
        },
        {
          uri: 'claude-code-buddy://quick-reference',
          name: 'Agents Quick Reference',
          mimeType: 'text/markdown',
          description: 'Quick lookup table for all agents, keywords, and common workflows',
        },
        {
          uri: 'claude-code-buddy://examples',
          name: 'Real-world Examples',
          mimeType: 'text/markdown',
          description: 'Complete project workflows and single-task examples demonstrating agent usage',
        },
        {
          uri: 'claude-code-buddy://best-practices',
          name: 'Best Practices Guide',
          mimeType: 'text/markdown',
          description: 'Tips, guidelines, and best practices for effective agent utilization',
        },
      ],
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const uri = request.params.uri;

      // Map URIs to file names
      const resourceFiles: Record<string, string> = {
        'claude-code-buddy://usage-guide': 'usage-guide.md',
        'claude-code-buddy://quick-reference': 'quick-reference.md',
        'claude-code-buddy://examples': 'examples.md',
        'claude-code-buddy://best-practices': 'best-practices.md',
      };

      const fileName = resourceFiles[uri];
      if (!fileName) {
        throw new NotFoundError(
          `Unknown resource: ${uri}`,
          'resource',
          uri,
          { availableResources: Object.keys(resourceFiles) }
        );
      }

      const filePath = path.join(resourcesDir, fileName);

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: content,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new OperationError(
          `Failed to read resource ${uri}: ${errorMessage}`,
          {
            operation: 'readResource',
            uri,
            filePath,
            originalError: errorMessage,
          }
        );
      }
    });
  }

  /**
   * Handle buddy_do command - Execute tasks with smart routing
   */
  private async handleBuddyDo(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Validate input
    let validatedInput: ValidatedBuddyDoInput;
    try {
      validatedInput = BuddyDoInputSchema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid buddy_do input',
          {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'handleBuddyDo',
            schema: 'BuddyDoInputSchema',
            providedArgs: args,
          }
        );
      }
      throw error;
    }

    return await executeBuddyDo(validatedInput, this.router, this.formatter);
  }

  /**
   * Handle buddy_stats command - Performance dashboard
   */
  private async handleBuddyStats(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Validate input
    let validatedInput: ValidatedBuddyStatsInput;
    try {
      validatedInput = BuddyStatsInputSchema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid buddy_stats input',
          {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'handleBuddyStats',
            schema: 'BuddyStatsInputSchema',
            providedArgs: args,
          }
        );
      }
      throw error;
    }

    return await executeBuddyStats(validatedInput, this.formatter);
  }

  /**
   * Handle buddy_remember command - Recall project memory
   */
  private async handleBuddyRemember(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Validate input
    let validatedInput: ValidatedBuddyRememberInput;
    try {
      validatedInput = BuddyRememberInputSchema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid buddy_remember input',
          {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'handleBuddyRemember',
            schema: 'BuddyRememberInputSchema',
            providedArgs: args,
          }
        );
      }
      throw error;
    }

    return await executeBuddyRemember(validatedInput, this.projectMemoryManager, this.formatter);
  }

  /**
   * Handle buddy_help command - Get help and documentation
   */
  private async handleBuddyHelp(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Validate input
    let validatedInput: ValidatedBuddyHelpInput;
    try {
      validatedInput = BuddyHelpInputSchema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid buddy_help input',
          {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'handleBuddyHelp',
            schema: 'BuddyHelpInputSchema',
            providedArgs: args,
          }
        );
      }
      throw error;
    }

    return await executeBuddyHelp(validatedInput, this.formatter);
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Server ready
    console.error('Claude Code Buddy MCP Server started');
    console.error(`Available agents: ${this.agentRegistry.getAgentCount()}`);

    // Auto-start FileWatcher if RAG is enabled
    await this.startFileWatcherIfEnabled();

    console.error('Waiting for requests...');
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
        console.error('RAG File Watcher: Skipped (no OpenAI API key)');
        return;
      }

      // Initialize RAG Agent
      const rag = await getRAGAgent();

      if (!rag.isRAGEnabled()) {
        console.error('RAG File Watcher: Skipped (RAG not enabled)');
        return;
      }

      // Start FileWatcher
      this.fileWatcher = new FileWatcher(rag, {
        onIndexed: (files) => {
          console.error(`RAG: Indexed ${files.length} file(s)`);
        },
        onError: (error, file) => {
          console.error(`RAG Error: ${file || 'unknown'}:`, error.message);
        },
      });

      await this.fileWatcher.start();
      console.error(`RAG File Watcher: Started monitoring ${this.fileWatcher.getWatchDir()}`);
    } catch (error) {
      console.error('RAG File Watcher: Failed to start:', error);
    }
  }
}

/**
 * Main Entry Point
 */
async function main() {
  try {
    const mcpServer = new ClaudeCodeBuddyMCPServer();
    await mcpServer.start();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ClaudeCodeBuddyMCPServer };
