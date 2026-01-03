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
import { getRAGAgent } from '../agents/rag/index.js';
import { FileWatcher } from '../agents/rag/FileWatcher.js';
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';
import { validateAllApiKeys } from '../utils/apiKeyValidator.js';

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
 * - 12+ specialized development agents (frontend, backend, testing, etc.)
 * - Smart task analysis and routing
 * - Evolution monitoring and continuous learning
 * - RAG-based knowledge retrieval
 * - Git integration for version control
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
  private fileWatcher?: FileWatcher;

  /**
   * Get Git handler module (exposed for testing)
   *
   * @returns GitHandlers instance
   */
  public get gitHandlers() {
    return this.components.gitHandlers;
  }

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
   * - Handler modules for tools, Git, and buddy commands
   *
   * The constructor follows a strict initialization order managed by ServerInitializer
   * to ensure all dependencies are properly set up.
   */
  constructor() {
    // Initialize MCP server
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

    // Initialize all components using ServerInitializer
    this.components = ServerInitializer.initialize();

    // Create ToolRouter
    this.toolRouter = new ToolRouter({
      router: this.components.router,
      formatter: this.components.formatter,
      agentRegistry: this.components.agentRegistry,
      rateLimiter: this.components.rateLimiter,
      gitHandlers: this.components.gitHandlers,
      toolHandlers: this.components.toolHandlers,
      buddyHandlers: this.components.buddyHandlers,
    });

    // Setup MCP request handlers
    this.setupHandlers();
    setupResourceHandlers(this.server);
  }

  /**
   * Setup MCP request handlers
   *
   * Configures the MCP server to handle:
   * - ListTools: Returns all available tools (agents + utilities)
   * - CallTool: Routes tool execution requests to appropriate handlers
   *
   * @private
   */
  private setupHandlers(): void {
    // List available tools (smart router + individual agents)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allAgents = this.components.agentRegistry.getAllAgents();
      const tools = getAllToolDefinitions(allAgents);

      return { tools };
    });

    // Execute tool (route task to agent)
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      return await this.toolRouter.routeToolCall(request.params);
    });
  }

  /**
   * Start the MCP server
   *
   * Initializes stdio transport and begins listening for MCP requests.
   * Also auto-starts the RAG FileWatcher if OpenAI API key is configured.
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
    logger.error('Claude Code Buddy MCP Server started');
    logger.error(`Available agents: ${this.components.agentRegistry.getAgentCount()}`);

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
        onIndexed: async (files) => {
          if (files.length === 0) return;

          // Detailed notification for each indexed file
          logger.error('\n📥 New Files Indexed by RAG Agent:');
          logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          for (const filePath of files) {
            const fileName = filePath.split('/').pop() || filePath;
            const timestamp = new Date().toLocaleString();

            logger.error(`   📄 ${fileName}`);
            logger.error(`      Path: ${filePath}`);
            logger.error(`      Indexed at: ${timestamp}`);
            logger.error('');

            // Record to Knowledge Graph for later retrieval
            try {
              this.components.knowledgeGraph.createEntity({
                name: `RAG Indexed File: ${fileName} (${new Date().toISOString().split('T')[0]})`,
                entityType: 'code_change',  // Using code_change as closest match for indexed files
                observations: [
                  `File path: ${filePath}`,
                  `Indexed at: ${timestamp}`,
                  `File name: ${fileName}`,
                  'Status: Successfully indexed and searchable'
                ]
              });
            } catch (kgError) {
              logger.error(`Failed to record indexed file to Knowledge Graph: ${kgError}`);
            }
          }

          logger.error(`✅ Total: ${files.length} file(s) indexed and ready for search`);
          logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        },
        onError: (error, file) => {
          logger.error(`❌ RAG Indexing Error: ${file || 'unknown'} - ${error.message}`);
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
 * Main entry point for the MCP server
 *
 * Validates API keys and starts the server. API key validation is non-blocking
 * since OpenAI is optional (only needed for RAG features).
 *
 * @throws Error if server initialization or startup fails
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
