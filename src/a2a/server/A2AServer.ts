/**
 * A2A HTTP Server
 *
 * Express.js server implementing A2A Protocol HTTP+JSON binding.
 * Provides RESTful endpoints for agent-to-agent communication:
 * - POST /a2a/send-message - Send message and create task
 * - GET /a2a/tasks/:taskId - Get task status and result
 * - GET /a2a/tasks - List tasks with filtering
 * - POST /a2a/tasks/:taskId/cancel - Cancel a task
 * - GET /a2a/agent-card - Get agent capabilities (public)
 *
 * Features:
 * - Dynamic port allocation
 * - Agent registry with heartbeat
 * - Task timeout detection
 * - Bearer token authentication
 *
 * @module a2a/server
 */

import express, { type Express } from 'express';
import type { Server } from 'http';
import { createServer } from 'net';
import { logger } from '../../utils/logger.js';
import { TaskQueue } from '../storage/TaskQueue.js';
import { AgentRegistry } from '../storage/AgentRegistry.js';
import type { AgentCard } from '../types/index.js';
import { A2ARoutes } from './routes.js';
import {
  errorHandler,
  requestLogger,
  corsMiddleware,
  jsonErrorHandler,
} from './middleware.js';
import { authenticateToken } from './middleware/auth.js';
import {
  rateLimitMiddleware,
  startCleanup,
  stopCleanup,
} from './middleware/rateLimit.js';
import { requestTimeoutMiddleware } from './middleware/timeout.js';
import {
  resourceProtectionMiddleware,
  startResourceProtectionCleanup,
  stopResourceProtectionCleanup,
} from './middleware/resourceProtection.js';
import {
  csrfTokenMiddleware,
  csrfProtection,
  startCsrfCleanup,
  stopCsrfCleanup,
} from './middleware/csrf.js';
import { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
import { TimeoutChecker } from '../jobs/TimeoutChecker.js';
import { TIME, NETWORK } from '../constants.js';
import { tracingMiddleware, spanMiddleware } from '../../utils/tracing/index.js';

/**
 * A2A Server Configuration
 */
export interface A2AServerConfig {
  /** Agent identifier */
  agentId: string;
  /** Agent card with capabilities and metadata */
  agentCard: AgentCard;
  /** Fixed port number (optional, will use dynamic port if not specified) */
  port?: number;
  /** Port range for dynamic allocation (default: 3000-3999) */
  portRange?: { min: number; max: number };
  /** Heartbeat interval in milliseconds (default: TIME.HEARTBEAT_INTERVAL_MS = 60,000ms) */
  heartbeatInterval?: number;
}

/**
 * A2AServer class
 *
 * HTTP server implementing A2A Protocol for agent-to-agent communication.
 * Handles task creation, management, and inter-agent messaging.
 *
 * @example
 * ```typescript
 * const server = new A2AServer({
 *   agentId: 'my-agent',
 *   agentCard: {
 *     id: 'my-agent',
 *     name: 'My Agent',
 *     version: '1.0.0',
 *     capabilities: {
 *       delegation: {
 *         supportsMCPDelegation: true,
 *         maxConcurrentTasks: 1
 *       }
 *     }
 *   },
 *   portRange: { min: 3000, max: 3999 },
 *   heartbeatInterval: 60_000
 * });
 *
 * const port = await server.start();
 * console.log(`Server running on port ${port}`);
 *
 * // Later...
 * await server.stop();
 * ```
 */
export class A2AServer {
  private app: Express;
  private server: Server | null = null;
  private taskQueue: TaskQueue;
  private registry: AgentRegistry;
  private routes: A2ARoutes;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private port: number = 0;
  private delegator: MCPTaskDelegator;
  private timeoutChecker: TimeoutChecker;

  /**
   * Create a new A2A Server
   *
   * @param config - Server configuration including agent ID, card, and port settings
   */
  constructor(private config: A2AServerConfig) {
    this.taskQueue = new TaskQueue(config.agentId);
    this.registry = AgentRegistry.getInstance();
    this.routes = new A2ARoutes(config.agentId, this.taskQueue, config.agentCard);
    this.app = this.createApp();
    this.delegator = new MCPTaskDelegator(this.taskQueue, logger);
    this.timeoutChecker = new TimeoutChecker(this.delegator);
  }

  private createApp(): Express {
    const app = express();

    // 🔒 SECURITY LAYER 1: Resource protection (DoS prevention) - MUST BE FIRST
    // Prevents: connection flooding, large payloads, memory exhaustion
    app.use(resourceProtectionMiddleware());

    app.use(express.json({ limit: '10mb' }));
    app.use(corsMiddleware);

    // Enable distributed tracing for all requests
    app.use(tracingMiddleware());

    // Request timeout middleware (must be before all route handlers)
    app.use(requestTimeoutMiddleware());

    app.use(requestLogger);

    // 🔒 SECURITY LAYER 2: CSRF token generation (all requests)
    // Generates CSRF token in cookie/header for client to use in state-changing requests
    app.use(csrfTokenMiddleware);

    // Protected routes - require authentication and rate limiting
    // POST routes also require CSRF protection (state-changing operations)
    // ✅ CSRF Protection (SECURITY FIX - CRITICAL-3)
    // Note: Automatically exempts Bearer token authentication (not vulnerable to CSRF)
    app.post(
      '/a2a/send-message',
      authenticateToken,
      csrfProtection, // 🔒 CSRF protection for cookie-based auth, skips Bearer tokens
      rateLimitMiddleware,
      spanMiddleware('a2a.send-message'),
      this.routes.sendMessage
    );
    app.get(
      '/a2a/tasks/:taskId',
      authenticateToken,
      rateLimitMiddleware,
      spanMiddleware('a2a.get-task'),
      this.routes.getTask
    );
    app.get(
      '/a2a/tasks',
      authenticateToken,
      rateLimitMiddleware,
      spanMiddleware('a2a.list-tasks'),
      this.routes.listTasks
    );
    app.post(
      '/a2a/tasks/:taskId/cancel',
      authenticateToken,
      csrfProtection, // 🔒 CSRF protection for POST
      rateLimitMiddleware,
      spanMiddleware('a2a.cancel-task'),
      this.routes.cancelTask
    );

    // Public route - agent card discovery
    app.get('/a2a/agent-card', spanMiddleware('a2a.agent-card'), this.routes.getAgentCard);

    app.use(jsonErrorHandler);
    app.use(errorHandler);

    return app;
  }

  /**
   * Start the A2A server
   *
   * Performs the following operations:
   * 1. Finds an available port (if not specified)
   * 2. Starts the HTTP server
   * 3. Registers agent in the registry
   * 4. Starts heartbeat mechanism
   * 5. Starts timeout checker
   *
   * @returns Promise resolving to the actual port number the server is listening on
   * @throws Error if server fails to start or no available port found
   *
   * @example
   * ```typescript
   * const port = await server.start();
   * console.log(`Server started on port ${port}`);
   * ```
   */
  async start(): Promise<number> {
    const port = await this.findAvailablePort();
    this.port = port;

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        logger.info('[A2A Server] Started', { port });

        const baseUrl = `http://localhost:${port}`;
        this.registry.register({
          agentId: this.config.agentId,
          baseUrl,
          port,
          capabilities: this.config.agentCard.capabilities,
        });

        this.startHeartbeat();

        // Start timeout checker (every 60 seconds)
        this.timeoutChecker.start();

        // Start rate limit cleanup (every 5 minutes)
        startCleanup();

        // 🔒 Start resource protection cleanup (every 1 minute)
        startResourceProtectionCleanup();

        // 🔒 Start CSRF token cleanup (every 10 minutes)
        startCsrfCleanup();

        resolve(port);
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Stop the A2A server
   *
   * Performs graceful shutdown:
   * 1. Stops timeout checker
   * 2. Stops heartbeat
   * 3. Deactivates agent in registry
   * 4. Closes HTTP server
   * 5. Closes task queue database connection
   *
   * @returns Promise resolving when server is fully stopped
   *
   * @example
   * ```typescript
   * await server.stop();
   * console.log('Server stopped gracefully');
   * ```
   */
  async stop(): Promise<void> {
    // Stop timeout checker
    this.timeoutChecker.stop();

    // Stop rate limit cleanup
    stopCleanup();

    // 🔒 Stop resource protection cleanup
    stopResourceProtectionCleanup();

    // 🔒 Stop CSRF token cleanup
    stopCsrfCleanup();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.registry.deactivate(this.config.agentId);

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          logger.info('[A2A Server] Stopped');
          this.taskQueue.close();
          resolve();
        });
      });
    }
  }

  /**
   * Get the port the server is listening on
   *
   * @returns Port number (0 if server not started)
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get the task queue instance
   *
   * @returns TaskQueue instance used by this server
   */
  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  /**
   * Find an available port for the server
   *
   * @returns Available port number
   * @throws Error if no available port found in range
   */
  private async findAvailablePort(): Promise<number> {
    if (this.config.port) {
      return this.config.port;
    }

    const range = this.config.portRange || NETWORK.DEFAULT_PORT_RANGE;

    for (let port = range.min; port <= range.max; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }

    throw new Error(`No available port in range ${range.min}-${range.max}`);
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      server.once('listening', () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Start heartbeat mechanism
   *
   * Sends periodic heartbeats to the registry to maintain agent active status.
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || TIME.HEARTBEAT_INTERVAL_MS;

    this.heartbeatTimer = setInterval(() => {
      this.registry.heartbeat(this.config.agentId);
      logger.debug('[A2A Server] Heartbeat sent', { agentId: this.config.agentId });
    }, interval);
  }
}
