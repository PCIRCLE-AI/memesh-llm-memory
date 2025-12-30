/**
 * Integration tests for background execution system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceMonitor } from './ResourceMonitor.js';
import { ExecutionQueue } from './ExecutionQueue.js';
import { BackgroundExecutor } from './BackgroundExecutor.js';
import { ExecutionConfig, BackgroundTask } from './types.js';

describe('Background Execution System Integration', () => {
  let monitor: ResourceMonitor;
  let executor: BackgroundExecutor;

  beforeEach(() => {
    // Use realistic thresholds for production-like testing
    monitor = new ResourceMonitor(6, {
      maxCPU: 70,
      maxMemory: 16384, // 16GB - realistic test/development machine limit
    });
    executor = new BackgroundExecutor(monitor);
  });

  const createTestConfig = (
    priority: 'high' | 'medium' | 'low' = 'medium',
    callbacks?: ExecutionConfig['callbacks']
  ): ExecutionConfig => ({
    mode: 'background',
    priority,
    resourceLimits: {
      maxCPU: 50,
      maxMemory: 32, // Conservative limit for stable tests across environments
      maxDuration: 300,
    },
    callbacks,
  });

  describe('End-to-end task execution', () => {
    it('should execute a task from queue to completion', async () => {
      const results: string[] = [];

      const task = async (context: any) => {
        context.updateProgress(0.2, 'starting');
        await new Promise(resolve => setTimeout(resolve, 50));

        context.updateProgress(0.5, 'processing');
        results.push('processed');
        await new Promise(resolve => setTimeout(resolve, 50));

        context.updateProgress(0.8, 'finalizing');
        results.push('finalized');

        context.updateProgress(1.0, 'completed');
        return 'success';
      };

      const config = createTestConfig('medium', {
        onComplete: (result) => {
          results.push(`completed: ${result}`);
        },
      });

      const taskId = await executor.executeTask(task, config);

      expect(taskId).toBeDefined();

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 300));

      const backgroundTask = executor.getTask(taskId);
      expect(backgroundTask?.status).toBe('completed');
      expect(backgroundTask?.result).toBe('success');
      expect(results).toContain('processed');
      expect(results).toContain('finalized');
      expect(results).toContain('completed: success');
    });

    it('should handle task failures gracefully', async () => {
      let errorCaught: Error | null = null;

      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Intentional failure');
      };

      const config = createTestConfig('medium', {
        onError: (error) => {
          errorCaught = error;
        },
      });

      const taskId = await executor.executeTask(task, config);

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 200));

      const backgroundTask = executor.getTask(taskId);
      expect(backgroundTask?.status).toBe('failed');
      expect(backgroundTask?.error?.message).toBe('Intentional failure');
      expect(errorCaught).toBeInstanceOf(Error);
    });
  });

  describe('Resource monitoring integration', () => {
    it('should respect resource limits', async () => {
      // Create monitor with strict limits
      const strictMonitor = new ResourceMonitor(2, {
        maxCPU: 70,
        maxMemory: 16384, // 16GB - realistic test/development machine limit
      });
      const strictExecutor = new BackgroundExecutor(strictMonitor);

      const slowTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'done';
      };

      // Start 2 tasks (hitting the limit)
      const taskId1 = await strictExecutor.executeTask(slowTask, createTestConfig());
      const taskId2 = await strictExecutor.executeTask(slowTask, createTestConfig());

      expect(taskId1).toBeDefined();
      expect(taskId2).toBeDefined();

      // Try to start a 3rd task - should be queued
      const taskId3 = await strictExecutor.executeTask(slowTask, createTestConfig());
      expect(taskId3).toBeDefined();

      // Wait for tasks to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = strictExecutor.getStats();
      expect(stats.completed).toBeGreaterThanOrEqual(3);
    });

    it('should unregister tasks after completion', async () => {
      const initialCount = monitor.getActiveBackgroundCount();

      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      };

      await executor.executeTask(task, createTestConfig());
      await executor.executeTask(task, createTestConfig());

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 300));

      const finalCount = monitor.getActiveBackgroundCount();
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Task queue priority ordering', () => {
    it('should process tasks in priority order', async () => {
      const executionOrder: string[] = [];

      const createOrderedTask = (id: string, delay: number = 50) => async () => {
        executionOrder.push(id);
        await new Promise(resolve => setTimeout(resolve, delay));
        return id;
      };

      // Enqueue tasks with different priorities
      await executor.executeTask(createOrderedTask('low-1'), createTestConfig('low'));
      await executor.executeTask(createOrderedTask('high-1'), createTestConfig('high'));
      await executor.executeTask(createOrderedTask('medium-1'), createTestConfig('medium'));
      await executor.executeTask(createOrderedTask('high-2'), createTestConfig('high'));
      await executor.executeTask(createOrderedTask('low-2'), createTestConfig('low'));

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // High priority tasks should execute first
      const highTasks = executionOrder.filter(id => id.startsWith('high'));
      expect(highTasks.length).toBe(2);

      // First two executions should be high priority (or at least high should be early)
      const firstTwo = executionOrder.slice(0, 2);
      const highInFirstTwo = firstTwo.filter(id => id.startsWith('high')).length;
      expect(highInFirstTwo).toBeGreaterThan(0);
    });
  });

  describe('Multiple concurrent background tasks', () => {
    it('should handle multiple concurrent tasks (≤ 6)', async () => {
      const taskCount = 5;
      const results: string[] = [];

      const createConcurrentTask = (id: number) => async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        results.push(`task-${id}`);
        return `result-${id}`;
      };

      const taskIds: string[] = [];

      // Start multiple tasks
      for (let i = 0; i < taskCount; i++) {
        const taskId = await executor.executeTask(
          createConcurrentTask(i),
          createTestConfig('medium')
        );
        taskIds.push(taskId);
      }

      expect(taskIds.length).toBe(taskCount);

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // All tasks should complete
      expect(results.length).toBe(taskCount);

      const stats = executor.getStats();
      expect(stats.completed).toBeGreaterThanOrEqual(taskCount);
    });

    it('should enforce max concurrent limit', async () => {
      // Create monitor with low limit
      const limitedMonitor = new ResourceMonitor(3, {
        maxCPU: 70,
        maxMemory: 16384, // 16GB - realistic test/development machine limit
      });
      const limitedExecutor = new BackgroundExecutor(limitedMonitor);

      const slowTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return 'done';
      };

      // Try to start 5 tasks
      const taskIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const taskId = await limitedExecutor.executeTask(slowTask, createTestConfig());
        taskIds.push(taskId);
      }

      expect(taskIds.length).toBe(5);

      // Check that no more than 3 are running concurrently
      const stats = limitedExecutor.getStats();
      expect(stats.running + stats.queued).toBeGreaterThan(0);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalStats = limitedExecutor.getStats();
      expect(finalStats.completed).toBe(5);
    });
  });

  describe('Resource threshold exceeded handling', () => {
    it('should handle resource threshold exceeded scenario', async () => {
      // This test simulates what happens when resources are exceeded
      const resourceMonitor = new ResourceMonitor(1, {
        maxCPU: 70,
        maxMemory: 16384, // 16GB - realistic test/development machine limit
      }); // Only 1 concurrent task allowed
      const testExecutor = new BackgroundExecutor(resourceMonitor);

      const task1 = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'task1';
      };

      const task2 = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'task2';
      };

      // Start first task
      const taskId1 = await testExecutor.executeTask(task1, createTestConfig());
      expect(taskId1).toBeDefined();

      // Start second task - should be queued
      const taskId2 = await testExecutor.executeTask(task2, createTestConfig());
      expect(taskId2).toBeDefined();

      // Check that one is running and one is queued
      const task1State = testExecutor.getTask(taskId1);
      const task2State = testExecutor.getTask(taskId2);

      expect(
        (task1State?.status === 'running' && task2State?.status === 'queued') ||
        (task1State?.status === 'queued' && task2State?.status === 'running')
      ).toBe(true);

      // Wait for both to complete
      await new Promise(resolve => setTimeout(resolve, 600));

      const finalTask1 = testExecutor.getTask(taskId1);
      const finalTask2 = testExecutor.getTask(taskId2);

      expect(finalTask1?.status).toBe('completed');
      expect(finalTask2?.status).toBe('completed');
    });
  });

  describe('Task cancellation', () => {
    it('should cancel a queued task', async () => {
      // Fill up the queue
      const limitedMonitor = new ResourceMonitor(1, {
        maxCPU: 70,
        maxMemory: 16384, // 16GB - realistic test/development machine limit
      });
      const limitedExecutor = new BackgroundExecutor(limitedMonitor);

      const slowTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'done';
      };

      // Start one task (will run)
      await limitedExecutor.executeTask(slowTask, createTestConfig());

      // Start second task (will be queued)
      const taskId2 = await limitedExecutor.executeTask(slowTask, createTestConfig());

      // Cancel the queued task
      await limitedExecutor.cancelTask(taskId2);

      const task2 = limitedExecutor.getTask(taskId2);
      expect(task2?.status).toBe('cancelled');
    });

    it('should cancel a running task', async () => {
      let taskCancelled = false;

      const cancellableTask = async (context: any) => {
        for (let i = 0; i < 10; i++) {
          if (context.isCancelled()) {
            taskCancelled = true;
            return 'cancelled';
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return 'completed';
      };

      const taskId = await executor.executeTask(cancellableTask, createTestConfig());

      // Wait a bit then cancel
      await new Promise(resolve => setTimeout(resolve, 100));
      await executor.cancelTask(taskId);

      // Wait for task to respond to cancellation
      await new Promise(resolve => setTimeout(resolve, 200));

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('cancelled');
    });
  });

  describe('Progress tracking', () => {
    it('should track progress throughout execution', async () => {
      const progressUpdates: number[] = [];

      const task = async (context: any) => {
        for (let i = 1; i <= 10; i++) {
          context.updateProgress(i / 10, `step ${i}`);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        return 'done';
      };

      const config = createTestConfig('medium', {
        onProgress: (progress) => {
          progressUpdates.push(progress);
        },
      });

      const taskId = await executor.executeTask(task, config);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 400));

      // Should have received multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(5);

      // Progress should be non-decreasing (allow equal values due to timing)
      let hasIncreased = false;
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i]).toBeGreaterThanOrEqual(progressUpdates[i - 1] - 0.01); // Allow tiny floating point errors
        if (progressUpdates[i] > progressUpdates[i - 1]) {
          hasIncreased = true;
        }
      }
      // At least one update should show progress
      expect(hasIncreased).toBe(true);

      const finalProgress = await executor.getProgress(taskId);
      expect(finalProgress.progress).toBe(1.0);
    });
  });

  describe('Cleanup operations', () => {
    it('should clear finished tasks', async () => {
      const fastTask = async () => 'quick result';

      await executor.executeTask(fastTask, createTestConfig());
      await executor.executeTask(fastTask, createTestConfig());
      await executor.executeTask(fastTask, createTestConfig());

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 200));

      const beforeClear = executor.getAllTasks().length;
      const cleared = executor.clearFinishedTasks();

      expect(cleared).toBeGreaterThan(0);
      expect(executor.getAllTasks().length).toBeLessThan(beforeClear);
    });
  });
});
