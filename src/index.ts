/**
 * Claude Code Buddy - Main Entry Point
 * Intelligent AI Agent Ecosystem
 */

import { Orchestrator } from './orchestrator/index.js';
import { appConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { AgentRegistry } from './core/AgentRegistry.js';

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

  // Future enhancements tracked in TECH_DEBT.md:
  // - API Server implementation
  // - Monitoring dashboard integration

  return orchestrator;
}

// Run
main().catch((error) => {
  logger.error('Failed to start Claude Code Buddy:', error);
  process.exit(1);
});

// Module exports
export * from './telemetry';

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
