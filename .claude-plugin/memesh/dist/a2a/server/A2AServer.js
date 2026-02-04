import express from 'express';
import { createServer } from 'net';
import { logger } from '../../utils/logger.js';
import { TaskQueue } from '../storage/TaskQueue.js';
import { AgentRegistry, startAgentRegistryCleanup, stopAgentRegistryCleanup, } from '../storage/AgentRegistry.js';
import { A2ARoutes } from './routes.js';
import { errorHandler, requestLogger, corsMiddleware, jsonErrorHandler, } from './middleware.js';
import { authenticateToken } from './middleware/auth.js';
import { rateLimitMiddleware, startCleanup, stopCleanup, } from './middleware/rateLimit.js';
import { requestTimeoutMiddleware } from './middleware/timeout.js';
import { resourceProtectionMiddleware, startResourceProtectionCleanup, stopResourceProtectionCleanup, } from './middleware/resourceProtection.js';
import { csrfTokenMiddleware, csrfProtection, startCsrfCleanup, stopCsrfCleanup, } from './middleware/csrf.js';
import { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
import { TimeoutChecker } from '../jobs/TimeoutChecker.js';
import { TIME, NETWORK } from '../constants.js';
import { tracingMiddleware, spanMiddleware } from '../../utils/tracing/index.js';
export class A2AServer {
    config;
    app;
    server = null;
    taskQueue;
    registry;
    routes;
    heartbeatTimer = null;
    port = 0;
    delegator;
    timeoutChecker;
    constructor(config) {
        this.config = config;
        this.taskQueue = new TaskQueue(config.agentId);
        this.registry = AgentRegistry.getInstance();
        this.routes = new A2ARoutes(config.agentId, this.taskQueue, config.agentCard);
        this.app = this.createApp();
        this.delegator = new MCPTaskDelegator(this.taskQueue, logger);
        this.timeoutChecker = new TimeoutChecker(this.delegator);
    }
    createApp() {
        const app = express();
        app.use(resourceProtectionMiddleware());
        app.use(express.json({ limit: '10mb' }));
        app.use(corsMiddleware);
        app.use(tracingMiddleware());
        app.use(requestTimeoutMiddleware());
        app.use(requestLogger);
        app.use(csrfTokenMiddleware);
        app.post('/a2a/send-message', authenticateToken, csrfProtection, rateLimitMiddleware, spanMiddleware('a2a.send-message'), this.routes.sendMessage);
        app.get('/a2a/tasks/:taskId', authenticateToken, rateLimitMiddleware, spanMiddleware('a2a.get-task'), this.routes.getTask);
        app.get('/a2a/tasks', authenticateToken, rateLimitMiddleware, spanMiddleware('a2a.list-tasks'), this.routes.listTasks);
        app.post('/a2a/tasks/:taskId/cancel', authenticateToken, csrfProtection, rateLimitMiddleware, spanMiddleware('a2a.cancel-task'), this.routes.cancelTask);
        app.get('/a2a/agent-card', spanMiddleware('a2a.agent-card'), this.routes.getAgentCard);
        app.use(jsonErrorHandler);
        app.use(errorHandler);
        return app;
    }
    async start() {
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
                this.timeoutChecker.start();
                startCleanup();
                startResourceProtectionCleanup();
                startCsrfCleanup();
                startAgentRegistryCleanup();
                resolve(port);
            });
            this.server.on('error', (err) => {
                try {
                    this.taskQueue.close();
                }
                catch (closeErr) {
                    logger.error('[A2A Server] Failed to close TaskQueue during startup error cleanup', {
                        originalError: err.message,
                        closeError: closeErr instanceof Error ? closeErr.message : String(closeErr),
                    });
                }
                reject(err);
            });
        });
    }
    async stop() {
        this.timeoutChecker.stop();
        stopCleanup();
        stopResourceProtectionCleanup();
        stopCsrfCleanup();
        stopAgentRegistryCleanup();
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        this.registry.deactivate(this.config.agentId);
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    logger.info('[A2A Server] Stopped');
                    this.taskQueue.close();
                    resolve();
                });
            });
        }
        else {
            this.taskQueue.close();
        }
    }
    getPort() {
        return this.port;
    }
    getTaskQueue() {
        return this.taskQueue;
    }
    async findAvailablePort() {
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
    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = createServer();
            server.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                }
                else {
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
    startHeartbeat() {
        const interval = this.config.heartbeatInterval || TIME.HEARTBEAT_INTERVAL_MS;
        this.heartbeatTimer = setInterval(() => {
            this.registry.heartbeat(this.config.agentId);
            logger.debug('[A2A Server] Heartbeat sent', { agentId: this.config.agentId });
        }, interval);
    }
}
//# sourceMappingURL=A2AServer.js.map