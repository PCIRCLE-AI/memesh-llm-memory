import { Orchestrator } from './orchestrator/index.js';
import { appConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { AgentRegistry } from './core/AgentRegistry.js';
import { A2AServer } from './a2a/server/A2AServer.js';
import crypto from 'crypto';
let a2aServer = null;
async function main() {
    logger.info('🤖 MeMesh starting...');
    logger.info(`Mode: ${appConfig.orchestrator.mode}`);
    logger.info(`Claude Model: ${appConfig.claude.models.sonnet}`);
    const orchestrator = new Orchestrator();
    logger.info('✅ Orchestrator initialized');
    const status = await orchestrator.getSystemStatus();
    logger.info(`💻 System Resources: ${status.resources.availableMemoryMB}MB available (${status.resources.memoryUsagePercent}% used)`);
    logger.info(`💰 Monthly Spend: $${status.costStats.monthlySpend.toFixed(4)} ($${status.costStats.remainingBudget.toFixed(2)} remaining)`);
    logger.info(`📊 ${status.recommendation}`);
    const registry = new AgentRegistry();
    const capabilities = new Set(registry.getAllAgents().flatMap(agent => agent.capabilities || []));
    logger.info('\n✅ MeMesh ready!');
    logger.info(`\n📋 Capabilities loaded: ${capabilities.size}\n`);
    await startA2AServer();
    return orchestrator;
}
async function startA2AServer() {
    try {
        const agentId = process.env.A2A_AGENT_ID || `ccb-${crypto.randomBytes(4).toString('hex')}`;
        const agentCard = {
            id: agentId,
            name: 'MeMesh',
            description: 'AI development assistant and workflow automation agent',
            version: '2.5.3',
            capabilities: {
                skills: [
                    {
                        name: 'code-review',
                        description: 'Review code for quality, security, and best practices',
                    },
                    {
                        name: 'test-generation',
                        description: 'Generate comprehensive unit and integration tests',
                    },
                    {
                        name: 'workflow-automation',
                        description: 'Automate development workflows and tasks',
                    },
                    {
                        name: 'architecture-analysis',
                        description: 'Analyze and improve code architecture',
                    },
                ],
                supportedFormats: ['text/plain', 'application/json'],
                maxMessageSize: 10 * 1024 * 1024,
                streaming: false,
                pushNotifications: false,
            },
            endpoints: {
                baseUrl: 'http://localhost:3000',
            },
        };
        a2aServer = new A2AServer({
            agentId,
            agentCard,
            portRange: { min: 3000, max: 3999 },
            heartbeatInterval: 60000,
        });
        const port = await a2aServer.start();
        logger.info(`🌐 A2A Server started on port ${port}`);
        logger.info(`🆔 Agent ID: ${agentId}`);
    }
    catch (error) {
        logger.error('Failed to start A2A server:', error);
    }
}
async function shutdown(signal) {
    logger.info(`\n${signal} received. Shutting down gracefully...`);
    const shutdownTimeout = setTimeout(() => {
        logger.error('⚠️  Shutdown timeout reached (5s), forcing exit');
        process.exit(1);
    }, 5000);
    try {
        if (a2aServer) {
            await a2aServer.stop();
            logger.info('✅ A2A Server stopped');
        }
        clearTimeout(shutdownTimeout);
        process.exit(0);
    }
    catch (error) {
        logger.error('Error during shutdown:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
main().catch((error) => {
    logger.error('Failed to start MeMesh:', error);
    process.exit(1);
});
export * from './telemetry/index.js';
export { AgentRegistry } from './core/AgentRegistry.js';
export { MCPToolInterface } from './core/MCPToolInterface.js';
export { CheckpointDetector } from './core/CheckpointDetector.js';
export { DevelopmentButler } from './agents/DevelopmentButler.js';
export { TestWriterAgent } from './agents/TestWriterAgent.js';
export { Checkpoint } from './types/Checkpoint.js';
//# sourceMappingURL=index.js.map