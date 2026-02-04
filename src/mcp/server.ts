#!/usr/bin/env node
/**
 * MeMesh MCP Server
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

// Note: dotenv removed to prevent stdout pollution in MCP stdio mode
// MCP servers should receive configuration through MCP protocol, not .env files

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { CallToolRequestParams } from '@modelcontextprotocol/sdk/types.js';
import { ServerInitializer, ServerComponents } from './ServerInitializer.js';
import { ToolRouter } from './ToolRouter.js';
import { getAllToolDefinitions } from './ToolDefinitions.js';
import { setupResourceHandlers } from './handlers/index.js';
import { SessionBootstrapper } from './SessionBootstrapper.js';
import { logger } from '../utils/logger.js';
import { logError, formatMCPError } from '../utils/errorHandler.js';
import { generateRequestId } from '../utils/requestId.js'; // ✅ FIX HIGH-10: Request ID generation

/**
 * ✅ FIX ISSUE-3: Default timeout for tool call execution (60 seconds)
 * Prevents a hanging tool from blocking the entire MCP server indefinitely.
 * Configurable via MEMESH_TOOL_TIMEOUT_MS environment variable.
 */
const DEFAULT_TOOL_TIMEOUT_MS = 60000;
const MIN_TOOL_TIMEOUT_MS = 1000;
// ✅ FIX MINOR (Round 1): Validate MEMESH_TOOL_TIMEOUT_MS is positive with minimum bound
const parsedToolTimeoutMs = parseInt(process.env.MEMESH_TOOL_TIMEOUT_MS || '', 10);
const toolTimeoutMs = Number.isFinite(parsedToolTimeoutMs) && parsedToolTimeoutMs > 0
  ? Math.max(MIN_TOOL_TIMEOUT_MS, parsedToolTimeoutMs)
  : DEFAULT_TOOL_TIMEOUT_MS;

/**
 * ✅ FIX ISSUE-3: Tool call timeout error
 * Thrown when a tool call exceeds the configured timeout.
 * ✅ FIX MINOR (Round 1): Exported for testability
 */
export class ToolCallTimeoutError extends Error {
  public readonly toolName: string;
  public readonly timeoutMs: number;
  public readonly elapsedMs: number;

  constructor(toolName: string, timeoutMs: number, elapsedMs: number) {
    super(`Tool '${toolName}' timed out after ${elapsedMs}ms (limit: ${timeoutMs}ms)`);
    this.name = 'ToolCallTimeoutError';
    this.toolName = toolName;
    this.timeoutMs = timeoutMs;
    this.elapsedMs = elapsedMs;
  }
}

/**
 * MeMesh MCP Server
 *
 * Main server class that integrates Model Context Protocol (MCP) with the MeMesh
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
 * // Or programmatically (using async factory pattern):
 * const server = await ClaudeCodeBuddyMCPServer.create();
 * await server.start();
 * ```
 */
class ClaudeCodeBuddyMCPServer {
  private server: Server;
  private components: ServerComponents;
  private toolRouter: ToolRouter;
  private sessionBootstrapper: SessionBootstrapper;
  private isShuttingDown = false;
  // ✅ FIX MINOR-2: Store shutdown promise for re-entry handling
  private shutdownPromise: Promise<void> | null = null;

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
   * - Security and task management
   * - Handler modules for tools and buddy commands
   *
   * The constructor follows a strict initialization order managed by ServerInitializer
   * to ensure all dependencies are properly set up.
   *
   * Note: This is a static factory method pattern. Use ClaudeCodeBuddyMCPServer.create() instead.
   */
  private constructor(components: ServerComponents) {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'memesh',
        version: '2.6.6',
      },
      {
        capabilities: {
          tools: {},
          resources: {
            subscribe: true,  // Enable resource updates
            listChanged: false,  // Resource list is static (but templates are dynamic)
          },
        },
      }
    );

    // Store initialized components
    this.components = components;

    // Create ToolRouter with all required components
    this.toolRouter = new ToolRouter({
      rateLimiter: this.components.rateLimiter,
      toolHandlers: this.components.toolHandlers,
      buddyHandlers: this.components.buddyHandlers,
      a2aHandlers: this.components.a2aHandlers,
      secretManager: this.components.secretManager,
      taskQueue: this.components.taskQueue,
      mcpTaskDelegator: this.components.mcpTaskDelegator,
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
   * Create a new MCP server instance (async factory method)
   *
   * @returns Promise<ClaudeCodeBuddyMCPServer> Fully initialized server instance
   */
  static async create(): Promise<ClaudeCodeBuddyMCPServer> {
    // Initialize all components (async)
    const components = await ServerInitializer.initialize();

    // Create server instance
    return new ClaudeCodeBuddyMCPServer(components);
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
      // ✅ FIX HIGH-10: Generate request ID for tracing
      const requestId = generateRequestId();
      // ✅ FIX MINOR (Round 1): Proper type narrowing instead of `as any`
      const params = request.params as CallToolRequestParams;
      const toolName = params.name || 'unknown';
      const startTime = Date.now();

      logger.debug('[MCP] Incoming tool call request', {
        requestId,
        toolName,
        component: 'ClaudeCodeBuddyMCPServer',
      });

      try {
        // ✅ FIX ISSUE-3: Execute tool call with configurable timeout
        // Uses Promise.race with AbortController pattern for cancellable timeout
        const toolPromise = this.toolRouter.routeToolCall(request.params, undefined, requestId);

        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            const elapsed = Date.now() - startTime;
            reject(new ToolCallTimeoutError(toolName, toolTimeoutMs, elapsed));
          }, toolTimeoutMs);
        });

        let result;
        try {
          result = await Promise.race([toolPromise, timeoutPromise]);
        } finally {
          // Always clear timeout to prevent timer leak, whether tool succeeded or failed
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }

        return await this.sessionBootstrapper.maybePrepend(result);
      } catch (error) {
        const elapsed = Date.now() - startTime;

        // ✅ FIX ISSUE-3: Log timeout events with tool name and elapsed time
        if (error instanceof ToolCallTimeoutError) {
          logger.error('[MCP] Tool call timed out', {
            requestId,
            toolName,
            timeoutMs: toolTimeoutMs,
            elapsedMs: elapsed,
            component: 'ClaudeCodeBuddyMCPServer',
          });
        }

        // ✅ FIX HIGH-10: Include request ID in error logs
        logError(error, {
          component: 'ClaudeCodeBuddyMCPServer',
          method: 'CallToolRequestHandler',
          requestId,
          data: {
            toolName,
            elapsedMs: elapsed,
          },
        });

        // ✅ FIX ISSUE-4: Return proper MCP-formatted error response instead of throwing
        // This ensures the MCP client always gets a structured response, not a raw exception.
        // Throwing raw errors can cause MCP protocol violations and client disconnects.
        return formatMCPError(error, {
          component: 'ClaudeCodeBuddyMCPServer',
          method: 'CallToolRequestHandler',
          requestId,
          data: {
            toolName,
            elapsedMs: elapsed,
          },
        });
      }
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
   * const server = await ClaudeCodeBuddyMCPServer.create();
   * await server.start(); // Runs until terminated
   * ```
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // No logging - keep stdio completely clean for MCP JSON-RPC communication
  }

  /**
   * Handle a raw MCP JSON-RPC request directly (for daemon proxy mode).
   *
   * This method allows the daemon to process MCP requests from proxy clients
   * without going through the stdio transport. It parses the JSON-RPC request
   * and routes it to the appropriate handler.
   *
   * @param request - Raw MCP JSON-RPC request object
   * @returns JSON-RPC response object
   */
  async handleRequest(request: unknown): Promise<unknown> {
    const requestId = generateRequestId();

    // Validate request structure
    if (!request || typeof request !== 'object') {
      return {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request' },
      };
    }

    const req = request as { method?: string; params?: unknown; id?: unknown };
    const method = req.method;
    const params = req.params;
    const id = req.id;

    try {
      // Route based on method
      if (method === 'tools/list') {
        const tools = getAllToolDefinitions();
        return {
          jsonrpc: '2.0',
          id,
          result: { tools },
        };
      }

      if (method === 'tools/call') {
        const startTime = Date.now();
        const callParams = params as CallToolRequestParams | undefined;
        const toolName = callParams?.name || 'unknown';

        logger.debug('[MCP] Daemon handling tool call request', {
          requestId,
          toolName,
          component: 'ClaudeCodeBuddyMCPServer',
        });

        // Execute with timeout (same logic as setupHandlers)
        const toolPromise = this.toolRouter.routeToolCall(callParams, undefined, requestId);

        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            const elapsed = Date.now() - startTime;
            reject(new ToolCallTimeoutError(toolName, toolTimeoutMs, elapsed));
          }, toolTimeoutMs);
        });

        let result;
        try {
          result = await Promise.race([toolPromise, timeoutPromise]);
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }

        const finalResult = await this.sessionBootstrapper.maybePrepend(result);
        return {
          jsonrpc: '2.0',
          id,
          result: finalResult,
        };
      }

      // Unknown method
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
    } catch (error) {
      const elapsed = Date.now();

      if (error instanceof ToolCallTimeoutError) {
        logger.error('[MCP] Daemon tool call timed out', {
          requestId,
          toolName: error.toolName,
          timeoutMs: toolTimeoutMs,
          component: 'ClaudeCodeBuddyMCPServer',
        });
      }

      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'handleRequest',
        requestId,
      });

      const errorResult = formatMCPError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'handleRequest',
        requestId,
      });

      return {
        jsonrpc: '2.0',
        id,
        result: errorResult,
      };
    }
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

    // ✅ FIX MINOR-3: Use process.once() instead of process.on() to prevent
    // handlers from being registered for repeated signals
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.once(signal, () => {
        void this.shutdown(signal);
      });
    }
  }

  /**
   * Gracefully shutdown server resources
   *
   * ✅ FIX HIGH-7: Proper resource cleanup to prevent data corruption
   * Closes all resources in correct order: databases first, then network, then internal state
   * ✅ FIX MINOR-2: Store and return shutdown promise for re-entry handling
   */
  private async shutdown(reason: string): Promise<void> {
    // ✅ FIX MINOR-2: If already shutting down, return the existing promise
    // This ensures subsequent calls wait for the first shutdown to complete
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    // Store the shutdown promise for re-entry
    this.shutdownPromise = this.performShutdown(reason);
    return this.shutdownPromise;
  }

  /**
   * Internal shutdown implementation
   */
  private async performShutdown(reason: string): Promise<void> {

    logger.warn(`Shutting down MCP server (${reason})...`);

    // ✅ FIX HIGH-7: Close resources in proper order
    // 1. Close databases first (most critical for data integrity)
    try {
      logger.info('Closing knowledge graph database...');
      if (this.components.knowledgeGraph) {
        await this.components.knowledgeGraph.close();
      }
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'shutdown',
        operation: 'closing knowledge graph',
      });
      logger.error('Failed to close knowledge graph cleanly:', error);
    }

    // 2. Evolution monitor cleanup (no cleanup needed after simplification)
    try {
      logger.info('Evolution monitor ready for shutdown...');
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'shutdown',
        operation: 'closing evolution monitor',
      });
      logger.error('Failed to close evolution monitor cleanly:', error);
    }

    // 2.5. Close SecretManager database (Phase 0.7.0)
    try {
      logger.info('Closing secret manager database...');
      if (this.components.secretManager) {
        this.components.secretManager.close();
      }
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'shutdown',
        operation: 'closing secret manager',
      });
      logger.error('Failed to close secret manager cleanly:', error);
    }

    // 2.6. Close TaskQueue database (A2A Protocol Phase 1.0)
    try {
      logger.info('Closing task queue database...');
      if (this.components.taskQueue) {
        this.components.taskQueue.close();
      }
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'shutdown',
        operation: 'closing task queue',
      });
      logger.error('Failed to close task queue cleanly:', error);
    }

    // 3. Stop rate limiter (cleanup intervals)
    try {
      logger.info('Stopping rate limiter...');
      if (this.components.rateLimiter) {
        this.components.rateLimiter.stop();
      }
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'shutdown',
        operation: 'stopping rate limiter',
      });
      logger.error('Failed to stop rate limiter cleanly:', error);
    }

    // 4. Finally, close MCP transport
    try {
      logger.info('Closing MCP server transport...');
      await this.server.close();
    } catch (error) {
      logError(error, {
        component: 'ClaudeCodeBuddyMCPServer',
        method: 'shutdown',
        operation: 'closing MCP server',
      });
      logger.error('Failed to close MCP server cleanly:', error);
    }

    logger.info('Shutdown complete');
  }
}

// Export server class for bootstrap loader
export { ClaudeCodeBuddyMCPServer };

// NOTE: Do not run server directly from this file.
// Use server-bootstrap.ts instead, which sets MCP_SERVER_MODE before imports.
