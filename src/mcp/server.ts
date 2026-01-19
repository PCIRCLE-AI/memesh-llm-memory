/**
 * Claude Code Buddy MCP Server
 *
 * Features:
 * - Exposes 7 focused MCP tools
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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ServerInitializer, ServerComponents } from './ServerInitializer.js';
import { ToolRouter } from './ToolRouter.js';
import { getAllToolDefinitions } from './ToolDefinitions.js';
import { setupResourceHandlers } from './handlers/index.js';
import { SessionBootstrapper } from './SessionBootstrapper.js';
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';

/**
 * Claude Code Buddy MCP Server
 *
 * Main server class that integrates Model Context Protocol (MCP) with the Claude Code Buddy
 * multi-agent system. Provides intelligent task routing, agent orchestration, and enhanced
 * prompt generation for software development workflows.
 *
 * Architecture:
 * - MCP Server handles protocol-level communication
 * - ServerInitializer sets up all components and dependencies
 * - ToolRouter dispatches requests to appropriate handlers
 * - ResponseFormatter ensures consistent output formatting
 *
 * Features:
 * - 7 focused development capabilities (routing, planning, memory, hooks)
 * - Smart task analysis and routing
 * - Evolution monitoring and continuous learning
 * - Project memory management
 *
 * @example
 * ```typescript
 * // Server is typically started via CLI:
 * // npx claude-code-buddy
 *
 * // Or programmatically:
 * const server = new ClaudeCodeBuddyMCPServer();
 * await server.start();
 * ```
 */
class ClaudeCodeBuddyMCPServer {
  private server: Server;
  private components: ServerComponents;
  private toolRouter: ToolRouter;
  private sessionBootstrapper: SessionBootstrapper;
  private isShuttingDown = false;

  /**
   * Get Tool handler module (exposed for testing)
   *
   * @returns ToolHandlers instance
   */
  public get toolHandlers() {
    return this.components.toolHandlers;
  }

  /**
   * Get Buddy command handler module (exposed for testing)
   *
   * @returns BuddyHandlers instance
   */
  public get buddyHandlers() {
    return this.components.buddyHandlers;
  }

  /**
   * Get Development Butler module (exposed for testing)
   *
   * @returns DevelopmentButler instance
   */
  public get developmentButler() {
    return this.components.developmentButler;
  }

  /**
   * Create a new MCP server instance
   *
   * Initializes all server components including:
   * - Core routing and orchestration
   * - Evolution monitoring system
   * - Knowledge graph and memory management
   * - Handler modules for tools and buddy commands
   *
   * The constructor follows a strict initialization order managed by ServerInitializer
   * to ensure all dependencies are properly set up.
   */
  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'claude-code-buddy',
        version: '2.2.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize all components using ServerInitializer
    this.components = ServerInitializer.initialize();

    // Create ToolRouter
    this.toolRouter = new ToolRouter({
      rateLimiter: this.components.rateLimiter,
      toolHandlers: this.components.toolHandlers,
      buddyHandlers: this.components.buddyHandlers,
    });
    this.components.toolInterface.attachToolDispatcher(this.toolRouter);
    this.sessionBootstrapper = new SessionBootstrapper(
      this.components.projectMemoryManager
    );

    // Setup MCP request handlers
    this.setupHandlers();
    setupResourceHandlers(this.server);
    this.setupSignalHandlers();
  }

  /**
   * Setup MCP request handlers
   *
   * Configures the MCP server to handle:
   * - ListTools: Returns all available tools (capabilities + utilities)
   * - CallTool: Routes tool execution requests to appropriate handlers
   *
   * @private
   */
  private setupHandlers(): void {
    // List available tools (smart router + core capabilities)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = getAllToolDefinitions();

      return { tools };
    });

    // Execute tool (route task to agent)
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const result = await this.toolRouter.routeToolCall(request.params);
      return await this.sessionBootstrapper.maybePrepend(result);
    });
  }

  /**
   * Start the MCP server
   *
   * Initializes stdio transport and begins listening for MCP requests.
   *
   * The server runs indefinitely until the process is terminated or an
   * unrecoverable error occurs.
   *
   * @throws Error if server fails to start or connect to transport
   *
   * @example
   * ```typescript
   * const server = new ClaudeCodeBuddyMCPServer();
   * await server.start(); // Runs until terminated
   * ```
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Server ready
    logger.info('Claude Code Buddy MCP Server started');
    const agents = this.components.agentRegistry.getAllAgents();
    const capabilityCount = new Set(
      agents.flatMap(agent => agent.capabilities || [])
    ).size;
    logger.info(`Capabilities loaded: ${capabilityCount}`);

    logger.info('Waiting for requests...');
  }

  /**
   * Setup process signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    this.server.onclose = () => {
      logger.warn('MCP transport closed');
    };

    this.server.onerror = (error: Error) => {
      logger.error('MCP server error:', error);
    };

    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, () => {
        void this.shutdown(signal);
      });
    }
  }

  /**
   * Gracefully shutdown server resources
   */
  private async shutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.warn(`Shutting down MCP server (${reason})...`);

    try {
      await this.server.close();
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'shutdown',
        operation: 'closing MCP server',
      });
      logger.error('Failed to close MCP server cleanly:', error);
    }
  }
}

/**
 * Main entry point for the MCP server
 *
 * @throws Error if server initialization or startup fails
 */
async function main() {
  try {
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
