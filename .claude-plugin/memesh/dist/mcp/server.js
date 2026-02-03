#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ServerInitializer } from './ServerInitializer.js';
import { ToolRouter } from './ToolRouter.js';
import { getAllToolDefinitions } from './ToolDefinitions.js';
import { setupResourceHandlers } from './handlers/index.js';
import { SessionBootstrapper } from './SessionBootstrapper.js';
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';
import { generateRequestId } from '../utils/requestId.js';
class ClaudeCodeBuddyMCPServer {
    server;
    components;
    toolRouter;
    sessionBootstrapper;
    isShuttingDown = false;
    get toolHandlers() {
        return this.components.toolHandlers;
    }
    get buddyHandlers() {
        return this.components.buddyHandlers;
    }
    get developmentButler() {
        return this.components.developmentButler;
    }
    constructor(components) {
        this.server = new Server({
            name: 'memesh',
            version: '2.6.6',
        }, {
            capabilities: {
                tools: {},
                resources: {
                    subscribe: true,
                    listChanged: false,
                },
            },
        });
        this.components = components;
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
        this.sessionBootstrapper = new SessionBootstrapper(this.components.projectMemoryManager);
        this.setupHandlers();
        setupResourceHandlers(this.server);
        this.setupSignalHandlers();
    }
    static async create() {
        const components = await ServerInitializer.initialize();
        return new ClaudeCodeBuddyMCPServer(components);
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = getAllToolDefinitions();
            return { tools };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const requestId = generateRequestId();
            logger.debug('[MCP] Incoming tool call request', {
                requestId,
                toolName: request.params?.name,
                component: 'ClaudeCodeBuddyMCPServer',
            });
            try {
                const result = await this.toolRouter.routeToolCall(request.params, undefined, requestId);
                return await this.sessionBootstrapper.maybePrepend(result);
            }
            catch (error) {
                logError(error, {
                    component: 'ClaudeCodeBuddyMCPServer',
                    method: 'CallToolRequestHandler',
                    requestId,
                    data: {
                        toolName: request.params?.name,
                    },
                });
                throw error;
            }
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
    setupSignalHandlers() {
        this.server.onclose = () => {
            logger.warn('MCP transport closed');
        };
        this.server.onerror = (error) => {
            logger.error('MCP server error:', error);
        };
        const signals = ['SIGINT', 'SIGTERM'];
        for (const signal of signals) {
            process.on(signal, () => {
                void this.shutdown(signal);
            });
        }
    }
    async shutdown(reason) {
        if (this.isShuttingDown)
            return;
        this.isShuttingDown = true;
        logger.warn(`Shutting down MCP server (${reason})...`);
        try {
            logger.info('Closing knowledge graph database...');
            if (this.components.knowledgeGraph) {
                await this.components.knowledgeGraph.close();
            }
        }
        catch (error) {
            logError(error, {
                component: 'ClaudeCodeBuddyMCPServer',
                method: 'shutdown',
                operation: 'closing knowledge graph',
            });
            logger.error('Failed to close knowledge graph cleanly:', error);
        }
        try {
            logger.info('Evolution monitor ready for shutdown...');
        }
        catch (error) {
            logError(error, {
                component: 'ClaudeCodeBuddyMCPServer',
                method: 'shutdown',
                operation: 'closing evolution monitor',
            });
            logger.error('Failed to close evolution monitor cleanly:', error);
        }
        try {
            logger.info('Closing secret manager database...');
            if (this.components.secretManager) {
                this.components.secretManager.close();
            }
        }
        catch (error) {
            logError(error, {
                component: 'ClaudeCodeBuddyMCPServer',
                method: 'shutdown',
                operation: 'closing secret manager',
            });
            logger.error('Failed to close secret manager cleanly:', error);
        }
        try {
            logger.info('Closing task queue database...');
            if (this.components.taskQueue) {
                this.components.taskQueue.close();
            }
        }
        catch (error) {
            logError(error, {
                component: 'ClaudeCodeBuddyMCPServer',
                method: 'shutdown',
                operation: 'closing task queue',
            });
            logger.error('Failed to close task queue cleanly:', error);
        }
        try {
            logger.info('Stopping rate limiter...');
            if (this.components.rateLimiter) {
                this.components.rateLimiter.stop();
            }
        }
        catch (error) {
            logError(error, {
                component: 'ClaudeCodeBuddyMCPServer',
                method: 'shutdown',
                operation: 'stopping rate limiter',
            });
            logger.error('Failed to stop rate limiter cleanly:', error);
        }
        try {
            logger.info('Closing MCP server transport...');
            await this.server.close();
        }
        catch (error) {
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
export { ClaudeCodeBuddyMCPServer };
//# sourceMappingURL=server.js.map