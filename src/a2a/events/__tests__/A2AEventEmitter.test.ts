import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  A2AEventEmitter,
  getGlobalEventEmitter,
  resetGlobalEventEmitter,
} from '../A2AEventEmitter.js';
import { A2AEvent, TaskEventData } from '../types.js';

describe('A2AEventEmitter', () => {
  let emitter: A2AEventEmitter;

  beforeEach(() => {
    emitter = new A2AEventEmitter();
  });

  const createTaskEvent = (
    type: 'task.created' | 'task.claimed'
  ): A2AEvent<TaskEventData> => ({
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    data: {
      taskId: 'task-1',
      subject: 'Test Task',
      status: 'pending',
      owner: null,
      creator_platform: 'claude-code',
    },
  });

  describe('emit', () => {
    it('should emit events to all subscribers', () => {
      const callback = vi.fn();
      emitter.subscribe(callback);

      const event = createTaskEvent('task.created');
      emitter.emit(event);

      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should emit to multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      emitter.subscribe(callback1);
      emitter.subscribe(callback2);

      const event = createTaskEvent('task.created');
      emitter.emit(event);

      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
    });

    it('should store events in buffer', () => {
      const event = createTaskEvent('task.created');
      emitter.emit(event);

      expect(emitter.getEventsAfter(undefined)).toHaveLength(1);
    });

    it('should not let one subscriber error affect others', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodCallback = vi.fn();

      emitter.subscribe(errorCallback);
      emitter.subscribe(goodCallback);

      const event = createTaskEvent('task.created');
      // Should not throw
      emitter.emit(event);

      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalledWith(event);
    });

    it('should handle subscriber unsubscribing during emit (concurrent modification)', () => {
      const callOrder: string[] = [];
      let unsubscribe2: () => void;

      const callback1 = vi.fn(() => {
        callOrder.push('callback1');
        // Unsubscribe callback2 during iteration
        unsubscribe2();
      });

      const callback2 = vi.fn(() => {
        callOrder.push('callback2');
      });

      const callback3 = vi.fn(() => {
        callOrder.push('callback3');
      });

      emitter.subscribe(callback1);
      unsubscribe2 = emitter.subscribe(callback2);
      emitter.subscribe(callback3);

      const event = createTaskEvent('task.created');
      emitter.emit(event);

      // All callbacks should be called because we snapshot before iterating
      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
      expect(callback3).toHaveBeenCalledWith(event);
      expect(callOrder).toEqual(['callback1', 'callback2', 'callback3']);

      // After emit, callback2 should be unsubscribed
      expect(emitter.subscriberCount).toBe(2);
    });

    it('should handle subscriber unsubscribing itself during emit', () => {
      let unsubscribeSelf: () => void;

      const selfUnsubscribeCallback = vi.fn(() => {
        unsubscribeSelf();
      });

      const otherCallback = vi.fn();

      unsubscribeSelf = emitter.subscribe(selfUnsubscribeCallback);
      emitter.subscribe(otherCallback);

      const event = createTaskEvent('task.created');
      emitter.emit(event);

      // Both should be called despite self-unsubscription
      expect(selfUnsubscribeCallback).toHaveBeenCalledWith(event);
      expect(otherCallback).toHaveBeenCalledWith(event);

      // Self-unsubscribing callback should be gone
      expect(emitter.subscriberCount).toBe(1);
    });
  });

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = emitter.subscribe(callback);

      emitter.emit(createTaskEvent('task.created'));
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      emitter.emit(createTaskEvent('task.claimed'));
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should allow multiple unsubscribes without error', () => {
      const callback = vi.fn();
      const unsubscribe = emitter.subscribe(callback);

      unsubscribe();
      unsubscribe(); // Should not throw
      expect(emitter.subscriberCount).toBe(0);
    });
  });

  describe('getEventsAfter', () => {
    it('should return all events when lastEventId is undefined', () => {
      emitter.emit(createTaskEvent('task.created'));
      emitter.emit(createTaskEvent('task.claimed'));

      const events = emitter.getEventsAfter(undefined);
      expect(events).toHaveLength(2);
    });

    it('should return events after lastEventId', () => {
      const event1 = createTaskEvent('task.created');
      const event2 = createTaskEvent('task.claimed');
      emitter.emit(event1);
      emitter.emit(event2);

      const events = emitter.getEventsAfter(event1.id);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(event2.id);
    });

    it('should return empty array if lastEventId not found', () => {
      emitter.emit(createTaskEvent('task.created'));
      const events = emitter.getEventsAfter('non-existent-id');
      expect(events).toHaveLength(0);
    });
  });

  describe('subscriberCount', () => {
    it('should track active subscribers', () => {
      expect(emitter.subscriberCount).toBe(0);

      const unsub1 = emitter.subscribe(() => {});
      expect(emitter.subscriberCount).toBe(1);

      const unsub2 = emitter.subscribe(() => {});
      expect(emitter.subscriberCount).toBe(2);

      unsub1();
      expect(emitter.subscriberCount).toBe(1);

      unsub2();
      expect(emitter.subscriberCount).toBe(0);
    });
  });

  describe('clearBuffer', () => {
    it('should clear all events from buffer', () => {
      emitter.emit(createTaskEvent('task.created'));
      emitter.emit(createTaskEvent('task.claimed'));
      expect(emitter.getEventsAfter(undefined)).toHaveLength(2);

      emitter.clearBuffer();
      expect(emitter.getEventsAfter(undefined)).toHaveLength(0);
    });
  });

  describe('buffer size limit', () => {
    it('should respect buffer size limit', () => {
      const smallEmitter = new A2AEventEmitter(3);

      for (let i = 0; i < 5; i++) {
        smallEmitter.emit(createTaskEvent('task.created'));
      }

      // Only last 3 events should be kept
      expect(smallEmitter.getEventsAfter(undefined)).toHaveLength(3);
    });
  });

  describe('dispose', () => {
    it('should clear all subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      emitter.subscribe(callback1);
      emitter.subscribe(callback2);

      expect(emitter.subscriberCount).toBe(2);

      emitter.dispose();

      expect(emitter.subscriberCount).toBe(0);
    });

    it('should clear event buffer', () => {
      emitter.emit(createTaskEvent('task.created'));
      emitter.emit(createTaskEvent('task.claimed'));

      expect(emitter.getEventsAfter(undefined)).toHaveLength(2);

      emitter.dispose();

      expect(emitter.getEventsAfter(undefined)).toHaveLength(0);
    });

    it('should not emit to subscribers after dispose', () => {
      const callback = vi.fn();
      emitter.subscribe(callback);

      emitter.dispose();
      emitter.emit(createTaskEvent('task.created'));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should allow multiple dispose calls without error', () => {
      emitter.subscribe(() => {});
      emitter.emit(createTaskEvent('task.created'));

      expect(() => {
        emitter.dispose();
        emitter.dispose();
      }).not.toThrow();
    });
  });
});

describe('Global Event Emitter', () => {
  afterEach(() => {
    resetGlobalEventEmitter();
  });

  it('should return singleton instance', () => {
    const emitter1 = getGlobalEventEmitter();
    const emitter2 = getGlobalEventEmitter();
    expect(emitter1).toBe(emitter2);
  });

  it('should create new instance after reset', () => {
    const emitter1 = getGlobalEventEmitter();
    resetGlobalEventEmitter();
    const emitter2 = getGlobalEventEmitter();
    expect(emitter1).not.toBe(emitter2);
  });

  it('should preserve events until reset', () => {
    const emitter = getGlobalEventEmitter();
    emitter.emit({
      id: 'test-event',
      type: 'task.created',
      timestamp: Date.now(),
      data: {
        taskId: 'task-1',
        subject: 'Test',
        status: 'pending',
        owner: null,
        creator_platform: 'test',
      },
    });

    expect(getGlobalEventEmitter().getEventsAfter(undefined)).toHaveLength(1);

    resetGlobalEventEmitter();
    expect(getGlobalEventEmitter().getEventsAfter(undefined)).toHaveLength(0);
  });

  it('should dispose existing emitter when reset', () => {
    const emitter1 = getGlobalEventEmitter();
    const subscriber = vi.fn();
    emitter1.subscribe(subscriber);

    expect(emitter1.subscriberCount).toBe(1);

    resetGlobalEventEmitter();

    // Get new emitter
    const emitter2 = getGlobalEventEmitter();

    // Should be different instance
    expect(emitter2).not.toBe(emitter1);

    // Old emitter should be disposed (subscribers cleared)
    expect(emitter1.subscriberCount).toBe(0);
  });
});
