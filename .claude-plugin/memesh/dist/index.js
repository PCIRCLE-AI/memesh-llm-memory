import { logger } from './utils/logger.js';
async function main() {
    logger.info('🤖 MeMesh starting...');
    logger.info('Mode: MCP Server (local knowledge graph + memory)');
    logger.info('\n✅ MeMesh ready!');
    logger.info('Use as MCP server via Claude Code, Cursor, or other MCP clients.\n');
}
async function shutdown(signal) {
    logger.info(`\n${signal} received. Shutting down gracefully...`);
    const shutdownTimeout = setTimeout(() => {
        logger.error('⚠️  Shutdown timeout reached (5s), forcing exit');
        process.exit(1);
    }, 5000);
    try {
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
export { MCPToolInterface } from './core/MCPToolInterface.js';
export { CheckpointDetector } from './core/CheckpointDetector.js';
export { Checkpoint } from './types/Checkpoint.js';
//# sourceMappingURL=index.js.map