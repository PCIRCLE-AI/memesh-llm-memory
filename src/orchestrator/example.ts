/**
 * Agent Orchestrator 使用範例
 *
 * 展示如何使用 Orchestrator 進行任務分析和成本管理
 */

import { Orchestrator, Task } from './index.js';

async function main() {
  console.log('🎯 Agent Orchestrator Examples\n');
  console.log('═'.repeat(60) + '\n');

  const orchestrator = new Orchestrator();

  // ==================== 範例 1: 簡單任務分析 ====================
  console.log('📋 Example 1: Simple Task Analysis\n');

  const simpleTask: Task = {
    id: 'task-simple',
    description: 'Format this JSON object: {"name":"test","value":123}',
  };

  const simpleAnalysis = await orchestrator.analyzeTask(simpleTask);
  console.log(`Task: ${simpleTask.description}`);
  console.log(`Complexity: ${simpleAnalysis.analysis.complexity}`);
  console.log(`Selected Agent: ${simpleAnalysis.routing.selectedAgent}`);
  console.log(`Model: ${simpleAnalysis.routing.modelName}`);
  console.log(`Estimated Cost: $${simpleAnalysis.routing.estimatedCost.toFixed(6)}`);
  console.log(`Reasoning: ${simpleAnalysis.analysis.reasoning}`);
  console.log('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 2: 複雜任務分析 ====================
  console.log('📋 Example 2: Complex Task Analysis\n');

  const complexTask: Task = {
    id: 'task-complex',
    description:
      'Analyze the system architecture of a microservices-based e-commerce platform ' +
      'and provide comprehensive recommendations for improving scalability, security, ' +
      'performance, and maintainability. Include detailed database schema design.',
  };

  const complexAnalysis = await orchestrator.analyzeTask(complexTask);
  console.log(`Task: ${complexTask.description.substring(0, 80)}...`);
  console.log(`Complexity: ${complexAnalysis.analysis.complexity}`);
  console.log(`Selected Agent: ${complexAnalysis.routing.selectedAgent}`);
  console.log(`Model: ${complexAnalysis.routing.modelName}`);
  console.log(`Estimated Cost: $${complexAnalysis.routing.estimatedCost.toFixed(6)}`);
  console.log(`Reasoning: ${complexAnalysis.analysis.reasoning}`);
  console.log('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 3: 中等任務分析 ====================
  console.log('📋 Example 3: Medium Task Analysis\n');

  const mediumTask: Task = {
    id: 'task-medium',
    description: 'Create user authentication service',
  };

  const mediumAnalysis = await orchestrator.analyzeTask(mediumTask);
  console.log(`Task: ${mediumTask.description}`);
  console.log(`Complexity: ${mediumAnalysis.analysis.complexity}`);
  console.log(`Selected Agent: ${mediumAnalysis.routing.selectedAgent}`);
  console.log(`Model: ${mediumAnalysis.routing.modelName}`);
  console.log(`Estimated Cost: $${mediumAnalysis.routing.estimatedCost.toFixed(6)}`);
  console.log(`Reasoning: ${mediumAnalysis.analysis.reasoning}`);
  console.log('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 4: 批次任務分析 ====================
  console.log('📋 Example 4: Batch Task Analysis\n');

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

  console.log(`Analyzing ${batchTasks.length} tasks:\n`);

  batchRoutings.forEach((routing, index) => {
    const task = batchTasks[index];
    console.log(`  ${index + 1}. ${task.description.substring(0, 50)}...`);
    console.log(`     Agent: ${routing.selectedAgent}`);
    console.log(`     Cost: $${routing.estimatedCost.toFixed(6)}\n`);
  });

  const totalEstimatedCost = batchRoutings.reduce((sum, r) => sum + r.estimatedCost, 0);
  console.log(`Total Estimated Cost: $${totalEstimatedCost.toFixed(6)}`);
  console.log('\n' + '─'.repeat(60) + '\n');

  // ==================== 範例 5: 系統狀態檢查 ====================
  console.log('📋 Example 5: System Status Check\n');

  const status = await orchestrator.getSystemStatus();

  console.log('💻 System Resources:');
  console.log(`   Total Memory: ${status.resources.totalMemoryMB}MB`);
  console.log(`   Available Memory: ${status.resources.availableMemoryMB}MB`);
  console.log(`   Memory Usage: ${status.resources.memoryUsagePercent}%`);
  console.log(`   CPU Usage: ${status.resources.cpuUsagePercent}%`);

  console.log('\n💰 Cost Statistics:');
  console.log(`   Total Tasks: ${status.costStats.taskCount}`);
  console.log(`   Total Cost: $${status.costStats.totalCost.toFixed(6)}`);
  console.log(`   Monthly Spend: $${status.costStats.monthlySpend.toFixed(6)}`);
  console.log(`   Remaining Budget: $${status.costStats.remainingBudget.toFixed(2)}`);

  console.log(`\n💡 Recommendation: ${status.recommendation}`);

  console.log('\n' + '═'.repeat(60) + '\n');

  // ==================== 範例 6: 成本追蹤 ====================
  console.log('📋 Example 6: Cost Tracking Simulation\n');

  const costTracker = router.getCostTracker();

  // 模擬幾次任務執行
  console.log('Simulating task executions...\n');

  costTracker.recordCost('sim-1', 'claude-haiku-4-20250514', 1000, 2000);
  console.log('✅ Task 1: Haiku - 1000 input, 2000 output tokens');

  costTracker.recordCost('sim-2', 'claude-sonnet-4-5-20250929', 5000, 10000);
  console.log('✅ Task 2: Sonnet - 5000 input, 10000 output tokens');

  costTracker.recordCost('sim-3', 'claude-opus-4-5-20251101', 3000, 8000);
  console.log('✅ Task 3: Opus - 3000 input, 8000 output tokens');

  console.log('\n' + costTracker.generateReport());

  console.log('\n' + '═'.repeat(60) + '\n');

  // ==================== 範例 7: 預算檢查 ====================
  console.log('📋 Example 7: Budget Check\n');

  const testCosts = [
    { description: 'Small task', cost: 0.001 },
    { description: 'Medium task', cost: 0.05 },
    { description: 'Large task', cost: 1.0 },
    { description: 'Huge task', cost: 10.0 },
  ];

  testCosts.forEach(({ description, cost }) => {
    const withinBudget = costTracker.isWithinBudget(cost);
    const icon = withinBudget ? '✅' : '❌';
    console.log(`${icon} ${description} ($${cost.toFixed(3)}): ${withinBudget ? 'Approved' : 'Blocked'}`);
  });

  console.log('\n' + '═'.repeat(60) + '\n');
  console.log('✨ Examples completed!\n');
}

// 執行範例
main().catch(console.error);
