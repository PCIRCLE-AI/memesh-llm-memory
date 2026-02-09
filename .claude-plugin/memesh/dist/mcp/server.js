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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
import { logError, formatMCPError } from '../utils/errorHandler.js';
import { generateRequestId } from '../utils/requestId.js';
const DEFAULT_TOOL_TIMEOUT_MS = 60000;
const MIN_TOOL_TIMEOUT_MS = 1000;
const parsedToolTimeoutMs = parseInt(process.env.MEMESH_TOOL_TIMEOUT_MS || '', 10);
const toolTimeoutMs = Number.isFinite(parsedToolTimeoutMs) && parsedToolTimeoutMs > 0
    ? Math.max(MIN_TOOL_TIMEOUT_MS, parsedToolTimeoutMs)
    : DEFAULT_TOOL_TIMEOUT_MS;
export class ToolCallTimeoutError extends Error {
    toolName;
    timeoutMs;
    elapsedMs;
    constructor(toolName, timeoutMs, elapsedMs) {
        super(`Tool '${toolName}' timed out after ${elapsedMs}ms (limit: ${timeoutMs}ms)`);
        this.name = 'ToolCallTimeoutError';
        this.toolName = toolName;
        this.timeoutMs = timeoutMs;
        this.elapsedMs = elapsedMs;
    }
}
class ClaudeCodeBuddyMCPServer {
    server;
    components;
    toolRouter;
    sessionBootstrapper;
    isShuttingDown = false;
    shutdownPromise = null;
    get toolHandlers() {
        return this.components.toolHandlers;
    }
    get buddyHandlers() {
        return this.components.buddyHandlers;
    }
    constructor(components) {
        this.server = new Server({
            name: 'memesh',
            version: packageJson.version,
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
            knowledgeGraph: this.components.knowledgeGraph,
        });
        this.components.toolInterface.attachToolDispatcher(this.toolRouter);
        this.sessionBootstrapper = new SessionBootstrapper(this.components.projectMemoryManager, undefined, this.components.sessionMemoryPipeline);
        void this.components.sessionMemoryPipeline.start().catch(err => {
            logger.warn('SessionMemoryPipeline failed to start:', err);
        });
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
            const params = request.params;
            const toolName = params.name || 'unknown';
            const startTime = Date.now();
            logger.debug('[MCP] Incoming tool call request', {
                requestId,
                toolName,
                component: 'ClaudeCodeBuddyMCPServer',
            });
            try {
                const toolPromise = this.toolRouter.routeToolCall(request.params, undefined, requestId);
                let timeoutId;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        const elapsed = Date.now() - startTime;
                        reject(new ToolCallTimeoutError(toolName, toolTimeoutMs, elapsed));
                    }, toolTimeoutMs);
                });
                let result;
                try {
                    result = await Promise.race([toolPromise, timeoutPromise]);
                }
                finally {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                }
                return await this.sessionBootstrapper.maybePrepend(result);
            }
            catch (error) {
                const elapsed = Date.now() - startTime;
                if (error instanceof ToolCallTimeoutError) {
                    logger.error('[MCP] Tool call timed out', {
                        requestId,
                        toolName,
                        timeoutMs: toolTimeoutMs,
                        elapsedMs: elapsed,
                        component: 'ClaudeCodeBuddyMCPServer',
                    });
                }
                logError(error, {
                    component: 'ClaudeCodeBuddyMCPServer',
                    method: 'CallToolRequestHandler',
                    requestId,
                    data: {
                        toolName,
                        elapsedMs: elapsed,
                    },
                });
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
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
    async handleRequest(request) {
        const requestId = generateRequestId();
        if (!request || typeof request !== 'object') {
            return {
                jsonrpc: '2.0',
                id: null,
                error: { code: -32600, message: 'Invalid Request' },
            };
        }
        const req = request;
        const method = req.method;
        const params = req.params;
        const id = req.id;
        try {
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
                const callParams = params;
                const toolName = callParams?.name || 'unknown';
                logger.debug('[MCP] Daemon handling tool call request', {
                    requestId,
                    toolName,
                    component: 'ClaudeCodeBuddyMCPServer',
                });
                const toolPromise = this.toolRouter.routeToolCall(callParams, undefined, requestId);
                let timeoutId;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        const elapsed = Date.now() - startTime;
                        reject(new ToolCallTimeoutError(toolName, toolTimeoutMs, elapsed));
                    }, toolTimeoutMs);
                });
                let result;
                try {
                    result = await Promise.race([toolPromise, timeoutPromise]);
                }
                finally {
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
            return {
                jsonrpc: '2.0',
                id,
                error: { code: -32601, message: `Method not found: ${method}` },
            };
        }
        catch (error) {
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
    setupSignalHandlers() {
        this.server.onclose = () => {
            logger.warn('MCP transport closed');
        };
        this.server.onerror = (error) => {
            logger.error('MCP server error:', error);
        };
        const signals = ['SIGINT', 'SIGTERM'];
        for (const signal of signals) {
            process.once(signal, () => {
                void this.shutdown(signal);
            });
        }
    }
    async shutdown(reason) {
        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }
        if (this.isShuttingDown)
            return;
        this.isShuttingDown = true;
        this.shutdownPromise = this.performShutdown(reason);
        return this.shutdownPromise;
    }
    async performShutdown(reason) {
        logger.warn(`Shutting down MCP server (${reason})...`);
        try {
            logger.info('Stopping session memory pipeline...');
            if (this.components.sessionMemoryPipeline) {
                await this.components.sessionMemoryPipeline.stop();
            }
        }
        catch (error) {
            logError(error, {
                component: 'ClaudeCodeBuddyMCPServer',
                method: 'shutdown',
                operation: 'stopping session memory pipeline',
            });
            logger.error('Failed to stop session memory pipeline cleanly:', error);
        }
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