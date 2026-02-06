/**
 * MeMesh - Main Entry Point
 * AI Memory Platform - Local MCP Server
 */

import { logger } from './utils/logger.js';

async function main() {
  logger.info('🤖 MeMesh starting...');
  logger.info('Mode: MCP Server (local knowledge graph + memory)');

  logger.info('\n✅ MeMesh ready!');
  logger.info('Use as MCP server via Claude Code, Cursor, or other MCP clients.\n');
}

/**
 * Graceful shutdown handler with timeout protection
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`\n${signal} received. Shutting down gracefully...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('⚠️  Shutdown timeout reached (5s), forcing exit');
    process.exit(1);
  }, 5000);

  try {
    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Setup signal handlers for graceful shutdown
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

// Run
main().catch((error) => {
  logger.error('Failed to start MeMesh:', error);
  process.exit(1);
});

// Module exports
export * from './telemetry/index.js';

// Core exports for library usage
export { MCPToolInterface } from './core/MCPToolInterface.js';
export { CheckpointDetector } from './core/CheckpointDetector.js';

// Type exports
export type { ToolMetadata, ToolInvocationResult, ToolDependencyCheck } from './core/MCPToolInterface.js';
export type { CheckpointCallback, CheckpointMetadata, CheckpointTriggerResult } from './core/CheckpointDetector.js';

// Enum exports
export { Checkpoint } from './types/Checkpoint.js';
