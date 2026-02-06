/**
 * SSE Event Integration Tests
 *
 * Tests full event flow from TaskBoard operations to SSE delivery.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TaskBoard } from '../../storage/TaskBoard.js';
import { A2AEventEmitter } from '../A2AEventEmitter.js';
import { createEventsRouter } from '../../server/routes/events.js';
import { A2AEvent, TaskEventData } from '../types.js';

describe('SSE Event Integration', () => {
  let app: express.Express;
  let eventEmitter: A2AEventEmitter;
  let taskBoard: TaskBoard;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(
      os.tmpdir(),
      `test-sse-integration-${Date.now()}.db`
    );
    eventEmitter = new A2AEventEmitter();
    taskBoard = new TaskBoard(testDbPath, eventEmitter);

    app = express();
    app.use('/a2a/events', createEventsRouter(eventEmitter));
  });

  afterEach(() => {
    taskBoard.close();
    eventEmitter.dispose();
    try {
      fs.unlinkSync(testDbPath);
    } catch {
      // Ignore cleanup errors
    }
    try {
      fs.unlinkSync(testDbPath + '-wal');
    } catch {
      // Ignore cleanup errors
    }
    try {
      fs.unlinkSync(testDbPath + '-shm');
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('TaskBoard -> EventEmitter -> SSE flow', () => {
    it('should emit task.created event when task is created', () => {
      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      const taskId = taskBoard.createTask({
        subject: 'Test SSE task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task.created');
      expect(events[0].data.taskId).toBe(taskId);
    });

    it('should emit task.claimed event when task is claimed', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      taskBoard.claimTask(taskId, 'agent-1');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task.claimed');
      expect((events[0].data as TaskEventData).owner).toBe('agent-1');
    });

    it('should emit task.cancelled event when task is cancelled', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      taskBoard.cancelTask(taskId, 'agent-1', 'No longer needed');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task.cancelled');
      expect((events[0].data as TaskEventData).status).toBe('cancelled');
    });

    it('should emit task.released event when task is released', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.claimTask(taskId, 'agent-1');

      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      taskBoard.releaseTask(taskId);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task.released');
      expect((events[0].data as TaskEventData).status).toBe('pending');
    });

    it('should emit task.completed event when task is completed', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.claimTask(taskId, 'agent-1');

      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      taskBoard.completeTask(taskId, 'agent-1');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task.completed');
      expect((events[0].data as TaskEventData).status).toBe('completed');
    });

    it('should emit task.deleted event when task is deleted', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      taskBoard.deleteTask(taskId);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task.deleted');
      expect((events[0].data as TaskEventData).taskId).toBe(taskId);
    });

    it('should emit complete lifecycle events', () => {
      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      const taskId = taskBoard.createTask({
        subject: 'Lifecycle test',
        status: 'pending',
        creator_platform: 'test',
      });

      taskBoard.claimTask(taskId, 'agent-1');
      taskBoard.releaseTask(taskId);
      taskBoard.claimTask(taskId, 'agent-2');
      taskBoard.completeTask(taskId, 'agent-2');

      expect(events).toHaveLength(5);
      expect(events.map((e) => e.type)).toEqual([
        'task.created',
        'task.claimed',
        'task.released',
        'task.claimed',
        'task.completed',
      ]);
    });

    it('should include actor in event data for relevant operations', () => {
      const events: A2AEvent[] = [];
      eventEmitter.subscribe((event) => events.push(event));

      const taskId = taskBoard.createTask({
        subject: 'Actor test',
        status: 'pending',
        creator_platform: 'test',
      });

      taskBoard.claimTask(taskId, 'agent-1');
      taskBoard.completeTask(taskId, 'agent-1');

      const claimEvent = events.find((e) => e.type === 'task.claimed');
      const completeEvent = events.find((e) => e.type === 'task.completed');

      expect((claimEvent?.data as TaskEventData).actor).toBe('agent-1');
      expect((completeEvent?.data as TaskEventData).actor).toBe('agent-1');
    });
  });

  describe('Event filtering', () => {
    it('should filter events by type', () => {
      taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const allEvents = eventEmitter.getEventsAfter(undefined);
      expect(allEvents.some((e) => e.type === 'task.created')).toBe(true);
    });

    it('should include all event data fields', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test subject',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      const events = eventEmitter.getEventsAfter(undefined);
      const createEvent = events[0];
      const data = createEvent.data as TaskEventData;

      expect(data.taskId).toBe(taskId);
      expect(data.subject).toBe('Test subject');
      expect(data.status).toBe('pending');
      expect(data.creator_platform).toBe('claude-code');
      expect(data.owner).toBeNull();
    });
  });

  describe('Reconnection support', () => {
    it('should return missed events after reconnection', () => {
      // Create some events
      taskBoard.createTask({
        subject: 'Task 1',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.createTask({
        subject: 'Task 2',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.createTask({
        subject: 'Task 3',
        status: 'pending',
        creator_platform: 'test',
      });

      const allEvents = eventEmitter.getEventsAfter(undefined);
      expect(allEvents).toHaveLength(3);

      // Get first event ID
      const firstEventId = allEvents[0].id;

      // Get events after first
      const afterFirst = eventEmitter.getEventsAfter(firstEventId);
      expect(afterFirst).toHaveLength(2);
    });

    it('should return empty array for unknown last event ID', () => {
      taskBoard.createTask({
        subject: 'Task 1',
        status: 'pending',
        creator_platform: 'test',
      });

      const events = eventEmitter.getEventsAfter('unknown-event-id');
      expect(events).toHaveLength(0);
    });

    it('should return correct events in order after partial reconnection', () => {
      // Create multiple events
      const taskIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const id = taskBoard.createTask({
          subject: `Task ${i}`,
          status: 'pending',
          creator_platform: 'test',
        });
        taskIds.push(id);
      }

      const allEvents = eventEmitter.getEventsAfter(undefined);
      expect(allEvents).toHaveLength(5);

      // Reconnect after third event
      const thirdEventId = allEvents[2].id;
      const afterThird = eventEmitter.getEventsAfter(thirdEventId);

      expect(afterThird).toHaveLength(2);
      expect((afterThird[0].data as TaskEventData).subject).toBe('Task 3');
      expect((afterThird[1].data as TaskEventData).subject).toBe('Task 4');
    });
  });

  describe('Buffer overflow', () => {
    it('should handle buffer overflow (ring buffer behavior)', () => {
      // Create emitter with small buffer
      const smallEmitter = new A2AEventEmitter(5);
      const smallDbPath = testDbPath + '-small';
      const smallTaskBoard = new TaskBoard(smallDbPath, smallEmitter);

      // Create more events than buffer can hold
      for (let i = 0; i < 10; i++) {
        smallTaskBoard.createTask({
          subject: `Task ${i}`,
          status: 'pending',
          creator_platform: 'test',
        });
      }

      // Should only have last 5 events
      const bufferedEvents = smallEmitter.getEventsAfter(undefined);
      expect(bufferedEvents).toHaveLength(5);
      // First event should be Task 5 (indices 0-4 were dropped)
      expect((bufferedEvents[0].data as TaskEventData).subject).toBe('Task 5');

      smallTaskBoard.close();
      smallEmitter.dispose();
      try {
        fs.unlinkSync(smallDbPath);
      } catch {
        // Ignore cleanup errors
      }
      try {
        fs.unlinkSync(smallDbPath + '-wal');
      } catch {
        // Ignore cleanup errors
      }
      try {
        fs.unlinkSync(smallDbPath + '-shm');
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should lose old event IDs when buffer overflows', () => {
      const smallEmitter = new A2AEventEmitter(3);
      const smallDbPath = testDbPath + '-small2';
      const smallTaskBoard = new TaskBoard(smallDbPath, smallEmitter);

      // Create first batch of tasks
      smallTaskBoard.createTask({
        subject: 'Task 0',
        status: 'pending',
        creator_platform: 'test',
      });
      smallTaskBoard.createTask({
        subject: 'Task 1',
        status: 'pending',
        creator_platform: 'test',
      });

      const firstEvents = smallEmitter.getEventsAfter(undefined);
      const oldEventId = firstEvents[0].id;

      // Create more events to overflow buffer
      for (let i = 2; i < 6; i++) {
        smallTaskBoard.createTask({
          subject: `Task ${i}`,
          status: 'pending',
          creator_platform: 'test',
        });
      }

      // Old event ID should no longer be found
      const eventsAfterOld = smallEmitter.getEventsAfter(oldEventId);
      expect(eventsAfterOld).toHaveLength(0);

      smallTaskBoard.close();
      smallEmitter.dispose();
      try {
        fs.unlinkSync(smallDbPath);
      } catch {
        // Ignore cleanup errors
      }
    });
  });

  describe('Multiple subscribers', () => {
    it('should deliver events to all subscribers', () => {
      const subscriber1Events: A2AEvent[] = [];
      const subscriber2Events: A2AEvent[] = [];

      eventEmitter.subscribe((e) => subscriber1Events.push(e));
      eventEmitter.subscribe((e) => subscriber2Events.push(e));

      taskBoard.createTask({
        subject: 'Multi-subscriber test',
        status: 'pending',
        creator_platform: 'test',
      });

      expect(subscriber1Events).toHaveLength(1);
      expect(subscriber2Events).toHaveLength(1);
      expect(subscriber1Events[0].id).toBe(subscriber2Events[0].id);
    });

    it('should isolate subscriber failures', () => {
      const workingEvents: A2AEvent[] = [];
      const errorFn = vi.fn(() => {
        throw new Error('Subscriber error');
      });

      eventEmitter.subscribe(errorFn);
      eventEmitter.subscribe((e) => workingEvents.push(e));

      taskBoard.createTask({
        subject: 'Error isolation test',
        status: 'pending',
        creator_platform: 'test',
      });

      // Error subscriber was called but didn't prevent other subscriber
      expect(errorFn).toHaveBeenCalled();
      expect(workingEvents).toHaveLength(1);
    });
  });

  describe('SSE endpoint headers', () => {
    it('should return correct SSE headers', async () => {
      // SSE connections stay open indefinitely, so we need to abort the request
      // after checking headers to prevent test timeout
      const controller = new AbortController();

      const response = await new Promise<{
        headers: Record<string, string>;
        status: number;
      }>((resolve, reject) => {
        const req = request(app)
          .get('/a2a/events')
          .buffer(false)
          .parse((res, callback) => {
            // Capture headers and abort immediately
            resolve({
              headers: res.headers as Record<string, string>,
              status: res.statusCode,
            });
            // Abort the request to close the SSE connection
            controller.abort();
            callback(null, '');
          });

        req.catch((err: Error) => {
          // Ignore abort errors
          if (err.message.includes('aborted')) return;
          reject(err);
        });
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });
  });

  describe('Event data integrity', () => {
    it('should preserve task subject in events', () => {
      const subject = 'Test task with special chars: <>&"\'';
      taskBoard.createTask({
        subject,
        status: 'pending',
        creator_platform: 'test',
      });

      const events = eventEmitter.getEventsAfter(undefined);
      expect((events[0].data as TaskEventData).subject).toBe(subject);
    });

    it('should include unique event IDs', () => {
      for (let i = 0; i < 10; i++) {
        taskBoard.createTask({
          subject: `Task ${i}`,
          status: 'pending',
          creator_platform: 'test',
        });
      }

      const events = eventEmitter.getEventsAfter(undefined);
      const ids = events.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include timestamps in chronological order', () => {
      for (let i = 0; i < 5; i++) {
        taskBoard.createTask({
          subject: `Task ${i}`,
          status: 'pending',
          creator_platform: 'test',
        });
      }

      const events = eventEmitter.getEventsAfter(undefined);
      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp).toBeGreaterThanOrEqual(
          events[i - 1].timestamp
        );
      }
    });
  });

  describe('Platform tracking', () => {
    it('should track creator_platform in events', () => {
      taskBoard.createTask({
        subject: 'Claude Code task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      taskBoard.createTask({
        subject: 'Cursor task',
        status: 'pending',
        creator_platform: 'cursor',
      });

      const events = eventEmitter.getEventsAfter(undefined);
      expect((events[0].data as TaskEventData).creator_platform).toBe(
        'claude-code'
      );
      expect((events[1].data as TaskEventData).creator_platform).toBe('cursor');
    });
  });
});
