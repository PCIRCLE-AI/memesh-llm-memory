/**
 * ResultHandler Tests
 *
 * Comprehensive test suite for result handling, callback execution, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResultHandler } from '../ResultHandler.js';
import { BackgroundTask, ExecutionConfig } from '../types.js';

describe('ResultHandler', () => {
  let handler: ResultHandler;

  beforeEach(() => {
    handler = new ResultHandler();
  });

  describe('handleCompleted', () => {
    it('should update task status to completed', () => {
      const task = createMockTask();

      handler.handleCompleted(task, { success: true });

      expect(task.status).toBe('completed');
      expect(task.endTime).toBeInstanceOf(Date);
      expect(task.result).toEqual({ success: true });
      expect(task.progress?.progress).toBe(1.0);
      expect(task.progress?.currentStage).toBe('completed');
    });

    it('should execute onComplete callback', () => {
      const onComplete = vi.fn();
      const task = createMockTask({ onComplete });
      const result = { data: [1, 2, 3] };

      handler.handleCompleted(task, result);

      expect(onComplete).toHaveBeenCalledWith(result);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle missing onComplete callback gracefully', () => {
      const task = createMockTask(); // No callbacks

      expect(() => {
        handler.handleCompleted(task, { success: true });
      }).not.toThrow();

      expect(task.status).toBe('completed');
    });

    it('should catch and log errors in onComplete callback', () => {
      const onComplete = vi.fn(() => {
        throw new Error('Callback error');
      });
      const task = createMockTask({ onComplete });

      // Should not throw
      expect(() => {
        handler.handleCompleted(task, { success: true });
      }).not.toThrow();

      expect(task.status).toBe('completed');
      expect(onComplete).toHaveBeenCalled();
    });

    it('should store complex result objects', () => {
      const task = createMockTask();
      const complexResult = {
        success: true,
        data: [1, 2, 3],
        metadata: {
          timestamp: new Date(),
          nested: { value: 42 }
        }
      };

      handler.handleCompleted(task, complexResult);

      expect(task.result).toEqual(complexResult);
    });

    it('should store null result', () => {
      const task = createMockTask();

      handler.handleCompleted(task, null);

      expect(task.result).toBeNull();
      expect(task.status).toBe('completed');
    });
  });

  describe('handleFailed', () => {
    it('should update task status to failed', () => {
      const task = createMockTask();
      const error = new Error('Test error');

      handler.handleFailed(task, error);

      expect(task.status).toBe('failed');
      expect(task.endTime).toBeInstanceOf(Date);
      expect(task.error).toBe(error);
    });

    it('should execute onError callback', () => {
      const onError = vi.fn();
      const task = createMockTask({ onError });
      const error = new Error('Test error');

      handler.handleFailed(task, error);

      expect(onError).toHaveBeenCalledWith(error);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should handle missing onError callback gracefully', () => {
      const task = createMockTask(); // No callbacks
      const error = new Error('Test error');

      expect(() => {
        handler.handleFailed(task, error);
      }).not.toThrow();

      expect(task.status).toBe('failed');
    });

    it('should catch and log errors in onError callback', () => {
      const onError = vi.fn(() => {
        throw new Error('Callback error');
      });
      const task = createMockTask({ onError });
      const error = new Error('Test error');

      // Should not throw
      expect(() => {
        handler.handleFailed(task, error);
      }).not.toThrow();

      expect(task.status).toBe('failed');
      expect(onError).toHaveBeenCalled();
    });

    it('should preserve error details', () => {
      const task = createMockTask();
      const error = new Error('Network timeout');
      error.stack = 'Error: Network timeout\n  at test.ts:123';

      handler.handleFailed(task, error);

      expect(task.error?.message).toBe('Network timeout');
      expect(task.error?.stack).toContain('test.ts:123');
    });

    it('should handle custom error types', () => {
      const task = createMockTask();

      class CustomError extends Error {
        constructor(message: string, public code: number) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error', 500);

      handler.handleFailed(task, error);

      expect(task.error).toBeInstanceOf(CustomError);
      expect((task.error as CustomError).code).toBe(500);
    });
  });

  describe('handleCancelled', () => {
    it('should update task status to cancelled', () => {
      const task = createMockTask();

      handler.handleCancelled(task);

      expect(task.status).toBe('cancelled');
      expect(task.endTime).toBeInstanceOf(Date);
    });

    it('should not execute any callbacks', () => {
      const onComplete = vi.fn();
      const onError = vi.fn();
      const task = createMockTask({ onComplete, onError });

      handler.handleCancelled(task);

      expect(onComplete).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should not store result or error', () => {
      const task = createMockTask();

      handler.handleCancelled(task);

      expect(task.result).toBeUndefined();
      expect(task.error).toBeUndefined();
    });
  });

  describe('multiple state transitions', () => {
    it('should allow completion after running', () => {
      const task = createMockTask();
      task.status = 'running';

      handler.handleCompleted(task, { success: true });

      expect(task.status).toBe('completed');
    });

    it('should allow failure after running', () => {
      const task = createMockTask();
      task.status = 'running';

      handler.handleFailed(task, new Error('Test'));

      expect(task.status).toBe('failed');
    });

    it('should allow cancellation from any state', () => {
      const task1 = createMockTask();
      task1.status = 'queued';
      handler.handleCancelled(task1);
      expect(task1.status).toBe('cancelled');

      const task2 = createMockTask();
      task2.status = 'running';
      handler.handleCancelled(task2);
      expect(task2.status).toBe('cancelled');
    });
  });

  describe('terminal state guards', () => {
    it('should NOT update status when task is already completed (terminal state guard)', () => {
      const task = createMockTask();
      task.status = 'running';

      // First complete the task
      handler.handleCompleted(task, { success: true, data: 'original' });
      expect(task.status).toBe('completed');
      expect(task.result).toEqual({ success: true, data: 'original' });
      const originalEndTime = task.endTime;

      // Now try to cancel it - should NOT change status
      handler.handleCancelled(task);
      expect(task.status).toBe('completed'); // Status should remain 'completed'
      expect(task.result).toEqual({ success: true, data: 'original' }); // Result preserved
      expect(task.endTime).toBe(originalEndTime); // End time unchanged

      // Also try to fail it - should NOT change status
      handler.handleFailed(task, new Error('Should not affect'));
      expect(task.status).toBe('completed'); // Status should still be 'completed'
      expect(task.error).toBeUndefined(); // Error should not be set
    });

    it('should NOT update status when task is already cancelled', () => {
      const onComplete = vi.fn();
      const task = createMockTask({ onComplete });
      task.status = 'running';

      // First cancel the task
      handler.handleCancelled(task);
      expect(task.status).toBe('cancelled');
      const originalEndTime = task.endTime;

      // Now try to complete it - should NOT change status
      handler.handleCompleted(task, { success: true });
      expect(task.status).toBe('cancelled'); // Status should remain 'cancelled'
      expect(task.result).toBeUndefined(); // Result should not be set
      expect(task.endTime).toBe(originalEndTime); // End time unchanged
      expect(onComplete).not.toHaveBeenCalled(); // Callback should not be executed

      // Also try to fail it - should NOT change status
      handler.handleFailed(task, new Error('Should not affect'));
      expect(task.status).toBe('cancelled'); // Status should still be 'cancelled'
      expect(task.error).toBeUndefined(); // Error should not be set
    });

    it('should NOT update status when task is already failed', () => {
      const onComplete = vi.fn();
      const task = createMockTask({ onComplete });
      task.status = 'running';

      // First fail the task
      const originalError = new Error('Original failure');
      handler.handleFailed(task, originalError);
      expect(task.status).toBe('failed');
      expect(task.error).toBe(originalError);
      const originalEndTime = task.endTime;

      // Now try to complete it - should NOT change status
      handler.handleCompleted(task, { success: true });
      expect(task.status).toBe('failed'); // Status should remain 'failed'
      expect(task.error).toBe(originalError); // Original error preserved
      expect(task.result).toBeUndefined(); // Result should not be set
      expect(task.endTime).toBe(originalEndTime); // End time unchanged
      expect(onComplete).not.toHaveBeenCalled(); // Callback should not be executed

      // Also try to cancel it - should NOT change status
      handler.handleCancelled(task);
      expect(task.status).toBe('failed'); // Status should still be 'failed'
    });
  });

  describe('callback execution', () => {
    it('should execute callbacks with correct context', () => {
      const results: unknown[] = [];
      const onComplete = vi.fn((result) => results.push(result));
      const task = createMockTask({ onComplete });

      handler.handleCompleted(task, { data: 'test' });

      expect(results).toEqual([{ data: 'test' }]);
    });

    it('should handle multiple tasks independently', () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();
      const task1 = createMockTask({ onComplete: onComplete1 });
      const task2 = createMockTask({ onComplete: onComplete2 });

      handler.handleCompleted(task1, 'result1');
      handler.handleCompleted(task2, 'result2');

      expect(onComplete1).toHaveBeenCalledWith('result1');
      expect(onComplete2).toHaveBeenCalledWith('result2');
      expect(onComplete1).toHaveBeenCalledTimes(1);
      expect(onComplete2).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined callbacks object', () => {
      const task = createMockTask();
      delete task.config.callbacks;

      expect(() => {
        handler.handleCompleted(task, { success: true });
      }).not.toThrow();

      expect(() => {
        handler.handleFailed(task, new Error('Test'));
      }).not.toThrow();
    });

    it('should handle empty callbacks object', () => {
      const task = createMockTask();
      task.config.callbacks = {};

      expect(() => {
        handler.handleCompleted(task, { success: true });
      }).not.toThrow();

      expect(() => {
        handler.handleFailed(task, new Error('Test'));
      }).not.toThrow();
    });

    it('should preserve existing task fields', () => {
      const task = createMockTask();
      task.startTime = new Date('2024-01-01');
      task.task = { foo: 'bar' };

      handler.handleCompleted(task, { success: true });

      expect(task.startTime.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(task.task).toEqual({ foo: 'bar' });
    });
  });
});

/**
 * Helper function to create mock BackgroundTask
 */
function createMockTask(callbacks?: {
  onComplete?: (result: unknown) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}): BackgroundTask {
  const config: ExecutionConfig = {
    priority: 'medium',
    mode: 'background',
    callbacks
  };

  return {
    taskId: `test-${Math.random().toString(36).slice(2)}`,
    status: 'queued',
    task: {},
    config,
    startTime: new Date(),
    progress: {
      progress: 0,
      currentStage: 'queued'
    }
  };
}
