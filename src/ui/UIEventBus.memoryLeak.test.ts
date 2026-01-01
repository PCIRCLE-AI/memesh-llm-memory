/**
 * UIEventBus Memory Leak Prevention Tests
 *
 * Tests for WeakMap handler tracking, cleanup methods, and leak detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UIEventBus } from './UIEventBus.js';
import { UIEventType } from './types.js';

describe('UIEventBus - Memory Leak Prevention', () => {
  let eventBus: UIEventBus;

  beforeEach(() => {
    eventBus = UIEventBus.getInstance();
    // Clean up before each test
    eventBus.removeAllListeners();
  });

  describe('Handler Map Tracking', () => {
    it('should reuse wrapped handler for same original handler', () => {
      const handler = () => {};

      // Subscribe same handler twice
      const unsub1 = eventBus.onProgress(handler);
      const unsub2 = eventBus.onProgress(handler);

      // Should have 2 listeners (both using same wrapped handler)
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(2);

      // Unsubscribe one
      unsub1();
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(1);

      // Unsubscribe the other
      unsub2();
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);
    });

    it('should allow removing listener with original handler reference', () => {
      const handler = () => {};

      eventBus.onProgress(handler);
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(1);

      // Remove using original handler (not wrapped)
      eventBus.off(UIEventType.PROGRESS, handler);
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);
    });

    it('should handle removing non-existent handler gracefully', () => {
      const handler = () => {};

      // Should not throw when removing handler that was never added
      expect(() => {
        eventBus.off(UIEventType.PROGRESS, handler);
      }).not.toThrow();
    });
  });

  describe('Listener Count Monitoring', () => {
    it('should track listener counts correctly', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const handler3 = () => {};

      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);

      eventBus.onProgress(handler1);
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(1);

      eventBus.onProgress(handler2);
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(2);

      eventBus.onSuccess(handler3);
      expect(eventBus.getListenerCount(UIEventType.SUCCESS)).toBe(1);
    });

    it('should return all listener counts', () => {
      eventBus.onProgress(() => {});
      eventBus.onProgress(() => {});
      eventBus.onSuccess(() => {});
      eventBus.onError(() => {});

      const counts = eventBus.getAllListenerCounts();

      expect(counts[UIEventType.PROGRESS]).toBe(2);
      expect(counts[UIEventType.SUCCESS]).toBe(1);
      expect(counts[UIEventType.ERROR]).toBe(1);
      expect(counts[UIEventType.AGENT_START]).toBeUndefined(); // No listeners
    });

    it('should only include events with listeners in getAllListenerCounts', () => {
      eventBus.onProgress(() => {});

      const counts = eventBus.getAllListenerCounts();
      const keys = Object.keys(counts);

      // Should only have progress
      expect(keys).toEqual([UIEventType.PROGRESS]);
    });
  });

  describe('Cleanup Methods', () => {
    it('should remove all listeners for specific event type', () => {
      eventBus.onProgress(() => {});
      eventBus.onProgress(() => {});
      eventBus.onSuccess(() => {});

      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(2);
      expect(eventBus.getListenerCount(UIEventType.SUCCESS)).toBe(1);

      // Remove only progress listeners
      eventBus.removeAllListenersForEvent(UIEventType.PROGRESS);

      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);
      expect(eventBus.getListenerCount(UIEventType.SUCCESS)).toBe(1); // Unchanged
    });

    it('should remove all listeners from all events', () => {
      eventBus.onProgress(() => {});
      eventBus.onSuccess(() => {});
      eventBus.onError(() => {});

      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(1);
      expect(eventBus.getListenerCount(UIEventType.SUCCESS)).toBe(1);
      expect(eventBus.getListenerCount(UIEventType.ERROR)).toBe(1);

      eventBus.removeAllListeners();

      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);
      expect(eventBus.getListenerCount(UIEventType.SUCCESS)).toBe(0);
      expect(eventBus.getListenerCount(UIEventType.ERROR)).toBe(0);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect no leaks when listener counts are normal', () => {
      // Add a few listeners (under threshold)
      eventBus.onProgress(() => {});
      eventBus.onProgress(() => {});
      eventBus.onProgress(() => {});

      const leaks = eventBus.detectPotentialLeaks(10);
      expect(leaks).toHaveLength(0);
    });

    it('should detect leaks when listener count exceeds threshold', () => {
      // Add many listeners to trigger leak detection
      for (let i = 0; i < 15; i++) {
        eventBus.onProgress(() => {});
      }

      const leaks = eventBus.detectPotentialLeaks(10);
      expect(leaks).toHaveLength(1);
      expect(leaks[0].eventType).toBe(UIEventType.PROGRESS);
      expect(leaks[0].count).toBe(15);
    });

    it('should detect multiple leak sources', () => {
      // Add excessive listeners to multiple event types
      for (let i = 0; i < 12; i++) {
        eventBus.onProgress(() => {});
        eventBus.onSuccess(() => {});
      }

      const leaks = eventBus.detectPotentialLeaks(10);
      expect(leaks).toHaveLength(2);

      const eventTypes = leaks.map(l => l.eventType);
      expect(eventTypes).toContain(UIEventType.PROGRESS);
      expect(eventTypes).toContain(UIEventType.SUCCESS);
    });

    it('should allow custom threshold for leak detection', () => {
      // Add 8 listeners
      for (let i = 0; i < 8; i++) {
        eventBus.onProgress(() => {});
      }

      // No leak with default threshold (10)
      expect(eventBus.detectPotentialLeaks()).toHaveLength(0);

      // Leak with custom threshold (5)
      const leaks = eventBus.detectPotentialLeaks(5);
      expect(leaks).toHaveLength(1);
      expect(leaks[0].count).toBe(8);
    });
  });

  describe('Unsubscribe Function', () => {
    it('should properly clean up with returned unsubscribe function', () => {
      const handler = () => {};
      const unsubscribe = eventBus.onProgress(handler);

      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(1);

      unsubscribe();
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);
    });

    it('should handle multiple unsubscribe calls gracefully', () => {
      const unsubscribe = eventBus.onProgress(() => {});

      unsubscribe();
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);

      // Should not throw on second call
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should allow mix of unsubscribe methods', () => {
      const handler1 = () => {};
      const handler2 = () => {};

      const unsub1 = eventBus.onProgress(handler1);
      eventBus.onProgress(handler2);

      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(2);

      // Unsubscribe one with returned function
      unsub1();
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(1);

      // Unsubscribe other with off() method
      eventBus.off(UIEventType.PROGRESS, handler2);
      expect(eventBus.getListenerCount(UIEventType.PROGRESS)).toBe(0);
    });
  });
});
