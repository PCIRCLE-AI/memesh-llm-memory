/**
 * Agent Orchestrator 使用範例
 *
 * 展示如何使用 Orchestrator 進行任務分析和成本管理
 */

import { Orchestrator, Task } from './index.js';
import { toDollars, toMicroDollars } from '../utils/money.js';
import { logger } from '../utils/logger.js';

// Money formatting constants
const MICRO_COST_DECIMALS = 6; // Precision for sub-cent costs (micro-dollars)
const BUDGET_DECIMALS = 2; // Standard currency precision
const TEST_COST_DECIMALS = 3; // Precision for test cost examples

async function main() {
  logger.info('🎯 Agent Orchestrator Examples\n');
  logger.info('═'.repeat(60) + '\n');

  const orchestrator = new Orchestrator();

  // ==================== 範例 1: 簡單任務分析 ====================
  logger.info('📋 Example 1: Simple Task Analysis\n');

  const simpleTask: Task = {
    id: 'task-simple',
    description: 'Format this JSON object: {"name":"test","value":123}',
  };

  const simpleAnalysis = await orchestrator.analyzeTask(simpleTask);
  logger.info(`Task: ${simpleTask.description}`);
  logger.info(`Complexity: ${simpleAnalysis.analysis.complexity}`);
  logger.info(`Selected Agent: ${simpleAnalysis.routing.selectedAgent}`);
  logger.info(`Model: ${simpleAnalysis.routing.modelName}`);
  logger.info(`Estimated Cost: $${toDollars(simpleAnalysis.routing.estimatedCost).toFixed(MICRO_COST_DECIMALS)}`);
  logger.info(`Reasoning: ${simpleAnalysis.analysis.reasoning}`);
  logger.info('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 2: 複雜任務分析 ====================
  logger.info('📋 Example 2: Complex Task Analysis\n');

  const complexTask: Task = {
    id: 'task-complex',
    description:
      'Analyze the system architecture of a microservices-based e-commerce platform ' +
      'and provide comprehensive recommendations for improving scalability, security, ' +
      'performance, and maintainability. Include detailed database schema design.',
  };

  const complexAnalysis = await orchestrator.analyzeTask(complexTask);
  logger.info(`Task: ${complexTask.description.substring(0, 80)}...`);
  logger.info(`Complexity: ${complexAnalysis.analysis.complexity}`);
  logger.info(`Selected Agent: ${complexAnalysis.routing.selectedAgent}`);
  logger.info(`Model: ${complexAnalysis.routing.modelName}`);
  logger.info(`Estimated Cost: $${toDollars(complexAnalysis.routing.estimatedCost).toFixed(MICRO_COST_DECIMALS)}`);
  logger.info(`Reasoning: ${complexAnalysis.analysis.reasoning}`);
  logger.info('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 3: 中等任務分析 ====================
  logger.info('📋 Example 3: Medium Task Analysis\n');

  const mediumTask: Task = {
    id: 'task-medium',
    description: 'Create user authentication service',
  };

  const mediumAnalysis = await orchestrator.analyzeTask(mediumTask);
  logger.info(`Task: ${mediumTask.description}`);
  logger.info(`Complexity: ${mediumAnalysis.analysis.complexity}`);
  logger.info(`Selected Agent: ${mediumAnalysis.routing.selectedAgent}`);
  logger.info(`Model: ${mediumAnalysis.routing.modelName}`);
  logger.info(`Estimated Cost: $${toDollars(mediumAnalysis.routing.estimatedCost).toFixed(MICRO_COST_DECIMALS)}`);
  logger.info(`Reasoning: ${mediumAnalysis.analysis.reasoning}`);
  logger.info('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 4: 批次任務分析 ====================
  logger.info('📋 Example 4: Batch Task Analysis\n');

  const batchTasks: Task[] = [
    { id: 'batch-1', description: 'Format JSON' },
    { id: 'batch-2', description: 'Validate email format' },
    { id: 'batch-3', description: 'Write unit test' },
    { id: 'batch-4', description: 'Refactor authentication module' },
    {
      id: 'batch-5',
      description: 'Design comprehensive database schema for multi-tenant SaaS platform',
    },
  ];

  const router = orchestrator.getRouter();
  const batchAnalyses = await router.getAnalyzer().analyzeBatch(batchTasks);
  const batchRoutings = await router.getRouter().routeBatch(batchAnalyses);

  logger.info(`Analyzing ${batchTasks.length} tasks:\n`);

  batchRoutings.forEach((routing, index) => {
    const task = batchTasks[index];
    logger.info(`  ${index + 1}. ${task.description.substring(0, 50)}...`);
    logger.info(`     Agent: ${routing.selectedAgent}`);
    logger.info(`     Cost: $${toDollars(routing.estimatedCost).toFixed(MICRO_COST_DECIMALS)}\n`);
  });

  const totalEstimatedCost = batchRoutings.reduce((sum, r) => sum + r.estimatedCost, 0);
  logger.info(`Total Estimated Cost: $${toDollars(totalEstimatedCost as import('../utils/money.js').MicroDollars).toFixed(MICRO_COST_DECIMALS)}`);
  logger.info('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 5: 系統狀態檢查 ====================
  logger.info('📋 Example 5: System Status Check\n');

  const status = await orchestrator.getSystemStatus();

  logger.info('💻 System Resources:');
  logger.info(`   Total Memory: ${status.resources.totalMemoryMB}MB`);
  logger.info(`   Available Memory: ${status.resources.availableMemoryMB}MB`);
  logger.info(`   Memory Usage: ${status.resources.memoryUsagePercent}%`);
  logger.info(`   CPU Usage: ${status.resources.cpuUsagePercent}%`);

  logger.info('\n💰 Cost Statistics:');
  logger.info(`   Total Tasks: ${status.costStats.taskCount}`);
  logger.info(`   Total Cost: $${toDollars(status.costStats.totalCost).toFixed(MICRO_COST_DECIMALS)}`);
  logger.info(`   Monthly Spend: $${toDollars(status.costStats.monthlySpend).toFixed(MICRO_COST_DECIMALS)}`);
  logger.info(`   Remaining Budget: $${toDollars(status.costStats.remainingBudget).toFixed(BUDGET_DECIMALS)}`);

  logger.info(`\n💡 Recommendation: ${status.recommendation}`);

  logger.info('\n' + '═'.repeat(60) + '\n');

  // ==================== 範例 6: 成本追蹤 ====================
  logger.info('📋 Example 6: Cost Tracking Simulation\n');

  const costTracker = router.getCostTracker();

  // 模擬幾次任務執行
  logger.info('Simulating task executions...\n');

  costTracker.recordCost('sim-1', 'claude-haiku-4-20250514', 1000, 2000);
  logger.info('✅ Task 1: Haiku - 1000 input, 2000 output tokens');

  costTracker.recordCost('sim-2', 'claude-sonnet-4-5-20250929', 5000, 10000);
  logger.info('✅ Task 2: Sonnet - 5000 input, 10000 output tokens');

  costTracker.recordCost('sim-3', 'claude-opus-4-5-20251101', 3000, 8000);
  logger.info('✅ Task 3: Opus - 3000 input, 8000 output tokens');

  logger.info('\n' + costTracker.generateReport());

  logger.info('\n' + '═'.repeat(60) + '\n');

  // ==================== 範例 7: 預算檢查 ====================
  logger.info('📋 Example 7: Budget Check\n');

  const testCosts = [
    { description: 'Small task', cost: 0.001 },
    { description: 'Medium task', cost: 0.05 },
    { description: 'Large task', cost: 1.0 },
    { description: 'Huge task', cost: 10.0 },
  ];

  testCosts.forEach(({ description, cost }) => {
    const costInMicroDollars = toMicroDollars(cost);
    const withinBudget = costTracker.isWithinBudget(costInMicroDollars);
    const icon = withinBudget ? '✅' : '❌';
    logger.info(`${icon} ${description} ($${cost.toFixed(TEST_COST_DECIMALS)}): ${withinBudget ? 'Approved' : 'Blocked'}`);
  });

  logger.info('\n' + '═'.repeat(60) + '\n');
  logger.info('✨ Examples completed!\n');
}

// 執行範例
main().catch((error) => logger.error('Example failed:', error));
