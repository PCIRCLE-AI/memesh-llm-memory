import { describe, it, expect, beforeEach } from 'vitest';
import { EventBuffer } from '../EventBuffer.js';
import { A2AEvent } from '../types.js';

describe('EventBuffer', () => {
  let buffer: EventBuffer;

  beforeEach(() => {
    buffer = new EventBuffer(5); // Small buffer for testing
  });

  const createEvent = (id: string): A2AEvent => ({
    id,
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

  describe('add', () => {
    it('should add events to buffer', () => {
      const event = createEvent('event-1');
      buffer.add(event);
      expect(buffer.getAll()).toHaveLength(1);
    });

    it('should maintain ring buffer behavior (overflow)', () => {
      // Add 7 events to buffer of size 5
      for (let i = 1; i <= 7; i++) {
        buffer.add(createEvent(`event-${i}`));
      }
      const all = buffer.getAll();
      expect(all).toHaveLength(5);
      // Should contain events 3-7 (oldest 1-2 dropped)
      expect(all[0].id).toBe('event-3');
      expect(all[4].id).toBe('event-7');
    });
  });

  describe('getAfter', () => {
    it('should return events after given ID', () => {
      buffer.add(createEvent('event-1'));
      buffer.add(createEvent('event-2'));
      buffer.add(createEvent('event-3'));

      const after = buffer.getAfter('event-1');
      expect(after).toHaveLength(2);
      expect(after[0].id).toBe('event-2');
      expect(after[1].id).toBe('event-3');
    });

    it('should return empty array if ID not found', () => {
      buffer.add(createEvent('event-1'));
      const after = buffer.getAfter('non-existent');
      expect(after).toHaveLength(0);
    });

    it('should return empty array if ID is the last event', () => {
      buffer.add(createEvent('event-1'));
      buffer.add(createEvent('event-2'));
      const after = buffer.getAfter('event-2');
      expect(after).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return events in chronological order', () => {
      buffer.add(createEvent('event-1'));
      buffer.add(createEvent('event-2'));
      buffer.add(createEvent('event-3'));

      const all = buffer.getAll();
      expect(all[0].id).toBe('event-1');
      expect(all[1].id).toBe('event-2');
      expect(all[2].id).toBe('event-3');
    });
  });

  describe('clear', () => {
    it('should remove all events', () => {
      buffer.add(createEvent('event-1'));
      buffer.add(createEvent('event-2'));
      buffer.clear();
      expect(buffer.getAll()).toHaveLength(0);
    });
  });
});
