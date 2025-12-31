/**
 * Dashboard Demo Script
 *
 * Demonstrates the Terminal UI Dashboard in action with simulated agent tasks
 *
 * Run: npm run demo:dashboard
 */

import { Dashboard } from '../src/ui/Dashboard.js';
import { ResourceMonitor } from '../src/core/ResourceMonitor.js';
import { UIEventBus } from '../src/ui/UIEventBus.js';

/**
 * Simulate task progress updates
 */
async function simulateTaskProgress(
  eventBus: UIEventBus,
  taskId: string,
  agentType: string,
  taskDescription: string,
  duration: number
): Promise<void> {
  const steps = 10;
  const interval = duration / steps;

  for (let i = 1; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    eventBus.emitProgress({
      agentId: taskId,
      agentType,
      taskDescription,
      progress: i / steps,
      currentStage: `Step ${i}/${steps}`,
      startTime: new Date(),
    });
  }
}

/**
 * Main demo function
 */
async function main() {
  console.log('🤖 Claude Code Buddy Terminal UI Dashboard Demo\n');
  console.log('Starting dashboard with simulated agent tasks...\n');

  // Setup core components
  const resourceMonitor = new ResourceMonitor();
  const eventBus = UIEventBus.getInstance();

  // Create and start dashboard
  const dashboard = new Dashboard(resourceMonitor);
  dashboard.start();

  console.log('✓ Dashboard started\n');

  // Wait a moment for dashboard to initialize
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Task 1: Code review (success)
  console.log('📝 Starting Task 1: Code Review');
  const taskId1 = 'demo-task-1';
  await simulateTaskProgress(eventBus, taskId1, 'code-reviewer', 'Reviewing authentication system', 5000);

  // Simulate success
  const attributionManager = dashboard.getAttributionManager();
  attributionManager.recordSuccess([taskId1], 'Code review completed successfully', {
    timeSaved: 15,
    tokensUsed: 5000,
  });

  console.log('✓ Task 1 completed\n');

  // Task 2: Test execution (success)
  console.log('🧪 Starting Task 2: E2E Tests');
  const taskId2 = 'demo-task-2';
  await simulateTaskProgress(eventBus, taskId2, 'test-automator', 'Running E2E test suite', 3000);

  attributionManager.recordSuccess([taskId2], 'All 42 E2E tests passed', {
    timeSaved: 10,
    tokensUsed: 3000,
  });

  console.log('✓ Task 2 completed\n');

  // Task 3: Performance analysis (simulated failure)
  console.log('⚡ Starting Task 3: Performance Analysis');
  const taskId3 = 'demo-task-3';
  await simulateTaskProgress(eventBus, taskId3, 'performance-engineer', 'Analyzing bundle size', 2000);

  const error = new Error('Bundle size exceeded 500KB threshold (actual: 672KB)');
  attributionManager.recordError([taskId3], 'Bundle size analysis failed', error, true);

  console.log('✗ Task 3 failed\n');

  // Task 4: Documentation generation (success)
  console.log('📚 Starting Task 4: Documentation');
  const taskId4 = 'demo-task-4';
  await simulateTaskProgress(eventBus, taskId4, 'technical-writer', 'Generating API documentation', 4000);

  attributionManager.recordSuccess([taskId4], 'API documentation generated', {
    timeSaved: 20,
    tokensUsed: 8000,
  });

  console.log('✓ Task 4 completed\n');

  // Let dashboard run for a moment to show final state
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Generate and display daily report
  console.log('\n' + '='.repeat(60));
  console.log('📊 PRODUCTIVITY REPORT');
  console.log('='.repeat(60) + '\n');

  const metricsStore = dashboard.getMetricsStore();
  const report = await metricsStore.generateDailyReport();
  console.log(report);

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Demo complete! Press Ctrl+C to exit.\n');

  // Stop dashboard
  dashboard.stop();

  // Show GitHub issue suggestion for the error
  console.log('\n💡 GitHub Issue Auto-Suggestion for Task 3 failure:\n');
  const recentAttributions = attributionManager.getRecentAttributions(10);
  const errorAttribution = recentAttributions.find(a => a.type === 'error');

  if (errorAttribution && errorAttribution.metadata?.error) {
    const suggestion = attributionManager.generateIssueSuggestion(
      errorAttribution,
      new Error(errorAttribution.metadata.error.message)
    );

    console.log('Title:', suggestion.title);
    console.log('\nLabels:', suggestion.labels.join(', '));
    console.log('\nBody (first 300 chars):');
    console.log(suggestion.body.substring(0, 300) + '...\n');
  }

  console.log('👋 Goodbye!\n');

  // Force exit after a short delay to allow final output
  setTimeout(() => process.exit(0), 100);
}

// Run demo
main().catch((err) => {
  console.error('❌ Demo failed:', err);
  process.exit(1);
});
