/**
 * UIEventBus Test Suite
 *
 * Tests for the UIEventBus event system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIEventBus } from '../../src/ui/UIEventBus.js';
import { UIEventType, ProgressIndicator, SuccessEvent, ErrorEvent } from '../../src/ui/types.js';

describe('UIEventBus', () => {
  let eventBus: UIEventBus;

  beforeEach(() => {
    // Get a fresh instance for each test
    eventBus = UIEventBus.getInstance();
    // Clear all listeners
    eventBus.removeAllListeners();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UIEventBus.getInstance();
      const instance2 = UIEventBus.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Event Emission and Subscription', () => {
    it('should emit and receive progress events', () => {
      const mockHandler = vi.fn();
      const progressData: ProgressIndicator = {
        agentId: 'test-agent-1',
        agentType: 'code-reviewer',
        taskDescription: 'Reviewing code',
        progress: 0.5,
        currentStage: 'analyzing',
        startTime: new Date(),
      };

      eventBus.onProgress(mockHandler);
      eventBus.emitProgress(progressData);

      expect(mockHandler).toHaveBeenCalledOnce();
      expect(mockHandler).toHaveBeenCalledWith(progressData);
    });

    it('should emit and receive success events', () => {
      const mockHandler = vi.fn();
      const successData: SuccessEvent = {
        agentId: 'test-agent-1',
        agentType: 'test-automator',
        taskDescription: 'Running tests',
        result: { testsPass: true },
        duration: 5000,
        timestamp: new Date(),
      };

      eventBus.onSuccess(mockHandler);
      eventBus.emitSuccess(successData);

      expect(mockHandler).toHaveBeenCalledOnce();
      expect(mockHandler).toHaveBeenCalledWith(successData);
    });

    it('should emit and receive error events', () => {
      const mockHandler = vi.fn();
      const errorData: ErrorEvent = {
        agentId: 'test-agent-2',
        agentType: 'backend-developer',
        taskDescription: 'API implementation',
        error: new Error('Database connection failed'),
        timestamp: new Date(),
      };

      eventBus.onError(mockHandler);
      eventBus.emitError(errorData);

      expect(mockHandler).toHaveBeenCalledOnce();
      expect(mockHandler).toHaveBeenCalledWith(errorData);
    });
  });

  describe('Multiple Listeners', () => {
    it('should support multiple listeners for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const progressData: ProgressIndicator = {
        agentId: 'test-agent-1',
        agentType: 'debugger',
        taskDescription: 'Debugging issue',
        progress: 0.3,
        startTime: new Date(),
      };

      eventBus.onProgress(handler1);
      eventBus.onProgress(handler2);
      eventBus.emitProgress(progressData);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('Unsubscribe Functionality', () => {
    it('should allow unsubscribing from events', () => {
      const mockHandler = vi.fn();
      const progressData: ProgressIndicator = {
        agentId: 'test-agent-1',
        agentType: 'frontend-developer',
        taskDescription: 'Building UI',
        progress: 0.5,
        startTime: new Date(),
      };

      const unsubscribe = eventBus.onProgress(mockHandler);
      eventBus.emitProgress(progressData);

      expect(mockHandler).toHaveBeenCalledOnce();

      // Unsubscribe
      unsubscribe();
      eventBus.emitProgress(progressData);

      // Should still be called only once (not twice)
      expect(mockHandler).toHaveBeenCalledOnce();
    });
  });

  describe('Error Handling', () => {
    it('should wrap handlers with error boundary', () => {
      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const errorEventHandler = vi.fn();
      const progressData: ProgressIndicator = {
        agentId: 'test-agent-1',
        agentType: 'test-automator',
        taskDescription: 'Running tests',
        progress: 0.5,
        startTime: new Date(),
      };

      // Listen for error events emitted by error boundary
      eventBus.on('error', errorEventHandler);

      // Subscribe faulty handler
      eventBus.onProgress(faultyHandler);

      // This should not throw - error should be caught and emitted as error event
      expect(() => eventBus.emitProgress(progressData)).not.toThrow();

      // Faulty handler was called
      expect(faultyHandler).toHaveBeenCalledOnce();

      // Error event should have been emitted
      expect(errorEventHandler).toHaveBeenCalledOnce();
      const errorEvent = errorEventHandler.mock.calls[0][0];
      expect(errorEvent.error).toBeInstanceOf(Error);
      expect(errorEvent.error.message).toBe('Handler error');
    });

    it('should continue processing other handlers after one fails', () => {
      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();
      const progressData: ProgressIndicator = {
        agentId: 'test-agent-1',
        agentType: 'code-reviewer',
        taskDescription: 'Reviewing code',
        progress: 0.5,
        startTime: new Date(),
      };

      eventBus.onProgress(faultyHandler);
      eventBus.onProgress(goodHandler);

      eventBus.emitProgress(progressData);

      expect(faultyHandler).toHaveBeenCalledOnce();
      expect(goodHandler).toHaveBeenCalledOnce();
    });
  });

  describe('Event Type Support', () => {
    it('should support all UIEventType events', () => {
      const handlers = {
        progress: vi.fn(),
        agent_start: vi.fn(),
        agent_complete: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        metrics_update: vi.fn(),
      };

      // Subscribe to all events
      eventBus.on(UIEventType.PROGRESS, handlers.progress);
      eventBus.on(UIEventType.AGENT_START, handlers.agent_start);
      eventBus.on(UIEventType.AGENT_COMPLETE, handlers.agent_complete);
      eventBus.on(UIEventType.SUCCESS, handlers.success);
      eventBus.on(UIEventType.ERROR, handlers.error);
      eventBus.on(UIEventType.METRICS_UPDATE, handlers.metrics_update);

      // Emit all events
      eventBus.emit(UIEventType.PROGRESS, { test: 'data' });
      eventBus.emit(UIEventType.AGENT_START, { test: 'data' });
      eventBus.emit(UIEventType.AGENT_COMPLETE, { test: 'data' });
      eventBus.emit(UIEventType.SUCCESS, { test: 'data' });
      eventBus.emit(UIEventType.ERROR, { test: 'data' });
      eventBus.emit(UIEventType.METRICS_UPDATE, { test: 'data' });

      // All handlers should have been called
      expect(handlers.progress).toHaveBeenCalledOnce();
      expect(handlers.agent_start).toHaveBeenCalledOnce();
      expect(handlers.agent_complete).toHaveBeenCalledOnce();
      expect(handlers.success).toHaveBeenCalledOnce();
      expect(handlers.error).toHaveBeenCalledOnce();
      expect(handlers.metrics_update).toHaveBeenCalledOnce();
    });
  });

  describe('Memory Management', () => {
    it('should clean up all listeners with removeAllListeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.onProgress(handler1);
      eventBus.onSuccess(handler2);
      eventBus.onError(handler3);

      eventBus.removeAllListeners();

      // Emit events after cleanup
      eventBus.emitProgress({
        agentId: 'test',
        agentType: 'test',
        taskDescription: 'test',
        progress: 0.5,
        startTime: new Date(),
      });
      eventBus.emitSuccess({
        agentId: 'test',
        agentType: 'test',
        taskDescription: 'test',
        result: {},
        duration: 100,
        timestamp: new Date(),
      });
      eventBus.emitError({
        agentId: 'test',
        agentType: 'test',
        taskDescription: 'test',
        error: new Error('test'),
        timestamp: new Date(),
      });

      // No handlers should be called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });
  });
});
