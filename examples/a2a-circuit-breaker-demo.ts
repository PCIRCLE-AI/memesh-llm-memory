/**
 * A2A Circuit Breaker Demo
 *
 * Demonstrates the circuit breaker pattern in TimeoutChecker.
 * This example shows how the system handles repeated failures and recovers.
 */

import { TimeoutChecker } from '../src/a2a/jobs/TimeoutChecker.js';
import { MCPTaskDelegator } from '../src/a2a/delegator/MCPTaskDelegator.js';
import { TaskQueue } from '../src/a2a/storage/TaskQueue.js';
import { logger } from '../src/utils/logger.js';

// Create a mock delegator that simulates failures
class FailingDelegator extends MCPTaskDelegator {
  private callCount = 0;
  private readonly failureCount: number;

  constructor(taskQueue: TaskQueue, failureCount: number = 5) {
    super(taskQueue, logger);
    this.failureCount = failureCount;
  }

  async checkTimeouts(): Promise<void> {
    this.callCount++;

    if (this.callCount <= this.failureCount) {
      // Simulate failure
      throw new Error(`Simulated failure #${this.callCount}`);
    }

    // After failure count, succeed
    logger.info('[FailingDelegator] Check succeeded', { callCount: this.callCount });
  }

  getCallCount(): number {
    return this.callCount;
  }

}

async function runDemo() {
  console.log('='.repeat(80));
  console.log('A2A Circuit Breaker Demo');
  console.log('='.repeat(80));
  console.log();

  // Create test task queue and failing delegator
  const taskQueue = new TaskQueue('demo-agent');
  const delegator = new FailingDelegator(taskQueue, 5);

  // Create timeout checker with circuit breaker
  const checker = new TimeoutChecker(delegator, {
    intervalMs: 1000,              // Check every 1 second (for demo)
    maxConsecutiveErrors: 5,       // Open circuit after 5 errors
    circuitCooldownMs: 10_000,     // 10 second cooldown (for demo)
    enableAlerting: true,
  });

  console.log('Configuration:');
  console.log('  - Check interval: 1000ms');
  console.log('  - Max consecutive errors: 5');
  console.log('  - Circuit cooldown: 10000ms');
  console.log();

  // Helper to print statistics
  function printStats(label: string) {
    const stats = checker.getStatistics();
    console.log(`[${label}]`);
    console.log(`  Circuit State: ${stats.circuitState}`);
    console.log(`  Consecutive Errors: ${stats.consecutiveErrors}`);
    console.log(`  Total Checks: ${stats.totalChecks}`);
    console.log(`  Total Errors: ${stats.totalErrors}`);
    console.log(`  Error Rate: ${(stats.errorRate * 100).toFixed(2)}%`);
    console.log(`  Delegator Call Count: ${delegator.getCallCount()}`);
    console.log();
  }

  // Start the checker
  checker.start(1000);

  console.log('Phase 1: Triggering failures (0-5 seconds)');
  console.log('-'.repeat(80));

  // Wait for failures to accumulate
  await new Promise((resolve) => setTimeout(resolve, 6000));
  printStats('After 6 seconds (Circuit should be OPEN)');

  console.log('Phase 2: Circuit is OPEN (6-16 seconds)');
  console.log('-'.repeat(80));
  console.log('During this phase, checks are skipped due to open circuit.');
  console.log();

  // Wait during circuit open period
  await new Promise((resolve) => setTimeout(resolve, 6000));
  printStats('After 12 seconds (Still OPEN, in cooldown)');

  console.log('Phase 3: Circuit transitions to HALF_OPEN (after 16 seconds)');
  console.log('-'.repeat(80));
  console.log('After cooldown, the circuit attempts recovery.');
  console.log();

  // Wait for cooldown to complete
  await new Promise((resolve) => setTimeout(resolve, 5000));
  printStats('After 17 seconds (Circuit should be HALF_OPEN or CLOSED)');

  console.log('Phase 4: Recovery successful, circuit CLOSED');
  console.log('-'.repeat(80));

  // Wait a bit more to confirm recovery
  await new Promise((resolve) => setTimeout(resolve, 3000));
  printStats('After 20 seconds (Circuit should be CLOSED)');

  // Stop the checker
  checker.stop();

  console.log('='.repeat(80));
  console.log('Demo Complete');
  console.log('='.repeat(80));
  console.log();

  console.log('Summary:');
  console.log('  1. Circuit started in CLOSED state');
  console.log('  2. After 5 consecutive errors, circuit opened');
  console.log('  3. During cooldown period, checks were skipped');
  console.log('  4. After cooldown, circuit transitioned to HALF_OPEN');
  console.log('  5. First successful check closed the circuit');
  console.log('  6. System recovered and returned to normal operation');
  console.log();

  // Cleanup
  taskQueue.close();

  console.log('✅ Circuit breaker pattern demonstrated successfully!');
}

// Run the demo
runDemo().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
