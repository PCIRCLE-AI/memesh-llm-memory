import dotenv from 'dotenv';
dotenv.config();
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ServerInitializer } from './ServerInitializer.js';
import { ToolRouter } from './ToolRouter.js';
import { getAllToolDefinitions } from './ToolDefinitions.js';
import { setupResourceHandlers } from './handlers/index.js';
import { getRAGAgent } from '../agents/rag/index.js';
import { FileWatcher } from '../agents/rag/FileWatcher.js';
import { logger } from '../utils/logger.js';
import { logError } from '../utils/errorHandler.js';
import { validateAllApiKeys } from '../utils/apiKeyValidator.js';
class ClaudeCodeBuddyMCPServer {
    server;
    components;
    toolRouter;
    fileWatcher;
    get gitHandlers() {
        return this.components.gitHandlers;
    }
    get toolHandlers() {
        return this.components.toolHandlers;
    }
    get buddyHandlers() {
        return this.components.buddyHandlers;
    }
    constructor() {
        this.server = new Server({
            name: 'claude-code-buddy',
            version: '2.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
            },
        });
        this.components = ServerInitializer.initialize();
        this.toolRouter = new ToolRouter({
            router: this.components.router,
            formatter: this.components.formatter,
            agentRegistry: this.components.agentRegistry,
            rateLimiter: this.components.rateLimiter,
            gitHandlers: this.components.gitHandlers,
            toolHandlers: this.components.toolHandlers,
            buddyHandlers: this.components.buddyHandlers,
        });
        this.setupHandlers();
        setupResourceHandlers(this.server);
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const allAgents = this.components.agentRegistry.getAllAgents();
            const tools = getAllToolDefinitions(allAgents);
            return { tools };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            return await this.toolRouter.routeToolCall(request.params);
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        logger.error('Claude Code Buddy MCP Server started');
        logger.error(`Available agents: ${this.components.agentRegistry.getAgentCount()}`);
        await this.startFileWatcherIfEnabled();
        logger.error('Waiting for requests...');
    }
    async startFileWatcherIfEnabled() {
        try {
            if (!process.env.OPENAI_API_KEY) {
                logger.error('RAG File Watcher: Skipped (no OpenAI API key)');
                return;
            }
            const rag = await getRAGAgent();
            if (!rag.isRAGEnabled()) {
                logger.error('RAG File Watcher: Skipped (RAG not enabled)');
                return;
            }
            this.fileWatcher = new FileWatcher(rag, {
                onIndexed: async (files) => {
                    if (files.length === 0)
                        return;
                    logger.error('\n📥 New Files Indexed by RAG Agent:');
                    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    for (const filePath of files) {
                        const fileName = filePath.split('/').pop() || filePath;
                        const timestamp = new Date().toLocaleString();
                        logger.error(`   📄 ${fileName}`);
                        logger.error(`      Path: ${filePath}`);
                        logger.error(`      Indexed at: ${timestamp}`);
                        logger.error('');
                        try {
                            this.components.knowledgeGraph.createEntity({
                                name: `RAG Indexed File: ${fileName} (${new Date().toISOString().split('T')[0]})`,
                                type: 'rag_indexed_file',
                                observations: [
                                    `File path: ${filePath}`,
                                    `Indexed at: ${timestamp}`,
                                    `File name: ${fileName}`,
                                    'Status: Successfully indexed and searchable'
                                ]
                            });
                        }
                        catch (kgError) {
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
        }
        catch (error) {
            logError(error, {
                component: 'ClaudeCodeBuddyMCPServer',
                method: 'startFileWatcherIfEnabled',
                operation: 'starting RAG file watcher',
            });
            logger.error('RAG File Watcher: Failed to start:', error);
        }
    }
}
async function main() {
    try {
        validateAllApiKeys();
        const mcpServer = new ClaudeCodeBuddyMCPServer();
        await mcpServer.start();
    }
    catch (error) {
        logError(error, {
            component: 'ClaudeCodeBuddyMCPServer',
            method: 'main',
            operation: 'starting MCP server',
        });
        logger.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
export { ClaudeCodeBuddyMCPServer };
//# sourceMappingURL=server.js.map