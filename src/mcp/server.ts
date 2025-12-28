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
import { Task, AgentType } from '../orchestrator/types.js';
import { ResponseFormatter, AgentResponse } from '../ui/ResponseFormatter.js';

// Agent definitions for MCP tools
const AGENT_TOOLS: Array<{
  name: AgentType;
  description: string;
  category: string;
}> = [
  // Development Agents
  {
    name: 'code-reviewer',
    description: 'Expert code review, security analysis, and best practices validation',
    category: 'development',
  },
  {
    name: 'test-writer',
    description: 'Test automation specialist, TDD expert, coverage analysis',
    category: 'development',
  },
  {
    name: 'debugger',
    description: 'Root cause analysis, debugging specialist, systematic troubleshooting',
    category: 'development',
  },
  {
    name: 'refactorer',
    description: 'Code refactoring expert, design patterns, clean architecture',
    category: 'development',
  },
  {
    name: 'api-designer',
    description: 'API design specialist, RESTful principles, GraphQL expert',
    category: 'development',
  },

  // Analysis Agents
  {
    name: 'rag-agent',
    description: 'Knowledge retrieval, vector search, embedding-based context search',
    category: 'analysis',
  },
  {
    name: 'research-agent',
    description: 'Research specialist, investigation, comparative analysis',
    category: 'analysis',
  },
  {
    name: 'architecture-agent',
    description: 'System architecture expert, design patterns, scalability analysis',
    category: 'analysis',
  },
  {
    name: 'data-analyst',
    description: 'Data analysis, statistics, metrics, visualization specialist',
    category: 'analysis',
  },

  // Knowledge Agents
  {
    name: 'knowledge-agent',
    description: 'Knowledge management, organization, information synthesis',
    category: 'knowledge',
  },
  {
    name: 'documentation-writer',
    description: 'Technical documentation, API docs, guides, tutorials',
    category: 'knowledge',
  },

  // General Agent
  {
    name: 'general-agent',
    description: 'Versatile AI assistant for general tasks and fallback operations',
    category: 'general',
  },
];

/**
 * MCP Server Main Class
 */
class SmartAgentsMCPServer {
  private server: Server;
  private router: Router;
  private formatter: ResponseFormatter;

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

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools (agents)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: AGENT_TOOLS.map(agent => ({
          name: agent.name,
          description: agent.description,
          inputSchema: {
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
        })),
      };
    });

    // Execute tool (route task to agent)
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name: agentName, arguments: args } = request.params as {
        name: string;
        arguments: { task_description: string; priority?: number };
      };

      try {
        // Validate agent name
        if (!this.isValidAgent(agentName)) {
          throw new Error(`Unknown agent: ${agentName}`);
        }

        // Create task
        const task: Task = {
          id: this.generateTaskId(),
          description: args.task_description,
          priority: args.priority,
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
        const errorResponse: AgentResponse = {
          agentType: agentName as AgentType,
          taskDescription: args.task_description,
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
   */
  private isValidAgent(name: string): boolean {
    return AGENT_TOOLS.some(agent => agent.name === name);
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Server ready
    console.error('Smart-Agents MCP Server started');
    console.error(`Available agents: ${AGENT_TOOLS.length}`);
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
