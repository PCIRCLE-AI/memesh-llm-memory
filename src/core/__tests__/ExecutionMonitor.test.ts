import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionMonitor } from '../ExecutionMonitor.js';
import { BackgroundTask, ExecutionConfig } from '../types.js';
import { UIEventBus } from '../../ui/UIEventBus.js';

describe('ExecutionMonitor', () => {
  let monitor: ExecutionMonitor;
  let mockTask: BackgroundTask;

  beforeEach(() => {
    monitor = new ExecutionMonitor();

    const config: ExecutionConfig = {
      priority: 'medium',
      mode: 'background',
      callbacks: {},
    };

    mockTask = {
      taskId: 'test-task-1',
      status: 'queued',
      task: { description: 'Test task' },
      config,
      startTime: new Date(),
      progress: {
        progress: 0,
        currentStage: 'queued',
      },
    };
  });

  describe('Task Registration', () => {
    it('should register task', () => {
      monitor.registerTask('task1', mockTask);

      const retrieved = monitor.getTask('task1');
      expect(retrieved).toBe(mockTask);
    });

    it('should unregister task', () => {
      monitor.registerTask('task1', mockTask);
      monitor.unregisterTask('task1');

      const retrieved = monitor.getTask('task1');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for non-existent task', () => {
      const retrieved = monitor.getTask('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      monitor.registerTask('task1', mockTask);
    });

    it('should update task progress', () => {
      monitor.updateProgress('task1', mockTask, 0.5, 'halfway');

      expect(mockTask.progress).toEqual({
        progress: 0.5,
        currentStage: 'halfway',
      });
    });

    it('should normalize progress to [0, 1]', () => {
      // Progress > 1
      monitor.updateProgress('task1', mockTask, 1.5);
      expect(mockTask.progress?.progress).toBe(1.0);

      // Progress < 0
      monitor.updateProgress('task1', mockTask, -0.5);
      expect(mockTask.progress?.progress).toBe(0.0);
    });

    it('should call progress callback', () => {
      const onProgress = vi.fn();
      mockTask.config.callbacks = { onProgress };

      monitor.updateProgress('task1', mockTask, 0.75, 'processing');

      expect(onProgress).toHaveBeenCalledWith(0.75);
    });

    it('should create progress updater function', () => {
      const updateFn = monitor.createProgressUpdater('task1', mockTask);

      updateFn(0.5, 'halfway');

      expect(mockTask.progress).toEqual({
        progress: 0.5,
        currentStage: 'halfway',
      });
    });

    it('should get progress by task ID', () => {
      monitor.updateProgress('task1', mockTask, 0.5, 'processing');

      const progress = monitor.getProgress('task1');

      expect(progress).toEqual({
        progress: 0.5,
        currentStage: 'processing',
      });
    });

    it('should return null for non-existent task progress', () => {
      const progress = monitor.getProgress('non-existent');
      expect(progress).toBeNull();
    });
  });

  describe('Status Updates', () => {
    beforeEach(() => {
      monitor.registerTask('task1', mockTask);
    });

    it('should handle task completion', () => {
      const result = { success: true };

      monitor.handleTaskCompleted('task1', mockTask, result);

      expect(mockTask.status).toBe('completed');
      expect(mockTask.result).toBe(result);
      expect(mockTask.endTime).toBeDefined();
      expect(mockTask.progress).toEqual({
        progress: 1.0,
        currentStage: 'completed',
      });
    });

    it('should call onComplete callback', () => {
      const onComplete = vi.fn();
      mockTask.config.callbacks = { onComplete };
      const result = { success: true };

      monitor.handleTaskCompleted('task1', mockTask, result);

      expect(onComplete).toHaveBeenCalledWith(result);
    });

    it('should handle task failure', () => {
      const error = new Error('Test error');

      monitor.handleTaskFailed('task1', mockTask, error);

      expect(mockTask.status).toBe('failed');
      expect(mockTask.error).toBe(error);
      expect(mockTask.endTime).toBeDefined();
    });

    it('should call onError callback', () => {
      const onError = vi.fn();
      mockTask.config.callbacks = { onError };
      const error = new Error('Test error');

      monitor.handleTaskFailed('task1', mockTask, error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should handle task cancellation', () => {
      monitor.handleTaskCancelled('task1', mockTask);

      expect(mockTask.status).toBe('cancelled');
      expect(mockTask.endTime).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should collect execution statistics', () => {
      const tasks: BackgroundTask[] = [];

      // Create tasks with different statuses
      for (let i = 0; i < 3; i++) {
        const task = {
          ...mockTask,
          taskId: `queued-${i}`,
          status: 'queued' as const,
        };
        tasks.push(task);
        monitor.registerTask(task.taskId, task);
      }

      for (let i = 0; i < 2; i++) {
        const task = {
          ...mockTask,
          taskId: `running-${i}`,
          status: 'running' as const,
        };
        tasks.push(task);
        monitor.registerTask(task.taskId, task);
      }

      for (let i = 0; i < 5; i++) {
        const task = {
          ...mockTask,
          taskId: `completed-${i}`,
          status: 'completed' as const,
        };
        tasks.push(task);
        monitor.registerTask(task.taskId, task);
      }

      const stats = monitor.getStats();

      expect(stats.queued).toBe(3);
      expect(stats.running).toBe(2);
      expect(stats.completed).toBe(5);
      expect(stats.failed).toBe(0);
      expect(stats.cancelled).toBe(0);
    });

    it('should get all monitored tasks', () => {
      monitor.registerTask('task1', mockTask);
      monitor.registerTask('task2', { ...mockTask, taskId: 'task2' });

      const allTasks = monitor.getAllTasks();

      expect(allTasks).toHaveLength(2);
    });

    it('should clear finished tasks', () => {
      // Add tasks with different statuses
      const completedTask = { ...mockTask, taskId: 'completed', status: 'completed' as const };
      const failedTask = { ...mockTask, taskId: 'failed', status: 'failed' as const };
      const cancelledTask = { ...mockTask, taskId: 'cancelled', status: 'cancelled' as const };
      const runningTask = { ...mockTask, taskId: 'running', status: 'running' as const };

      monitor.registerTask('completed', completedTask);
      monitor.registerTask('failed', failedTask);
      monitor.registerTask('cancelled', cancelledTask);
      monitor.registerTask('running', runningTask);

      const cleared = monitor.clearFinishedTasks();

      expect(cleared).toBe(3); // completed, failed, cancelled
      expect(monitor.getAllTasks()).toHaveLength(1); // only running remains
      expect(monitor.getTask('running')).toBeDefined();
      expect(monitor.getTask('completed')).toBeUndefined();
    });
  });

  describe('UIEventBus Integration', () => {
    it('should emit progress events when UIEventBus provided', () => {
      const eventBus = new UIEventBus();
      const emitProgressSpy = vi.spyOn(eventBus, 'emitProgress');

      const monitorWithEventBus = new ExecutionMonitor(eventBus);
      monitorWithEventBus.registerTask('task1', mockTask);

      monitorWithEventBus.updateProgress('task1', mockTask, 0.5, 'processing');

      expect(emitProgressSpy).toHaveBeenCalledWith({
        agentId: 'task1',
        agentType: 'background-executor',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
        startTime: mockTask.startTime,
      });
    });

    it('should not emit events when UIEventBus not provided', () => {
      const monitorWithoutEventBus = new ExecutionMonitor();
      monitorWithoutEventBus.registerTask('task1', mockTask);

      // Should not throw
      expect(() => {
        monitorWithoutEventBus.updateProgress('task1', mockTask, 0.5);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without description', () => {
      const taskWithoutDesc = {
        ...mockTask,
        task: {},
      };

      const eventBus = new UIEventBus();
      const monitorWithEventBus = new ExecutionMonitor(eventBus);
      monitorWithEventBus.registerTask('task1', taskWithoutDesc);

      // Should use default description
      const emitProgressSpy = vi.spyOn(eventBus, 'emitProgress');
      monitorWithEventBus.updateProgress('task1', taskWithoutDesc, 0.5);

      expect(emitProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          taskDescription: 'Background task',
        })
      );
    });

    it('should handle multiple progress updates', () => {
      monitor.registerTask('task1', mockTask);

      monitor.updateProgress('task1', mockTask, 0.25, 'stage1');
      monitor.updateProgress('task1', mockTask, 0.5, 'stage2');
      monitor.updateProgress('task1', mockTask, 0.75, 'stage3');
      monitor.updateProgress('task1', mockTask, 1.0, 'completed');

      expect(mockTask.progress).toEqual({
        progress: 1.0,
        currentStage: 'completed',
      });
    });

    it('should handle task without progress object', () => {
      const taskWithoutProgress = {
        ...mockTask,
        progress: undefined,
      };

      monitor.registerTask('task1', taskWithoutProgress);

      const progress = monitor.getProgress('task1');

      expect(progress).toEqual({
        progress: 0,
        currentStage: 'queued',
      });
    });
  });
});
