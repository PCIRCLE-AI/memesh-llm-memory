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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Router } from '../orchestrator/router.js';
import { Task, AgentType, TaskAnalysis, RoutingDecision } from '../orchestrator/types.js';
import { ResponseFormatter, AgentResponse } from '../ui/ResponseFormatter.js';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { HumanInLoopUI } from './HumanInLoopUI.js';

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

  constructor() {
    this.server = new Server(
      {
        name: 'smart-agents',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.router = new Router();
    this.formatter = new ResponseFormatter();
    this.agentRegistry = new AgentRegistry();
    this.ui = new HumanInLoopUI();

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools (smart router + individual agents)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allAgents = this.agentRegistry.getAllAgents();

      // Smart router tool (recommended)
      const smartRouterTool = {
        name: 'smart_route_task',
        description: 'Smart task router that analyzes your task and recommends the best agent. Shows reasoning and alternatives with human-in-the-loop confirmation.',
        inputSchema: {
          type: 'object',
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
        },
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
        tools: [smartRouterTool, ...agentTools],
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
      const args = params.arguments as Record<string, unknown>;

      // Handle smart_route_task (smart router mode)
      if (toolName === 'smart_route_task') {
        return await this.handleSmartRouting(args);
      }

      // Handle individual agent invocation (advanced mode)
      const agentName = toolName;

      // Validate required task_description
      if (typeof args.task_description !== 'string') {
        throw new Error('Missing or invalid task_description');
      }

      // Validate optional priority
      const taskDescription = args.task_description;
      const priority =
        args.priority !== undefined && typeof args.priority === 'number'
          ? args.priority
          : undefined;

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
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Validate taskDescription (using camelCase for smart_route_task)
    if (typeof args.taskDescription !== 'string') {
      throw new Error('Missing or invalid taskDescription');
    }

    const taskDescription = args.taskDescription;
    const priority =
      args.priority !== undefined && typeof args.priority === 'number'
        ? args.priority
        : undefined;

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
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Server ready
    console.error('Smart-Agents MCP Server started');
    console.error(`Available agents: ${this.agentRegistry.getAgentCount()}`);
    console.error('Waiting for requests...');
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
