import { Orchestrator } from './orchestrator/index.js';
import { appConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { AgentRegistry } from './core/AgentRegistry.js';
async function main() {
    logger.info('🤖 Claude Code Buddy starting...');
    logger.info(`Mode: ${appConfig.orchestrator.mode}`);
    logger.info(`Claude Model: ${appConfig.claude.models.sonnet}`);
    const orchestrator = new Orchestrator();
    logger.info('✅ Orchestrator initialized');
    const status = await orchestrator.getSystemStatus();
    logger.info(`💻 System Resources: ${status.resources.availableMemoryMB}MB available (${status.resources.memoryUsagePercent}% used)`);
    logger.info(`💰 Monthly Spend: $${status.costStats.monthlySpend.toFixed(4)} ($${status.costStats.remainingBudget.toFixed(2)} remaining)`);
    logger.info(`📊 ${status.recommendation}`);
    const registry = new AgentRegistry();
    const realAgents = registry.getRealImplementations();
    const enhancedAgents = registry.getEnhancedPrompts();
    const optionalAgents = registry.getOptionalAgents();
    logger.info('\n✅ Claude Code Buddy ready!');
    logger.info('\n📋 Available Agents:');
    logger.info(`\n  Real Implementation Agents (${realAgents.length}):`);
    realAgents.forEach(agent => {
        logger.info(`   - ${agent.name}: ${agent.description}`);
    });
    logger.info(`\n  Enhanced Prompt Agents (${enhancedAgents.length}):`);
    enhancedAgents.forEach(agent => {
        logger.info(`   - ${agent.name}: ${agent.description}`);
    });
    logger.info(`\n  Optional Agents (${optionalAgents.length}):`);
    optionalAgents.forEach(agent => {
        logger.info(`   - ${agent.name}: ${agent.description}`);
    });
    logger.info('\n💡 Use Orchestrator to route tasks intelligently\n');
    return orchestrator;
}
main().catch((error) => {
    logger.error('Failed to start Claude Code Buddy:', error);
    process.exit(1);
});
export * from './telemetry';
export { AgentRegistry } from './core/AgentRegistry.js';
export { MCPToolInterface } from './core/MCPToolInterface.js';
export { CheckpointDetector } from './core/CheckpointDetector.js';
export { DevelopmentButler } from './agents/DevelopmentButler.js';
export { TestWriterAgent } from './agents/TestWriterAgent.js';
export { DevOpsEngineerAgent } from './agents/DevOpsEngineerAgent.js';
export { Checkpoint } from './types/Checkpoint.js';
//# sourceMappingURL=index.js.map