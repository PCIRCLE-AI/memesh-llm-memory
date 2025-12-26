/**
 * Smart Agents - Main Entry Point
 * Intelligent AI Agent Ecosystem
 */

import { Orchestrator } from './orchestrator/index.js';
import { appConfig } from './config/index.js';
import { logger } from './utils/logger.js';

async function main() {
  logger.info('🤖 Smart Agents starting...');
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

  logger.info('\n✅ Smart Agents ready!');
  logger.info('\n📋 Available Agents:');
  logger.info('   - Voice AI (Whisper STT + TTS)');
  logger.info('   - RAG Agent (ChromaDB + Semantic Search)');
  logger.info('   - Code Agent (Code generation and review)');
  logger.info('   - Research Agent (Web search and analysis)');
  logger.info('\n💡 Use Orchestrator to route tasks intelligently\n');

  // Future enhancements tracked in TECH_DEBT.md:
  // - API Server implementation
  // - Monitoring dashboard integration

  return orchestrator;
}

// Run
main().catch((error) => {
  logger.error('Failed to start Smart Agents:', error);
  process.exit(1);
});

// Module exports
export * from './telemetry';
