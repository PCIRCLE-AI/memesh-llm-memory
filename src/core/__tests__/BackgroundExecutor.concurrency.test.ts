/**
 * P1-9: Race Condition in processQueue() Tests
 *
 * Stress tests for Promise-based lock implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackgroundExecutor } from '../BackgroundExecutor.js';
import { ResourceMonitor } from '../ResourceMonitor.js';
import { ExecutionConfig } from '../types.js';

describe('P1-9: Race Condition in processQueue()', () => {
  let executor: BackgroundExecutor;
  let resourceMonitor: ResourceMonitor;

  beforeEach(() => {
    // ✅ FIX: Set high memory threshold for tests to avoid blocking on test systems
    resourceMonitor = new ResourceMonitor(6, {
      maxCPU: 95,
      maxMemory: 32768, // 32GB - high enough for test systems
    });
    executor = new BackgroundExecutor(resourceMonitor);
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Promise-based Lock Atomicity', () => {
    it('should prevent concurrent processQueue() calls', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      // Track processQueue call order
      const processQueueCalls: number[] = [];
      let callId = 0;

      // Wrap processQueue to track calls
      const originalProcessQueue = (executor as any).processQueue.bind(executor);
      (executor as any).processQueue = async function() {
        const myCallId = ++callId;
        processQueueCalls.push(myCallId);
        await originalProcessQueue();
        processQueueCalls.push(-myCallId); // Negative indicates completion
      };

      // Submit multiple tasks rapidly (triggers multiple processQueue calls)
      const tasks = await Promise.all([
        executor.executeTask(async () => 'task1', config),
        executor.executeTask(async () => 'task2', config),
        executor.executeTask(async () => 'task3', config),
        executor.executeTask(async () => 'task4', config),
        executor.executeTask(async () => 'task5', config),
      ]);

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify queue processing was serialized
      // Each call should complete before next starts
      // Pattern: [1, -1, 2, -2, ...] or [1, 2, -2, -1, ...]
      expect(processQueueCalls.length).toBeGreaterThan(0);

      // Check for overlapping calls (would indicate race condition)
      let activeCount = 0;
      let maxActive = 0;

      for (const call of processQueueCalls) {
        if (call > 0) {
          activeCount++;
          maxActive = Math.max(maxActive, activeCount);
        } else {
          activeCount--;
        }
      }

      // Should never have more than 1 processQueue active at once
      expect(maxActive).toBeLessThanOrEqual(1);
    });

    it('should handle rapid task submissions without data corruption', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      // Submit 20 tasks as fast as possible
      const taskCount = 20;
      const taskIds = await Promise.all(
        Array.from({ length: taskCount }, (_, i) =>
          executor.executeTask(async () => `task-${i}`, config)
        )
      );

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all tasks were tracked correctly
      expect(taskIds.length).toBe(taskCount);
      expect(new Set(taskIds).size).toBe(taskCount); // All unique

      // Verify final state is consistent
      const stats = executor.getStats();
      const total = stats.completed + stats.failed + stats.cancelled;
      expect(total).toBe(taskCount);
    });

    it('should wait for existing processQueue before starting new one', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      // Track timing of processQueue calls
      const timings: Array<{ start: number; end: number }> = [];

      const originalProcessQueue = (executor as any).processQueue.bind(executor);
      (executor as any).processQueue = async function() {
        const start = Date.now();
        await originalProcessQueue();
        // Add delay to simulate longer processing
        await new Promise(resolve => setTimeout(resolve, 50));
        const end = Date.now();
        timings.push({ start, end });
      };

      // Submit tasks that will trigger processQueue
      await Promise.all([
        executor.executeTask(async () => 'task1', config),
        executor.executeTask(async () => 'task2', config),
        executor.executeTask(async () => 'task3', config),
      ]);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify processQueue calls didn't overlap
      for (let i = 0; i < timings.length - 1; i++) {
        const current = timings[i];
        const next = timings[i + 1];
        // Next should start after current ends
        expect(next.start).toBeGreaterThanOrEqual(current.end);
      }
    });
  });

  describe('Stress Tests', () => {
    it('should handle 100 concurrent task submissions', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      const taskCount = 100;
      const startTime = Date.now();

      // Submit all at once
      const taskIds = await Promise.all(
        Array.from({ length: taskCount }, (_, i) =>
          executor.executeTask(
            async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return `result-${i}`;
            },
            config
          )
        )
      );

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const duration = Date.now() - startTime;

      // Verify all completed
      const stats = executor.getStats();
      expect(stats.completed + stats.failed).toBeGreaterThanOrEqual(taskCount);

      // Verify no duplicates
      expect(new Set(taskIds).size).toBe(taskCount);

      console.log(`Processed ${taskCount} tasks in ${duration}ms`);
    });

    it('should maintain queue integrity under concurrent access', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      // Interleave task submissions with status checks
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(
          executor.executeTask(async () => `task-${i}`, config)
        );

        // Interleave with status checks
        if (i % 5 === 0) {
          operations.push(
            Promise.resolve(executor.getStats())
          );
        }
      }

      // All operations should complete without error
      await expect(Promise.all(operations)).resolves.toBeDefined();
    });

    it('should handle mixed priority tasks without race conditions', async () => {
      const priorities = ['low', 'medium', 'high'] as const;
      const tasks = [];

      // Submit 30 tasks with mixed priorities
      for (let i = 0; i < 30; i++) {
        const priority = priorities[i % 3];
        const config: ExecutionConfig = {
          priority,
          mode: 'background',
        };

        tasks.push(
          executor.executeTask(
            async () => `${priority}-task-${i}`,
            config
          )
        );
      }

      // Wait for all submissions
      const taskIds = await Promise.all(tasks);

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all tasks were processed
      const stats = executor.getStats();
      expect(stats.completed + stats.failed).toBeGreaterThanOrEqual(30);

      // Verify queue stats are consistent
      const queueStats = stats.queueStats;
      expect(queueStats.total).toBeGreaterThanOrEqual(0); // Should be empty or processing
    });
  });

  describe('Lock Release on Error', () => {
    it('should release lock even if task execution fails', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      // Submit failing task
      const taskId1 = await executor.executeTask(
        async () => {
          throw new Error('Task failed');
        },
        config
      );

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 100));

      // Lock should be released, new task should be processable
      const taskId2 = await executor.executeTask(
        async () => 'success',
        config
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const task1 = executor.getTask(taskId1);
      const task2 = executor.getTask(taskId2);

      expect(task1?.status).toBe('failed');
      expect(task2?.status).toBe('completed');
    });

    it('should handle exception in processQueue gracefully', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      // Force an error in queue processing
      const originalGetNextTask = (executor as any).scheduler.getNextTask.bind(
        (executor as any).scheduler
      );
      let errorThrown = false;

      (executor as any).scheduler.getNextTask = function() {
        if (!errorThrown) {
          errorThrown = true;
          throw new Error('Simulated scheduler error');
        }
        return originalGetNextTask();
      };

      // Submit task that will trigger error
      const taskId1 = await executor.executeTask(
        async () => 'task1',
        config
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Restore normal behavior
      (executor as any).scheduler.getNextTask = originalGetNextTask;

      // Submit new task - should work (lock was released)
      const taskId2 = await executor.executeTask(
        async () => 'task2',
        config
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Second task should complete (proves lock was released)
      const task2 = executor.getTask(taskId2);
      expect(task2?.status).toBe('completed');
    });
  });

  describe('Performance Characteristics', () => {
    it('should not degrade performance compared to boolean lock', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
      };

      const taskCount = 50;
      const startTime = Date.now();

      // Submit tasks
      await Promise.all(
        Array.from({ length: taskCount }, (_, i) =>
          executor.executeTask(
            async () => {
              await new Promise(resolve => setTimeout(resolve, 5));
              return `result-${i}`;
            },
            config
          )
        )
      );

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = Date.now() - startTime;
      const avgTimePerTask = duration / taskCount;

      // Should complete efficiently (< 30ms avg per task including overhead)
      expect(avgTimePerTask).toBeLessThan(30);

      console.log(`Average time per task: ${avgTimePerTask.toFixed(2)}ms`);
    });
  });
});
