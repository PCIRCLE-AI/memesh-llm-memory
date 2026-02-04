/**
 * A2A Phase 1.0 Performance Benchmark Suite
 *
 * Measures performance of hot paths:
 * - MCPTaskDelegator.getPendingTasks() - O(n) vs O(1) lookup
 * - TimeoutChecker.checkTimeouts() - Iteration optimization
 * - TaskQueue operations - Database query optimization
 *
 * Usage:
 *   tsx benchmarks/a2a-performance.bench.ts
 *
 * @module benchmarks/a2a-performance
 */

import { performance } from 'perf_hooks';
import { MCPTaskDelegator } from '../src/a2a/delegator/MCPTaskDelegator.js';
import { TaskQueue } from '../src/a2a/storage/TaskQueue.js';
import { logger } from '../src/utils/logger.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir, cpus, totalmem } from 'os';
import { join } from 'path';

// Benchmark configuration
const BENCHMARK_CONFIG = {
  // Number of tasks to test with
  taskCounts: [10, 50, 100, 500, 1000],
  // Number of agents
  agentCounts: [1, 5, 10],
  // Iterations per test
  iterations: 100,
  // Warmup iterations
  warmup: 10,
};

interface BenchmarkResult {
  name: string;
  taskCount: number;
  agentCount: number;
  iterations: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  opsPerSec: number;
}

interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Calculate percentiles from sorted array
 */
function calculatePercentiles(sortedValues: number[]): PercentileStats {
  const p50Index = Math.floor(sortedValues.length * 0.5);
  const p95Index = Math.floor(sortedValues.length * 0.95);
  const p99Index = Math.floor(sortedValues.length * 0.99);

  return {
    p50: sortedValues[p50Index],
    p95: sortedValues[p95Index],
    p99: sortedValues[p99Index],
  };
}

/**
 * Run a benchmark function multiple times and collect statistics
 */
async function runBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number,
  warmup: number = 10
): Promise<Omit<BenchmarkResult, 'taskCount' | 'agentCount'>> {
  try {
    // Warmup
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    // Actual benchmark
    const timings: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      timings.push(end - start);
    }

    // Sort for percentile calculation
    const sortedTimings = timings.slice().sort((a, b) => a - b);

    const min = sortedTimings[0];
    const max = sortedTimings[sortedTimings.length - 1];
    const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
    const percentiles = calculatePercentiles(sortedTimings);

    return {
      name,
      iterations,
      min,
      max,
      mean,
      median: percentiles.p50,
      p95: percentiles.p95,
      p99: percentiles.p99,
      opsPerSec: 1000 / mean,
    };
  } catch (error) {
    logger.error(`Benchmark ${name} failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Create test tasks in memory
 */
function createTestTasks(delegator: MCPTaskDelegator, taskCount: number, agentCount: number): void {
  const agentIds = Array.from({ length: agentCount }, (_, i) => `agent-${i}`);

  for (let i = 0; i < taskCount; i++) {
    const agentId = agentIds[i % agentCount];
    const taskId = `task-${i}`;

    // Directly add to pendingTasks (bypass one-task-per-agent limit for benchmarking)
    (delegator as any).pendingTasks.set(taskId, {
      taskId,
      task: `Test task ${i}`,
      priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      agentId,
      createdAt: Date.now() - (i % 100) * 1000, // Some old tasks for timeout testing
      status: 'PENDING',
    });
  }
}

/**
 * Benchmark: MCPTaskDelegator.getPendingTasks()
 */
async function benchmarkGetPendingTasks(
  taskCount: number,
  agentCount: number
): Promise<BenchmarkResult> {
  const tmpDir = join(tmpdir(), `a2a-bench-${Date.now()}`);

  try {
    // Create temporary database
    mkdirSync(tmpDir, { recursive: true });
    const dbPath = join(tmpDir, 'test.db');

    const taskQueue = new TaskQueue('test-agent', dbPath);
    const delegator = new MCPTaskDelegator(taskQueue, logger);

    // Setup: Create test tasks
    createTestTasks(delegator, taskCount, agentCount);

    const targetAgent = 'agent-0';

    // Run benchmark
    const result = await runBenchmark(
      'getPendingTasks',
      async () => {
        await delegator.getPendingTasks(targetAgent);
      },
      BENCHMARK_CONFIG.iterations,
      BENCHMARK_CONFIG.warmup
    );

    // Cleanup
    taskQueue.close();
    rmSync(tmpDir, { recursive: true, force: true });

    return {
      ...result,
      taskCount,
      agentCount,
    };
  } catch (error) {
    // Cleanup on error
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.error('Failed to cleanup benchmark directory', {
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    }

    logger.error('benchmarkGetPendingTasks failed', {
      taskCount,
      agentCount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Benchmark: TimeoutChecker.checkTimeouts()
 */
async function benchmarkCheckTimeouts(
  taskCount: number,
  agentCount: number
): Promise<BenchmarkResult> {
  const tmpDir = join(tmpdir(), `a2a-bench-${Date.now()}`);

  try {
    // Create temporary database
    mkdirSync(tmpDir, { recursive: true });
    const dbPath = join(tmpDir, 'test.db');

    const taskQueue = new TaskQueue('test-agent', dbPath);
    const delegator = new MCPTaskDelegator(taskQueue, logger);

    // Setup: Create test tasks (some old enough to timeout)
    createTestTasks(delegator, taskCount, agentCount);

    // Run benchmark
    const result = await runBenchmark(
      'checkTimeouts',
      async () => {
        await delegator.checkTimeouts();
      },
      BENCHMARK_CONFIG.iterations,
      BENCHMARK_CONFIG.warmup
    );

    // Cleanup
    taskQueue.close();
    rmSync(tmpDir, { recursive: true, force: true });

    return {
      ...result,
      taskCount,
      agentCount,
    };
  } catch (error) {
    // Cleanup on error
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.error('Failed to cleanup benchmark directory', {
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    }

    logger.error('benchmarkCheckTimeouts failed', {
      taskCount,
      agentCount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Benchmark: TaskQueue.createTask()
 */
async function benchmarkCreateTask(taskCount: number): Promise<BenchmarkResult> {
  const tmpDir = join(tmpdir(), `a2a-bench-${Date.now()}`);

  try {
    // Create temporary database
    mkdirSync(tmpDir, { recursive: true });
    const dbPath = join(tmpDir, 'test.db');

    const taskQueue = new TaskQueue('test-agent', dbPath);

    let counter = 0;

    // Run benchmark
    const result = await runBenchmark(
      'createTask',
      () => {
        taskQueue.createTask({
          name: `Task ${counter++}`,
          description: 'Test task',
          priority: 'normal',
        });
      },
      BENCHMARK_CONFIG.iterations,
      BENCHMARK_CONFIG.warmup
    );

    // Cleanup
    taskQueue.close();
    rmSync(tmpDir, { recursive: true, force: true });

    return {
      ...result,
      taskCount,
      agentCount: 1,
    };
  } catch (error) {
    // Cleanup on error
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.error('Failed to cleanup benchmark directory', {
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    }

    logger.error('benchmarkCreateTask failed', {
      taskCount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Benchmark: TaskQueue.listTasks()
 */
async function benchmarkListTasks(taskCount: number): Promise<BenchmarkResult> {
  const tmpDir = join(tmpdir(), `a2a-bench-${Date.now()}`);

  try {
    // Create temporary database
    mkdirSync(tmpDir, { recursive: true });
    const dbPath = join(tmpDir, 'test.db');

    const taskQueue = new TaskQueue('test-agent', dbPath);

    // Setup: Create tasks in database
    for (let i = 0; i < taskCount; i++) {
      taskQueue.createTask({
        name: `Task ${i}`,
        description: 'Test task',
        priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'normal' : 'low',
      });
    }

    // Run benchmark
    const result = await runBenchmark(
      'listTasks',
      () => {
        taskQueue.listTasks({ state: 'SUBMITTED' });
      },
      BENCHMARK_CONFIG.iterations,
      BENCHMARK_CONFIG.warmup
    );

    // Cleanup
    taskQueue.close();
    rmSync(tmpDir, { recursive: true, force: true });

    return {
      ...result,
      taskCount,
      agentCount: 1,
    };
  } catch (error) {
    // Cleanup on error
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.error('Failed to cleanup benchmark directory', {
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    }

    logger.error('benchmarkListTasks failed', {
      taskCount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Format benchmark result as table row
 */
function formatResult(result: BenchmarkResult): string {
  return [
    result.name.padEnd(20),
    result.taskCount.toString().padStart(6),
    result.agentCount.toString().padStart(6),
    result.mean.toFixed(3).padStart(10),
    result.median.toFixed(3).padStart(10),
    result.p95.toFixed(3).padStart(10),
    result.p99.toFixed(3).padStart(10),
    Math.round(result.opsPerSec).toString().padStart(10),
  ].join(' | ');
}

/**
 * Print results table
 */
function printResults(results: BenchmarkResult[]): void {
  console.log('\n='.repeat(110));
  console.log('A2A Phase 1.0 Performance Benchmark Results');
  console.log('='.repeat(110));
  console.log(
    [
      'Benchmark'.padEnd(20),
      'Tasks'.padStart(6),
      'Agents'.padStart(6),
      'Mean (ms)'.padStart(10),
      'Median (ms)'.padStart(10),
      'P95 (ms)'.padStart(10),
      'P99 (ms)'.padStart(10),
      'Ops/sec'.padStart(10),
    ].join(' | ')
  );
  console.log('-'.repeat(110));

  for (const result of results) {
    console.log(formatResult(result));
  }

  console.log('='.repeat(110));
}

/**
 * Main benchmark runner
 */
async function main(): Promise<void> {
  try {
    console.log('Starting A2A Performance Benchmarks...');
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`CPUs: ${cpus().length}`);
    console.log(`Memory: ${Math.round(totalmem() / 1024 / 1024 / 1024)}GB`);
    console.log('');

    const results: BenchmarkResult[] = [];

    // Benchmark 1: getPendingTasks() - varies by task and agent count
    console.log('Benchmarking getPendingTasks()...');
    for (const taskCount of BENCHMARK_CONFIG.taskCounts) {
      for (const agentCount of BENCHMARK_CONFIG.agentCounts) {
        console.log(`  - ${taskCount} tasks, ${agentCount} agents`);
        const result = await benchmarkGetPendingTasks(taskCount, agentCount);
        results.push(result);
      }
    }

    // Benchmark 2: checkTimeouts() - varies by task and agent count
    console.log('\nBenchmarking checkTimeouts()...');
    for (const taskCount of BENCHMARK_CONFIG.taskCounts) {
      for (const agentCount of BENCHMARK_CONFIG.agentCounts) {
        console.log(`  - ${taskCount} tasks, ${agentCount} agents`);
        const result = await benchmarkCheckTimeouts(taskCount, agentCount);
        results.push(result);
      }
    }

    // Benchmark 3: createTask() - single operation
    console.log('\nBenchmarking createTask()...');
    const createResult = await benchmarkCreateTask(1);
    results.push(createResult);

    // Benchmark 4: listTasks() - varies by task count
    console.log('\nBenchmarking listTasks()...');
    for (const taskCount of BENCHMARK_CONFIG.taskCounts) {
      console.log(`  - ${taskCount} tasks`);
      const result = await benchmarkListTasks(taskCount);
      results.push(result);
    }

    // Print results
    printResults(results);

    // Check for performance targets
    console.log('\n=== Performance Target Analysis ===');
    const getPendingResults = results.filter((r) => r.name === 'getPendingTasks');
    const maxP95 = Math.max(...getPendingResults.map((r) => r.p95));
    const targetMet = maxP95 < 10;

    console.log(`getPendingTasks() P95 latency: ${maxP95.toFixed(3)}ms`);
    console.log(`Target (<10ms): ${targetMet ? '✅ PASS' : '❌ FAIL'}`);

    // Save results to file
    const resultsPath = join(process.cwd(), 'benchmarks', 'results.json');
    writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          nodeVersion: process.version,
          platform: `${process.platform} ${process.arch}`,
          results,
          targetMet,
        },
        null,
        2
      )
    );
    console.log(`\nResults saved to: ${resultsPath}`);
  } catch (error) {
    logger.error('Benchmark suite failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// Run benchmarks
main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
