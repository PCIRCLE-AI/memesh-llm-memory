/**
 * P1-13: Timeout Enforcement Tests
 *
 * Comprehensive test suite for task timeout enforcement in BackgroundExecutor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackgroundExecutor } from '../BackgroundExecutor.js';
import { ResourceMonitor } from '../ResourceMonitor.js';
import { ExecutionConfig } from '../types.js';

describe('P1-13: Timeout Enforcement', () => {
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
    vi.clearAllTimers();
  });

  describe('Task Timeout Enforcement', () => {
    it('should timeout long-running task when maxDuration exceeded', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 100, // 100ms timeout
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      // Task that runs for 500ms (will timeout)
      const longTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'completed';
      };

      const taskId = await executor.executeTask(longTask, config);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('failed');
      expect(task?.error?.message).toContain('timed out after 100ms');
    });

    it('should complete task that finishes before timeout', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 200, // 200ms timeout
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      // Task that completes in 50ms (well within timeout)
      const fastTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'success';
      };

      const taskId = await executor.executeTask(fastTask, config);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('completed');
      expect(task?.result).toBe('success');
    });

    it('should propagate timeout through isCancelled()', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 100,
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      let checkCount = 0;
      const cooperativeTask = async ({ isCancelled }: any) => {
        // Check isCancelled periodically
        for (let i = 0; i < 10; i++) {
          if (isCancelled()) {
            checkCount = i;
            return 'cancelled';
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return 'completed';
      };

      const taskId = await executor.executeTask(cooperativeTask, config);

      // Wait for timeout and cooperative cancellation
      await new Promise(resolve => setTimeout(resolve, 200));

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('failed'); // Timeout throws error
      expect(checkCount).toBeGreaterThan(0); // Task checked isCancelled
      expect(checkCount).toBeLessThan(10); // Task didn't complete all iterations
    });

    it('should work without timeout when maxDuration not specified', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxMemoryMB: 512,
          maxCPUPercent: 80,
          // No maxDuration
        },
      };

      // Task that runs for 100ms (no timeout)
      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'completed';
      };

      const taskId = await executor.executeTask(task, config);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150));

      const taskResult = executor.getTask(taskId);
      expect(taskResult?.status).toBe('completed');
      expect(taskResult?.result).toBe('completed');
    });

    it('should clear timeout timer on normal completion', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 1000, // Long timeout
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      // Fast task
      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      };

      const taskId = await executor.executeTask(task, config);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 50));

      const taskResult = executor.getTask(taskId);
      expect(taskResult?.status).toBe('completed');

      // If timeout wasn't cleared, it would fire later
      // Wait longer than task duration but less than timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Task should still be completed (not failed from late timeout)
      const taskFinal = executor.getTask(taskId);
      expect(taskFinal?.status).toBe('completed');
    });
  });

  describe('Timeout with Progress Updates', () => {
    it('should allow progress updates until timeout', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 150,
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      const progressUpdates: number[] = [];
      const taskWithProgress = async ({ updateProgress }: any) => {
        for (let i = 0; i <= 10; i++) {
          updateProgress(i / 10, `step ${i}`);
          progressUpdates.push(i / 10);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return 'completed';
      };

      const taskId = await executor.executeTask(taskWithProgress, config);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      // Progress should have been updated before timeout
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.length).toBeLessThan(11); // Didn't complete all updates

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('failed');
      expect(task?.error?.message).toContain('timed out');
    });
  });

  describe('Timeout with Different Task Types', () => {
    it('should timeout function-based task', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 100,
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      const functionTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return 'done';
      };

      const taskId = await executor.executeTask(functionTask, config);
      await new Promise(resolve => setTimeout(resolve, 150));

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('failed');
    });

    it('should timeout object-based task with execute method', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 100,
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      const objectTask = {
        description: 'Long running task',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 300));
          return 'done';
        },
      };

      const taskId = await executor.executeTask(objectTask, config);
      await new Promise(resolve => setTimeout(resolve, 150));

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('failed');
    });

    it('should complete data-only task immediately (no timeout)', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 10, // Very short timeout
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      const dataTask = {
        description: 'Data task',
        data: { value: 42 },
      };

      const taskId = await executor.executeTask(dataTask, config);
      await new Promise(resolve => setTimeout(resolve, 50));

      const task = executor.getTask(taskId);
      expect(task?.status).toBe('completed');
      expect(task?.result).toEqual(dataTask);
    });
  });

  describe('Timeout Error Messages', () => {
    it('should provide helpful timeout error message', async () => {
      const config: ExecutionConfig = {
        priority: 'medium',
        mode: 'background',
        resourceLimits: {
          maxDuration: 50,
          maxMemoryMB: 512,
          maxCPUPercent: 80,
        },
      };

      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'done';
      };

      const taskId = await executor.executeTask(task, config);
      await new Promise(resolve => setTimeout(resolve, 100));

      const taskResult = executor.getTask(taskId);
      expect(taskResult?.error?.message).toContain('timed out after 50ms');
      expect(taskResult?.error?.message).toContain('breaking down the task');
      expect(taskResult?.error?.message).toContain('increasing maxDuration');
    });
  });

  describe('Stress Tests', () => {
    it('should handle multiple tasks with different timeouts', async () => {
      const configs = [
        { timeout: 50, delay: 30, shouldComplete: true },
        { timeout: 50, delay: 100, shouldComplete: false },
        { timeout: 100, delay: 50, shouldComplete: true },
        { timeout: 100, delay: 150, shouldComplete: false },
      ];

      const taskIds = await Promise.all(
        configs.map(async ({ timeout, delay }) => {
          const config: ExecutionConfig = {
            priority: 'medium',
            mode: 'background',
            resourceLimits: {
              maxDuration: timeout,
              maxMemoryMB: 512,
              maxCPUPercent: 80,
            },
          };

          const task = async () => {
            await new Promise(resolve => setTimeout(resolve, delay));
            return 'done';
          };

          return executor.executeTask(task, config);
        })
      );

      // Wait for all to complete or timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check results
      for (let i = 0; i < taskIds.length; i++) {
        const task = executor.getTask(taskIds[i]);
        const expected = configs[i].shouldComplete ? 'completed' : 'failed';
        expect(task?.status).toBe(expected);
      }
    });
  });
});
