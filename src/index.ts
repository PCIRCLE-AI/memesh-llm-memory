/**
 * Claude Code Buddy - Main Entry Point
 * Intelligent AI Agent Ecosystem
 */

import { Orchestrator } from './orchestrator/index.js';
import { appConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { AgentRegistry } from './core/AgentRegistry.js';
import { A2AServer } from './a2a/server/A2AServer.js';
import type { AgentCard } from './a2a/types/index.js';
import crypto from 'crypto';

let a2aServer: A2AServer | null = null;

async function main() {
  logger.info('🤖 Claude Code Buddy starting...');
  logger.info(`Mode: ${appConfig.orchestrator.mode}`);
  logger.info(`Claude Model: ${appConfig.claude.models.sonnet}`);

  // Initialize orchestrator
  const orchestrator = new Orchestrator();
  logger.info('✅ Orchestrator initialized');

  // Get system status
  const status = await orchestrator.getSystemStatus();
  logger.info(`💻 System Resources: ${status.resources.availableMemoryMB}MB available (${status.resources.memoryUsagePercent}% used)`);
  logger.info(`💰 Monthly Spend: $${status.costStats.monthlySpend.toFixed(4)} ($${status.costStats.remainingBudget.toFixed(2)} remaining)`);
  logger.info(`📊 ${status.recommendation}`);

  // Summarize capabilities instead of listing internal agents
  const registry = new AgentRegistry();
  const capabilities = new Set(
    registry.getAllAgents().flatMap(agent => agent.capabilities || [])
  );

  logger.info('\n✅ Claude Code Buddy ready!');
  logger.info(`\n📋 Capabilities loaded: ${capabilities.size}\n`);

  // Start A2A server for agent-to-agent communication
  await startA2AServer();

  // Future enhancements tracked in TECH_DEBT.md:
  // - Monitoring dashboard integration

  return orchestrator;
}

/**
 * Start A2A Protocol server for agent-to-agent communication
 */
async function startA2AServer(): Promise<void> {
  try {
    // Generate agent ID from env or create unique ID
    const agentId = process.env.A2A_AGENT_ID || `ccb-${crypto.randomBytes(4).toString('hex')}`;

    // Create agent card
    const agentCard: AgentCard = {
      id: agentId,
      name: 'Claude Code Buddy',
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
        maxMessageSize: 10 * 1024 * 1024, // 10MB
        streaming: false,
        pushNotifications: false,
      },
      endpoints: {
        baseUrl: 'http://localhost:3000', // Will be updated with actual port
      },
    };

    // Create and start A2A server
    a2aServer = new A2AServer({
      agentId,
      agentCard,
      portRange: { min: 3000, max: 3999 },
      heartbeatInterval: 60000, // 1 minute
    });

    const port = await a2aServer.start();
    logger.info(`🌐 A2A Server started on port ${port}`);
    logger.info(`🆔 Agent ID: ${agentId}`);
  } catch (error) {
    logger.error('Failed to start A2A server:', error);
    // Don't fail startup if A2A server fails
    // CCB can still function without A2A capabilities
  }
}

/**
 * Graceful shutdown handler with timeout protection
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`\n${signal} received. Shutting down gracefully...`);

  // Set shutdown timeout to prevent hung processes
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
  } catch (error) {
    logger.error('Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Setup signal handlers for graceful shutdown (using once to prevent multiple invocations)
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

// Run
main().catch((error) => {
  logger.error('Failed to start Claude Code Buddy:', error);
  process.exit(1);
});

// Module exports
export * from './telemetry/index.js';

// Core exports for library usage
export { AgentRegistry } from './core/AgentRegistry.js';
export { MCPToolInterface } from './core/MCPToolInterface.js';
export { CheckpointDetector } from './core/CheckpointDetector.js';

// Agent exports
export { DevelopmentButler } from './agents/DevelopmentButler.js';
export { TestWriterAgent } from './agents/TestWriterAgent.js';

// Type exports
export type { ToolMetadata, ToolInvocationResult, ToolDependencyCheck } from './core/MCPToolInterface.js';
export type { AgentMetadata } from './core/AgentRegistry.js';
export type { CheckpointCallback, CheckpointMetadata, CheckpointTriggerResult } from './core/CheckpointDetector.js';

// Enum exports
export { Checkpoint } from './types/Checkpoint.js';
