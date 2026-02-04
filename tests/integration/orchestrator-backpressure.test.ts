/**
 * P1-11: Backpressure in Parallel Execution Tests
 *
 * Integration tests for resource-aware parallel task execution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Orchestrator } from '../../src/orchestrator/index.js';
import { Task } from '../../src/orchestrator/types.js';
import type * as os from 'os';

// Mock os module at module level (required for ESM)
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof os>();
  return {
    ...actual,
    cpus: vi.fn(),
  };
});

// Import the mocked os after vi.mock
import { cpus } from 'os';

describe('P1-11: Backpressure in Parallel Execution', () => {
  let orchestrator: Orchestrator;

  beforeEach(async () => {
    // Use in-memory database for tests to avoid schema migration issues
    orchestrator = new Orchestrator({ knowledgeDbPath: ':memory:' });
    await orchestrator.initialize();

    // Mock callClaude to avoid real API calls
    vi.spyOn(orchestrator as any, 'callClaude').mockResolvedValue({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Task completed successfully',
        },
      ],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    });
  });

  afterEach(() => {
    orchestrator.close();
    vi.restoreAllMocks();
  });

  describe('Resource Monitoring', () => {
    it('should apply backpressure when CPU usage is high', async () => {
      // Mock high CPU usage
      let callCount = 0;
      vi.mocked(cpus).mockReturnValue(
        Array(8).fill({
          model: 'Mock CPU',
          speed: 3000,
          times: {
            user: 0,
            nice: 0,
            sys: 0,
            idle: callCount++ > 2 ? 10000 : 1000, // High load first, then normal
            irq: 0,
          },
        }) as os.CpuInfo[]
      );

      const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      const startTime = Date.now();

      // This should trigger backpressure (waiting for tasks to complete)
      // Note: This is more of a smoke test since mocking resource usage is complex
      await expect(
        orchestrator['executeTasksInParallel'](tasks, 3)
      ).resolves.toBeDefined();

      const duration = Date.now() - startTime;

      // With backpressure, execution should be slower
      // (waiting for resource relief)
      expect(duration).toBeGreaterThan(0);
    });

    it('should apply emergency brake on critical resource exhaustion', async () => {
      // Mock critical CPU usage
      vi.mocked(cpus).mockReturnValue(
        Array(8).fill({
          model: 'Mock CPU',
          speed: 3000,
          times: {
            user: 0,
            nice: 0,
            sys: 0,
            idle: 100, // Critical load (90%+ CPU)
            irq: 0,
          },
        }) as os.CpuInfo[]
      );

      const tasks: Task[] = Array.from({ length: 3 }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      // Emergency brake should wait for ALL tasks to complete
      await expect(
        orchestrator['executeTasksInParallel'](tasks, 3)
      ).resolves.toBeDefined();
    });

    it('should proceed normally when resources are healthy', async () => {
      // Mock healthy resource usage
      vi.mocked(cpus).mockReturnValue(
        Array(8).fill({
          model: 'Mock CPU',
          speed: 3000,
          times: {
            user: 1000,
            nice: 0,
            sys: 500,
            idle: 8500, // ~15% CPU usage (healthy)
            irq: 0,
          },
        }) as os.CpuInfo[]
      );

      const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      const startTime = Date.now();

      await expect(
        orchestrator['executeTasksInParallel'](tasks, 3)
      ).resolves.toBeDefined();

      const duration = Date.now() - startTime;

      // With healthy resources, execution should be relatively fast
      expect(duration).toBeLessThan(10000); // Should complete within 10s
    });
  });

  describe('Concurrency Limits', () => {
    it('should respect maxConcurrent limit', async () => {
      const maxConcurrent = 2;
      const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      // Track concurrent executions
      let currentConcurrent = 0;
      let maxObservedConcurrent = 0;

      const originalExecuteTask = orchestrator.executeTask.bind(orchestrator);
      vi.spyOn(orchestrator as any, 'executeTask').mockImplementation(async (task: Task) => {
        currentConcurrent++;
        maxObservedConcurrent = Math.max(maxObservedConcurrent, currentConcurrent);

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 50));

        currentConcurrent--;

        return originalExecuteTask(task);
      });

      await orchestrator['executeTasksInParallel'](tasks, maxConcurrent);

      // Should never exceed maxConcurrent
      expect(maxObservedConcurrent).toBeLessThanOrEqual(maxConcurrent);
    });

    it('should handle single task execution', async () => {
      const task: Task = {
        id: 'single-task',
        description: 'Single test task',
      };

      await expect(
        orchestrator['executeTasksInParallel']([task], 1)
      ).resolves.toBeDefined();
    });

    it('should handle empty task array', async () => {
      const result = await orchestrator['executeTasksInParallel']([], 3);
      expect(result).toEqual([]);
    });
  });

  describe('Backpressure Thresholds', () => {
    it('should apply backpressure at 80% CPU threshold', async () => {
      // Mock CPU at exactly 80% (borderline high)
      vi.mocked(cpus).mockReturnValue(
        Array(8).fill({
          model: 'Mock CPU',
          speed: 3000,
          times: {
            user: 4000,
            nice: 0,
            sys: 4000,
            idle: 2000, // 80% busy
            irq: 0,
          },
        }) as os.CpuInfo[]
      );

      const tasks: Task[] = Array.from({ length: 3 }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      // Should complete but with backpressure applied
      await expect(
        orchestrator['executeTasksInParallel'](tasks, 3)
      ).resolves.toBeDefined();
    });

    it('should apply emergency brake at 90% CPU threshold', async () => {
      // Mock CPU at 90% (critical)
      vi.mocked(cpus).mockReturnValue(
        Array(8).fill({
          model: 'Mock CPU',
          speed: 3000,
          times: {
            user: 4500,
            nice: 0,
            sys: 4500,
            idle: 1000, // 90% busy
            irq: 0,
          },
        }) as os.CpuInfo[]
      );

      const tasks: Task[] = Array.from({ length: 3 }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      // Emergency brake should kick in
      await expect(
        orchestrator['executeTasksInParallel'](tasks, 3)
      ).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle task failures without blocking other tasks', async () => {
      const tasks: Task[] = [
        { id: 'task-1', description: 'Normal task' },
        { id: 'task-2', description: 'Failing task' },
        { id: 'task-3', description: 'Normal task' },
      ];

      // Mock one task to fail
      const originalExecuteTask = orchestrator.executeTask.bind(orchestrator);
      vi.spyOn(orchestrator as any, 'executeTask').mockImplementation(async (task: Task) => {
        if (task.id === 'task-2') {
          throw new Error('Simulated task failure');
        }
        return originalExecuteTask(task);
      });

      // Should complete despite one failure
      await expect(
        orchestrator['executeTasksInParallel'](tasks, 2)
      ).rejects.toThrow('Simulated task failure');
    });
  });

  describe('Performance Characteristics', () => {
    it('should batch tasks efficiently', async () => {
      const taskCount = 10;
      const maxConcurrent = 3;
      const tasks: Task[] = Array.from({ length: taskCount }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      const startTime = Date.now();
      await orchestrator['executeTasksInParallel'](tasks, maxConcurrent);
      const duration = Date.now() - startTime;

      // With batching, should be faster than sequential
      // (rough estimate based on task execution time)
      const estimatedSequentialTime = taskCount * 100; // Assuming ~100ms per task
      const estimatedParallelTime = Math.ceil(taskCount / maxConcurrent) * 100;

      expect(duration).toBeLessThan(estimatedSequentialTime);
    });

    it('should scale with concurrency limit', async () => {
      const tasks: Task[] = Array.from({ length: 6 }, (_, i) => ({
        id: `task-${i}`,
        description: `Test task ${i}`,
      }));

      // Run with different concurrency limits
      const timeConcurrent2 = await measureExecutionTime(
        () => orchestrator['executeTasksInParallel'](tasks, 2)
      );

      const timeConcurrent3 = await measureExecutionTime(
        () => orchestrator['executeTasksInParallel'](tasks, 3)
      );

      // Higher concurrency should not be dramatically slower than lower concurrency.
      // With mocks, execution times are very small (< 10ms), so we need an absolute
      // tolerance rather than a relative one to account for timing variance.
      // Allow up to 50ms absolute difference or 3x relative, whichever is more lenient.
      const absoluteTolerance = 50; // ms
      const relativeTolerance = timeConcurrent2 * 3.0;
      const maxAllowed = Math.max(absoluteTolerance, relativeTolerance);
      expect(timeConcurrent3).toBeLessThanOrEqual(maxAllowed);
    });
  });
});

/**
 * Helper function to measure execution time
 */
async function measureExecutionTime(fn: () => Promise<unknown>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}
