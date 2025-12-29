/**
 * Smart-Agents MCP Server
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
import { z } from 'zod';
import {
  TaskInputSchema,
  DashboardInputSchema,
  ListAgentsInputSchema,
  ListSkillsInputSchema,
  UninstallInputSchema,
  formatValidationError,
  type ValidatedTaskInput,
  type ValidatedDashboardInput,
  type ValidatedListSkillsInput,
  type ValidatedUninstallInput,
} from './validation.js';

// Agent Registry is now used instead of static AGENT_TOOLS array
// See src/core/AgentRegistry.ts for agent definitions

/**
 * MCP Server Main Class
 */
class SmartAgentsMCPServer {
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

  constructor() {
    this.server = new Server(
      {
        name: 'smart-agents',
        version: '1.0.0',
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

      // Common input schema for task tools
      const taskInputSchema = {
        type: 'object' as const,
        properties: {
          taskDescription: {
            type: 'string',
            description: 'Description of the task to be performed',
          },
          priority: {
            type: 'number',
            description: 'Task priority (optional, 1-10)',
            minimum: 1,
            maximum: 10,
          },
        },
        required: ['taskDescription'],
      };

      // Common input schema for dashboard tools
      const dashboardInputSchema = {
        type: 'object' as const,
        properties: {
          format: {
            type: 'string',
            description: 'Dashboard format: "summary" (default) or "detailed"',
            enum: ['summary', 'detailed'],
          },
        },
      };

      // ========================================
      // NEW: sa_* prefixed tools (recommended)
      // ========================================

      // sa_task - Main task routing tool
      const saTaskTool = {
        name: 'sa_task',
        description: '🤖 Smart-Agents: Execute a task with autonomous agent routing. Analyzes your task, selects the best of 22 specialized agents, and returns an optimized execution plan.',
        inputSchema: taskInputSchema,
      };

      // sa_dashboard - Evolution system dashboard
      const saDashboardTool = {
        name: 'sa_dashboard',
        description: '📊 Smart-Agents: View evolution system dashboard showing agent learning progress, discovered patterns, and performance improvements across all 22 agents.',
        inputSchema: dashboardInputSchema,
      };

      // sa_agents - List all available agents
      const saAgentsTool = {
        name: 'sa_agents',
        description: '📋 Smart-Agents: List all 22 specialized agents with their capabilities and specializations.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      };

      // sa_skills - List and manage smart-agents skills
      const saSkillsTool = {
        name: 'sa_skills',
        description: '🎓 Smart-Agents: List all skills, differentiate sa: prefixed skills from user skills.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            filter: {
              type: 'string',
              description: 'Filter skills: "all" (default), "smart-agents" (sa: prefix only), "user" (user skills only)',
              enum: ['all', 'smart-agents', 'user'],
            },
          },
        },
      };

      // sa_uninstall - Uninstall smart-agents
      const saUninstallTool = {
        name: 'sa_uninstall',
        description: '🗑️ Smart-Agents: Uninstall smart-agents and clean up files with control over data retention.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            keepData: {
              type: 'boolean',
              description: 'Keep user data (evolution patterns, task history). Default: false',
            },
            keepConfig: {
              type: 'boolean',
              description: 'Keep configuration files (~/.smart-agents/). Default: false',
            },
            dryRun: {
              type: 'boolean',
              description: 'Preview what would be removed without actually removing. Default: false',
            },
          },
        },
      };

      // ========================================
      // Backward compatibility (old names)
      // ========================================

      // Smart router tool (legacy name)
      const smartRouterTool = {
        name: 'smart_route_task',
        description: '[LEGACY] Smart task router that analyzes your task and recommends the best agent. Use sa_task instead for shorter command.',
        inputSchema: taskInputSchema,
      };

      // Evolution dashboard tool (legacy name)
      const evolutionDashboardTool = {
        name: 'evolution_dashboard',
        description: '[LEGACY] View evolution system dashboard. Use sa_dashboard instead for shorter command.',
        inputSchema: dashboardInputSchema,
      };

      // Individual agent tools (advanced mode)
      const agentTools = allAgents.map(agent => ({
        name: agent.name,
        description: agent.description,
        inputSchema: agent.inputSchema || {
          type: 'object',
          properties: {
            task_description: {
              type: 'string',
              description: 'Description of the task to be performed',
            },
            priority: {
              type: 'number',
              description: 'Task priority (optional, 1-10)',
              minimum: 1,
              maximum: 10,
            },
          },
          required: ['task_description'],
        },
      }));

      return {
        tools: [
          // New sa_* tools first (recommended)
          saTaskTool,
          saDashboardTool,
          saAgentsTool,
          saSkillsTool,
          saUninstallTool,
          // Legacy tools (backward compatibility)
          smartRouterTool,
          evolutionDashboardTool,
          // Individual agents
          ...agentTools,
        ],
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
        throw new Error('Invalid request parameters');
      }

      const toolName = params.name;
      const args = params.arguments;

      // Handle sa_task (new name)
      if (toolName === 'sa_task') {
        return await this.handleSmartRouting(args);
      }

      // Handle sa_dashboard (new name)
      if (toolName === 'sa_dashboard') {
        return await this.handleEvolutionDashboard(args);
      }

      // Handle sa_agents (new tool)
      if (toolName === 'sa_agents') {
        return await this.handleListAgents(args);
      }

      // Handle sa_skills (new tool)
      if (toolName === 'sa_skills') {
        return await this.handleListSkills(args);
      }

      // Handle sa_uninstall (new tool)
      if (toolName === 'sa_uninstall') {
        return await this.handleUninstall(args);
      }

      // Handle smart_route_task (legacy name - backward compatibility)
      if (toolName === 'smart_route_task') {
        return await this.handleSmartRouting(args);
      }

      // Handle evolution_dashboard (legacy name - backward compatibility)
      if (toolName === 'evolution_dashboard') {
        return await this.handleEvolutionDashboard(args);
      }

      // Handle individual agent invocation (advanced mode)
      const agentName = toolName;

      // Validate input using Zod schema
      let validatedInput: ValidatedTaskInput;
      try {
        validatedInput = TaskInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(formatValidationError(error));
        }
        throw error;
      }

      // Extract validated task description and priority
      const taskDescription = validatedInput.taskDescription || validatedInput.task_description!;
      const priority = validatedInput.priority;

      try {
        // Validate agent name
        if (!this.isValidAgent(agentName)) {
          throw new Error(`Unknown agent: ${agentName}`);
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
        throw new Error(formatValidationError(error));
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
          throw new Error(formatValidationError(error));
        }
        throw error;
      }

      const format = validatedInput.format;

      let dashboardText: string;

      if (format === 'detailed') {
        // Detailed format: formatted dashboard + learning progress
        dashboardText = this.evolutionMonitor.formatDashboard();

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
        // Summary format: use formatted dashboard
        dashboardText = this.evolutionMonitor.formatDashboard();
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
          throw new Error(formatValidationError(error));
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
      let output = '📋 Smart-Agents: All Available Agents\n';
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
          throw new Error(formatValidationError(error));
        }
        throw error;
      }

      const filter = validatedInput.filter;

      // Get skills based on filter
      let skills: string[];
      let title: string;

      switch (filter) {
        case 'smart-agents':
          skills = await this.skillManager.listSmartAgentsSkills();
          title = '🎓 Smart-Agents Skills (sa: prefix)';
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
        if (filter === 'smart-agents') {
          output += '💡 Smart-Agents can generate skills automatically.\n';
          output += '   Skills will appear here once generated.\n';
        }
      } else {
        output += `Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}\n\n`;

        // Group by prefix
        const saSkills = skills.filter(s => s.startsWith('sa:'));
        const userSkills = skills.filter(s => !s.startsWith('sa:'));

        if (filter === 'all') {
          if (saSkills.length > 0) {
            output += '🎓 Smart-Agents Skills:\n';
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
      output += '  • sa_skills --filter smart-agents - List only sa: skills\n';
      output += '  • sa_skills --filter user - List only user skills\n';
      output += '\n📚 Skill Naming Convention:\n';
      output += '  • sa:<name> - Smart-Agents generated skills\n';
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
          throw new Error(formatValidationError(error));
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
          uri: 'smart-agents://usage-guide',
          name: 'Smart-Agents Complete Usage Guide',
          mimeType: 'text/markdown',
          description: 'Comprehensive guide to all 13 specialized agents with examples and best practices',
        },
        {
          uri: 'smart-agents://quick-reference',
          name: 'Agents Quick Reference',
          mimeType: 'text/markdown',
          description: 'Quick lookup table for all agents, keywords, and common workflows',
        },
        {
          uri: 'smart-agents://examples',
          name: 'Real-world Examples',
          mimeType: 'text/markdown',
          description: 'Complete project workflows and single-task examples demonstrating agent usage',
        },
        {
          uri: 'smart-agents://best-practices',
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
        'smart-agents://usage-guide': 'usage-guide.md',
        'smart-agents://quick-reference': 'quick-reference.md',
        'smart-agents://examples': 'examples.md',
        'smart-agents://best-practices': 'best-practices.md',
      };

      const fileName = resourceFiles[uri];
      if (!fileName) {
        throw new Error(`Unknown resource: ${uri}`);
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
        throw new Error(`Failed to read resource ${uri}: ${errorMessage}`);
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Server ready
    console.error('Smart-Agents MCP Server started');
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
   * Files dropped into ~/Documents/smart-agents-knowledge/ will be automatically indexed.
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
    const mcpServer = new SmartAgentsMCPServer();
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

export { SmartAgentsMCPServer };
