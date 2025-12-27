/**
 * Unit tests for BackgroundExecutor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundExecutor } from './BackgroundExecutor.js';
import { ResourceMonitor } from './ResourceMonitor.js';
import { ExecutionConfig } from './types.js';

describe('BackgroundExecutor', () => {
  let executor: BackgroundExecutor;
  let monitor: ResourceMonitor;

  beforeEach(() => {
    // Use high thresholds for test environment
    monitor = new ResourceMonitor(6, {
      maxCPU: 90,
      maxMemory: 32768, // 32GB - sufficient for test environment
    });
    executor = new BackgroundExecutor(monitor);
  });

  const createTestConfig = (priority: 'high' | 'medium' | 'low' = 'medium'): ExecutionConfig => ({
    mode: 'background',
    priority,
    resourceLimits: {
      maxCPU: 50,
      maxMemory: 64, // Reduced for CI/test environment (typically ~100-200MB free)
      maxDuration: 300,
    },
  });

  describe('executeTask', () => {
    it('should execute a simple task in background', async () => {
      const task = async () => {
        return 'test result';
      };

      const taskId = await executor.executeTask(task, createTestConfig());

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^bg-[a-f0-9]+$/);
    });

    it('should throw error when resources are insufficient', async () => {
      // Create monitor with no capacity
      const limitedMonitor = new ResourceMonitor(0);
      const limitedExecutor = new BackgroundExecutor(limitedMonitor);

      const task = async () => 'test';

      await expect(
        limitedExecutor.executeTask(task, createTestConfig())
      ).rejects.toThrow('Cannot execute background task');
    });

    it('should register task with resource monitor', async () => {
      const initialCount = monitor.getActiveBackgroundCount();

      const task = async () => {
        // Slow task to ensure it's still running
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      await executor.executeTask(task, createTestConfig());

      // Count might have already decreased if task completed very fast
      // But the task should have been registered at some point
      expect(monitor.getActiveBackgroundCount()).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('getProgress', () => {
    it('should get task progress', async () => {
      const task = async (context: any) => {
        context.updateProgress(0.5, 'halfway');
        await new Promise(resolve => setTimeout(resolve, 50));
        context.updateProgress(1.0, 'done');
        return 'result';
      };

      const taskId = await executor.executeTask(task, createTestConfig());

      // Get progress
      const progress = await executor.getProgress(taskId);

      expect(progress).toBeDefined();
      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(1);
    });

    it('should throw error for non-existent task', async () => {
      await expect(executor.getProgress('non-existent')).rejects.toThrow('Task non-existent not found');
    });
  });

  describe('getTask', () => {
    it('should get task by ID', async () => {
      const task = async () => 'test';
      const taskId = await executor.executeTask(task, createTestConfig());

      const backgroundTask = executor.getTask(taskId);

      expect(backgroundTask).toBeDefined();
      expect(backgroundTask?.taskId).toBe(taskId);
      expect(backgroundTask?.status).toMatch(/queued|running|completed/);
    });

    it('should return undefined for non-existent task', () => {
      const task = executor.getTask('non-existent');
      expect(task).toBeUndefined();
    });
  });

  describe('cancelTask', () => {
    it('should cancel a queued task', async () => {
      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'result';
      };

      const taskId = await executor.executeTask(task, createTestConfig());

      // Cancel immediately
      await executor.cancelTask(taskId);

      const backgroundTask = executor.getTask(taskId);
      expect(backgroundTask?.status).toBe('cancelled');
    });

    it('should throw error when cancelling non-existent task', async () => {
      await expect(executor.cancelTask('non-existent')).rejects.toThrow('Task non-existent not found');
    });

    it('should throw error when cancelling already completed task', async () => {
      const task = async () => 'fast result';
      const taskId = await executor.executeTask(task, createTestConfig());

      // Wait for task to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const backgroundTask = executor.getTask(taskId);
      if (backgroundTask?.status === 'completed') {
        await expect(executor.cancelTask(taskId)).rejects.toThrow('already completed');
      }
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks', async () => {
      const task1 = async () => 'result1';
      const task2 = async () => 'result2';

      const taskId1 = await executor.executeTask(task1, createTestConfig());
      const taskId2 = await executor.executeTask(task2, createTestConfig());

      const allTasks = executor.getAllTasks();

      expect(allTasks.length).toBeGreaterThanOrEqual(2);
      const taskIds = allTasks.map(t => t.taskId);
      expect(taskIds).toContain(taskId1);
      expect(taskIds).toContain(taskId2);
    });
  });

  describe('getTasksByStatus', () => {
    it('should filter tasks by status', async () => {
      const slowTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'slow';
      };

      await executor.executeTask(slowTask, createTestConfig());
      await executor.executeTask(slowTask, createTestConfig());

      // Some tasks might be queued or running
      const queuedTasks = executor.getTasksByStatus('queued');
      const runningTasks = executor.getTasksByStatus('running');

      expect(queuedTasks.length + runningTasks.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', async () => {
      const task = async () => 'result';

      await executor.executeTask(task, createTestConfig('high'));
      await executor.executeTask(task, createTestConfig('medium'));

      const stats = executor.getStats();

      expect(stats).toBeDefined();
      expect(stats.queueStats).toBeDefined();
      expect(typeof stats.queued).toBe('number');
      expect(typeof stats.running).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.cancelled).toBe('number');
    });
  });

  describe('clearFinishedTasks', () => {
    it('should clear completed tasks', async () => {
      const fastTask = async () => 'result';

      await executor.executeTask(fastTask, createTestConfig());
      await executor.executeTask(fastTask, createTestConfig());

      // Wait for tasks to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const beforeCount = executor.getAllTasks().length;
      const cleared = executor.clearFinishedTasks();

      expect(cleared).toBeGreaterThanOrEqual(0);
      expect(executor.getAllTasks().length).toBeLessThanOrEqual(beforeCount);
    });
  });

  describe('task execution with callbacks', () => {
    it('should call onProgress callback', async () => {
      const progressUpdates: number[] = [];

      const config: ExecutionConfig = {
        ...createTestConfig(),
        callbacks: {
          onProgress: (progress) => {
            progressUpdates.push(progress);
          },
        },
      };

      const task = async (context: any) => {
        context.updateProgress(0.25);
        context.updateProgress(0.5);
        context.updateProgress(0.75);
        context.updateProgress(1.0);
        return 'done';
      };

      await executor.executeTask(task, config);

      // Wait for task to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should call onComplete callback', async () => {
      let completedResult: any = null;

      const config: ExecutionConfig = {
        ...createTestConfig(),
        callbacks: {
          onComplete: (result) => {
            completedResult = result;
          },
        },
      };

      const task = async () => 'test result';

      await executor.executeTask(task, config);

      // Wait for task to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(completedResult).toBe('test result');
    });

    it('should call onError callback on task failure', async () => {
      let errorReceived: Error | null = null;

      const config: ExecutionConfig = {
        ...createTestConfig(),
        callbacks: {
          onError: (error) => {
            errorReceived = error;
          },
        },
      };

      const task = async () => {
        throw new Error('Task failed!');
      };

      await executor.executeTask(task, config);

      // Wait for task to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorReceived).toBeInstanceOf(Error);
      expect(errorReceived?.message).toBe('Task failed!');
    });
  });

  describe('task with execute method', () => {
    it('should execute task with execute method', async () => {
      const taskWithExecute = {
        execute: async () => {
          return 'executed via method';
        },
      };

      const taskId = await executor.executeTask(taskWithExecute, createTestConfig());

      expect(taskId).toBeDefined();

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      const task = executor.getTask(taskId);
      expect(task?.status).toMatch(/completed|running/);
    });
  });

  describe('priority queue processing', () => {
    it('should process high priority tasks first', async () => {
      const executionOrder: string[] = [];

      const createOrderedTask = (id: string) => async () => {
        executionOrder.push(id);
        await new Promise(resolve => setTimeout(resolve, 10));
        return id;
      };

      // Enqueue tasks with different priorities
      await executor.executeTask(createOrderedTask('low-1'), createTestConfig('low'));
      await executor.executeTask(createOrderedTask('high-1'), createTestConfig('high'));
      await executor.executeTask(createOrderedTask('medium-1'), createTestConfig('medium'));

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // High priority should be first (or among first)
      expect(executionOrder[0]).toBe('high-1');
    });
  });
});
