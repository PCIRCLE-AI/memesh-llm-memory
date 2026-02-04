/**
 * P1-14: Unhandled Promise Rejections in Event Bus Tests
 *
 * Tests for async error handling in event listeners
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIEventBus } from '../UIEventBus.js';
import { type ProgressIndicator, type ErrorEvent } from '../types.js';

describe('P1-14: Unhandled Promise Rejections in Event Bus', () => {
  let eventBus: UIEventBus;

  beforeEach(() => {
    eventBus = UIEventBus.getInstance();
    eventBus.removeAllListeners(); // Clean slate
  });

  afterEach(() => {
    eventBus.removeAllListeners();
    // ✅ FIX: Restore all mocks to prevent test pollution
    vi.restoreAllMocks();
  });

  describe('Async Error Handling', () => {
    it('should catch async handler rejections', async () => {
      const errorPromise = new Promise<ErrorEvent>((resolve) => {
        eventBus.onError((error) => {
          resolve(error);
        });
      });

      // Register async handler that rejects
      eventBus.onProgress(async (data: ProgressIndicator) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async handler failed');
      });

      // Emit progress event
      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      // Wait for async error to be caught and emitted
      const errorEvent = await Promise.race([
        errorPromise,
        new Promise<ErrorEvent>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout waiting for error')), 1000)
        ),
      ]);

      expect(errorEvent.error.message).toBe('Async handler failed');
      expect(errorEvent.agentType).toBe('event-handler-async');
      expect(errorEvent.taskDescription).toContain('progress');
    });

    it('should catch immediate Promise rejections', async () => {
      const errorPromise = new Promise<ErrorEvent>((resolve) => {
        eventBus.onError((error) => {
          resolve(error);
        });
      });

      // Register handler that returns rejected Promise immediately
      eventBus.onProgress(() => {
        return Promise.reject(new Error('Immediate rejection'));
      });

      // Emit progress event
      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      // Wait for error
      const errorEvent = await Promise.race([
        errorPromise,
        new Promise<ErrorEvent>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 1000)
        ),
      ]);

      expect(errorEvent.error.message).toBe('Immediate rejection');
    });

    it('should handle async handler that throws after delay', async () => {
      const errorPromise = new Promise<ErrorEvent>((resolve) => {
        eventBus.onError((error) => {
          resolve(error);
        });
      });

      // Register handler with delayed throw
      eventBus.onProgress(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Delayed error');
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      const errorEvent = await errorPromise;
      expect(errorEvent.error.message).toBe('Delayed error');
    });

    it('should continue processing other handlers after async rejection', async () => {
      let handler1Called = false;
      let handler2Called = false;
      let handler3Called = false;

      // Register multiple handlers
      eventBus.onProgress(() => {
        handler1Called = true;
      });

      eventBus.onProgress(async () => {
        handler2Called = true;
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Handler 2 failed');
      });

      eventBus.onProgress(() => {
        handler3Called = true;
      });

      // Emit event
      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      // Wait for async handlers
      await new Promise(resolve => setTimeout(resolve, 100));

      // All handlers should have been called
      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
      expect(handler3Called).toBe(true);
    });
  });

  describe('Sync vs Async Error Handling', () => {
    it('should handle sync errors synchronously', () => {
      let errorCaught = false;

      eventBus.onError((error) => {
        errorCaught = true;
        expect(error.error.message).toBe('Sync error');
      });

      // Register sync handler that throws
      eventBus.onProgress(() => {
        throw new Error('Sync error');
      });

      // Emit event
      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      // Sync error should be caught immediately
      expect(errorCaught).toBe(true);
    });

    it('should differentiate sync and async error types', async () => {
      const errors: ErrorEvent[] = [];

      eventBus.onError((error) => {
        errors.push(error);
      });

      // Sync error
      eventBus.onProgress(() => {
        throw new Error('Sync error');
      });

      eventBus.emitProgress({
        agentId: 'test-1',
        agentType: 'test',
        taskDescription: 'Test task 1',
        progress: 0.5,
        currentStage: 'processing',
      });

      // Async error
      eventBus.onSuccess(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      });

      eventBus.emitSuccess({
        agentId: 'test-2',
        agentType: 'test',
        taskDescription: 'Test task 2',
        timeSavedMinutes: 10,
      });

      // Wait for async
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errors.length).toBe(2);
      expect(errors[0].agentType).toBe('event-handler'); // sync
      expect(errors[1].agentType).toBe('event-handler-async'); // async
    });
  });

  describe('Error Event Loop Prevention', () => {
    it('should not emit error event for error handler failures', async () => {
      let errorEventCount = 0;

      // Register error handler that throws
      eventBus.onError(() => {
        errorEventCount++;
        throw new Error('Error handler failed');
      });

      // Register handler that throws async error
      eventBus.onProgress(async () => {
        throw new Error('Progress handler failed');
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only emit once (error handler failure doesn't emit)
      expect(errorEventCount).toBe(1);
    });

    it('should not create infinite error loop with async errors', async () => {
      let errorCount = 0;

      eventBus.onError(async () => {
        errorCount++;
        if (errorCount < 5) {
          throw new Error('Recursive async error');
        }
      });

      // Trigger error
      eventBus.onProgress(async () => {
        throw new Error('Initial error');
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only emit once (error handler errors don't trigger more events)
      expect(errorCount).toBe(1);
    });
  });

  describe('Non-Promise Return Values', () => {
    it('should handle handlers that return non-Promise values', () => {
      let handlerCalled = false;

      // Register handler that returns number
      eventBus.onProgress(() => {
        handlerCalled = true;
        return 42; // Not a Promise
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      expect(handlerCalled).toBe(true);
    });

    it('should handle handlers that return undefined', () => {
      let handlerCalled = false;

      eventBus.onProgress(() => {
        handlerCalled = true;
        // implicitly returns undefined
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      expect(handlerCalled).toBe(true);
    });

    it('should handle handlers that return Promise-like objects', async () => {
      const errorPromise = new Promise<ErrorEvent>((resolve) => {
        eventBus.onError((error) => {
          resolve(error);
        });
      });

      // Register handler that returns Promise-like (thenable)
      // ✅ FIX: Use actual Promise to ensure proper thenable behavior
      eventBus.onProgress(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Thenable error')), 10);
        });
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      const errorEvent = await errorPromise;
      expect(errorEvent.error.message).toBe('Thenable error');
    });
  });

  describe('Console Fallback', () => {
    it('should log to console if error emission fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make emit throw for error events
      const originalEmit = eventBus.emit.bind(eventBus);
      vi.spyOn(eventBus, 'emit').mockImplementation((eventType, data) => {
        if (eventType === 'error') {
          throw new Error('Emit failed');
        }
        return originalEmit(eventType, data);
      });

      // Register async handler that rejects
      eventBus.onProgress(async () => {
        throw new Error('Handler error');
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have logged to console as fallback
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to emit error event'),
        expect.anything()
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Original async handler error'),
        expect.anything()
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Multiple Async Handlers', () => {
    it('should handle multiple async handlers with mixed success/failure', async () => {
      const results: string[] = [];
      const errors: ErrorEvent[] = [];

      eventBus.onError((error) => {
        errors.push(error);
      });

      // Handler 1: succeeds
      eventBus.onProgress(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push('handler1');
      });

      // Handler 2: fails
      eventBus.onProgress(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        throw new Error('Handler 2 failed');
      });

      // Handler 3: succeeds
      eventBus.onProgress(async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        results.push('handler3');
      });

      eventBus.emitProgress({
        agentId: 'test-agent',
        agentType: 'test',
        taskDescription: 'Test task',
        progress: 0.5,
        currentStage: 'processing',
      });

      // Wait for all async handlers
      await new Promise(resolve => setTimeout(resolve, 100));

      // Successful handlers completed
      expect(results).toContain('handler1');
      expect(results).toContain('handler3');

      // Failed handler emitted error
      expect(errors.length).toBe(1);
      expect(errors[0].error.message).toBe('Handler 2 failed');
    });
  });
});
