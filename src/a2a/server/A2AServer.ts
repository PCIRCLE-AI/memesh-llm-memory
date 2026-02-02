/**
 * A2A HTTP Server
 * Express.js server implementing A2A Protocol HTTP+JSON binding
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
import { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
import { TimeoutChecker } from '../jobs/TimeoutChecker.js';

export interface A2AServerConfig {
  agentId: string;
  agentCard: AgentCard;
  port?: number;
  portRange?: { min: number; max: number };
  heartbeatInterval?: number;
}

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

    app.use(express.json({ limit: '10mb' }));
    app.use(corsMiddleware);
    app.use(requestLogger);

    // Protected routes - require authentication
    app.post('/a2a/send-message', authenticateToken, this.routes.sendMessage);
    app.get('/a2a/tasks/:taskId', authenticateToken, this.routes.getTask);
    app.get('/a2a/tasks', authenticateToken, this.routes.listTasks);
    app.post('/a2a/tasks/:taskId/cancel', authenticateToken, this.routes.cancelTask);

    // Public route - agent card discovery
    app.get('/a2a/agent-card', this.routes.getAgentCard);

    app.use(jsonErrorHandler);
    app.use(errorHandler);

    return app;
  }

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

        resolve(port);
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    // Stop timeout checker
    this.timeoutChecker.stop();

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

  getPort(): number {
    return this.port;
  }

  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  private async findAvailablePort(): Promise<number> {
    if (this.config.port) {
      return this.config.port;
    }

    const range = this.config.portRange || { min: 3000, max: 3999 };

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

  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 60000;

    this.heartbeatTimer = setInterval(() => {
      this.registry.heartbeat(this.config.agentId);
      logger.debug('[A2A Server] Heartbeat sent', { agentId: this.config.agentId });
    }, interval);
  }
}
