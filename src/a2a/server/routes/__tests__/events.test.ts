/**
 * SSE Events Endpoint Tests
 *
 * Tests for the Server-Sent Events endpoint for real-time task notifications.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEventsRouter, matchesFilter, formatSSE } from '../events.js';
import { A2AEventEmitter } from '../../../events/A2AEventEmitter.js';
import type { A2AEvent, TaskEventData, AgentEventData } from '../../../events/types.js';
import type { Request, Response } from 'express';

describe('SSE Events Endpoint', () => {
  let eventEmitter: A2AEventEmitter;

  beforeEach(() => {
    eventEmitter = new A2AEventEmitter();
  });

  afterEach(() => {
    eventEmitter.dispose();
  });

  describe('createEventsRouter', () => {
    it('should create a router with GET / handler', () => {
      const router = createEventsRouter(eventEmitter);
      expect(router).toBeDefined();
      // Router has stack of layers
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it('should set SSE headers on connection', () => {
      const router = createEventsRouter(eventEmitter);

      // Create mock request and response
      const mockReq = {
        query: {},
        headers: {},
        on: vi.fn(),
      } as unknown as Request;

      const headers: Record<string, string> = {};
      const mockRes = {
        setHeader: vi.fn((key: string, value: string) => {
          headers[key] = value;
        }),
        flushHeaders: vi.fn(),
        write: vi.fn(),
      } as unknown as Response;

      // Get the route handler
      const handler = router.stack[0].route.stack[0].handle;
      handler(mockReq, mockRes, vi.fn());

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.flushHeaders).toHaveBeenCalled();
    });

    it('should parse filter query parameters', () => {
      const router = createEventsRouter(eventEmitter);

      const mockReq = {
        query: {
          status: 'pending',
          platform: 'claude-code',
          skills: 'typescript,testing',
          types: 'task.created,task.claimed',
        },
        headers: {},
        on: vi.fn(),
      } as unknown as Request;

      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
      } as unknown as Response;

      const handler = router.stack[0].route.stack[0].handle;
      handler(mockReq, mockRes, vi.fn());

      // The handler should run without error
      expect(mockRes.setHeader).toHaveBeenCalled();
    });

    it('should send buffered events on connection', () => {
      // Emit event before creating router to buffer it
      const testEvent: A2AEvent<TaskEventData> = {
        id: 'test-123',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Test Task',
          status: 'pending',
          owner: null,
          creator_platform: 'claude-code',
        },
      };
      eventEmitter.emit(testEvent);

      const router = createEventsRouter(eventEmitter);

      const mockReq = {
        query: {},
        headers: {},
        on: vi.fn(),
      } as unknown as Request;

      const writtenData: string[] = [];
      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((data: string) => {
          writtenData.push(data);
        }),
      } as unknown as Response;

      const handler = router.stack[0].route.stack[0].handle;
      handler(mockReq, mockRes, vi.fn());

      // Should have written the buffered event
      expect(writtenData.length).toBe(1);
      expect(writtenData[0]).toContain('id: test-123');
      expect(writtenData[0]).toContain('event: task.created');
    });

    it('should respect Last-Event-ID header for reconnection', () => {
      // Emit multiple events
      const event1: A2AEvent<TaskEventData> = {
        id: 'event-1',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Test Task 1',
          status: 'pending',
          owner: null,
          creator_platform: 'claude-code',
        },
      };
      const event2: A2AEvent<TaskEventData> = {
        id: 'event-2',
        type: 'task.claimed',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Test Task 1',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        },
      };
      eventEmitter.emit(event1);
      eventEmitter.emit(event2);

      const router = createEventsRouter(eventEmitter);

      const mockReq = {
        query: {},
        headers: { 'last-event-id': 'event-1' },
        on: vi.fn(),
      } as unknown as Request;

      const writtenData: string[] = [];
      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((data: string) => {
          writtenData.push(data);
        }),
      } as unknown as Response;

      const handler = router.stack[0].route.stack[0].handle;
      handler(mockReq, mockRes, vi.fn());

      // Should only write event-2 (events after event-1)
      expect(writtenData.length).toBe(1);
      expect(writtenData[0]).toContain('id: event-2');
    });

    it('should subscribe to new events', () => {
      const router = createEventsRouter(eventEmitter);

      const mockReq = {
        query: {},
        headers: {},
        on: vi.fn(),
      } as unknown as Request;

      const writtenData: string[] = [];
      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((data: string) => {
          writtenData.push(data);
        }),
      } as unknown as Response;

      const handler = router.stack[0].route.stack[0].handle;
      handler(mockReq, mockRes, vi.fn());

      // Emit a new event after connection
      const newEvent: A2AEvent<TaskEventData> = {
        id: 'new-event',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-2',
          subject: 'New Task',
          status: 'pending',
          owner: null,
          creator_platform: 'cursor',
        },
      };
      eventEmitter.emit(newEvent);

      expect(writtenData.length).toBe(1);
      expect(writtenData[0]).toContain('id: new-event');
    });

    it('should unsubscribe on connection close', () => {
      const router = createEventsRouter(eventEmitter);

      let closeHandler: (() => void) | undefined;
      const mockReq = {
        query: {},
        headers: {},
        on: vi.fn((event: string, handler: () => void) => {
          if (event === 'close') {
            closeHandler = handler;
          }
        }),
      } as unknown as Request;

      const writtenData: string[] = [];
      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((data: string) => {
          writtenData.push(data);
        }),
      } as unknown as Response;

      const handler = router.stack[0].route.stack[0].handle;
      handler(mockReq, mockRes, vi.fn());

      expect(eventEmitter.subscriberCount).toBe(1);

      // Simulate connection close
      closeHandler!();

      expect(eventEmitter.subscriberCount).toBe(0);
    });

    it('should apply filters to streamed events', () => {
      const router = createEventsRouter(eventEmitter);

      const mockReq = {
        query: { status: 'pending' },
        headers: {},
        on: vi.fn(),
      } as unknown as Request;

      const writtenData: string[] = [];
      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((data: string) => {
          writtenData.push(data);
        }),
      } as unknown as Response;

      const handler = router.stack[0].route.stack[0].handle;
      handler(mockReq, mockRes, vi.fn());

      // Emit matching event
      const matchingEvent: A2AEvent<TaskEventData> = {
        id: 'matching',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Task',
          status: 'pending',
          owner: null,
          creator_platform: 'claude-code',
        },
      };
      eventEmitter.emit(matchingEvent);

      // Emit non-matching event
      const nonMatchingEvent: A2AEvent<TaskEventData> = {
        id: 'non-matching',
        type: 'task.claimed',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Task',
          status: 'in_progress',
          owner: 'agent-1',
          creator_platform: 'claude-code',
        },
      };
      eventEmitter.emit(nonMatchingEvent);

      // Only matching event should be written
      expect(writtenData.length).toBe(1);
      expect(writtenData[0]).toContain('id: matching');
    });
  });

  describe('matchesFilter', () => {
    const createTaskEvent = (overrides: Partial<TaskEventData> = {}): A2AEvent<TaskEventData> => ({
      id: 'test-event-1',
      type: 'task.created',
      timestamp: Date.now(),
      data: {
        taskId: 'task-1',
        subject: 'Test Task',
        status: 'pending',
        owner: null,
        creator_platform: 'claude-code',
        ...overrides,
      },
    });

    it('should return true when no filters specified', () => {
      const event = createTaskEvent();
      expect(matchesFilter(event, {})).toBe(true);
    });

    it('should filter by event type', () => {
      const event = createTaskEvent();
      expect(matchesFilter(event, { types: ['task.created'] })).toBe(true);
      expect(matchesFilter(event, { types: ['task.claimed'] })).toBe(false);
    });

    it('should filter by multiple event types', () => {
      const event = createTaskEvent();
      expect(matchesFilter(event, { types: ['task.created', 'task.claimed'] })).toBe(true);
      expect(matchesFilter(event, { types: ['task.completed', 'task.cancelled'] })).toBe(false);
    });

    it('should filter by status', () => {
      const event = createTaskEvent({ status: 'pending' });
      expect(matchesFilter(event, { status: 'pending' })).toBe(true);
      expect(matchesFilter(event, { status: 'in_progress' })).toBe(false);
    });

    it('should filter by platform', () => {
      const event = createTaskEvent({ creator_platform: 'claude-code' });
      expect(matchesFilter(event, { platform: 'claude-code' })).toBe(true);
      expect(matchesFilter(event, { platform: 'cursor' })).toBe(false);
    });

    it('should combine filters with AND logic', () => {
      const event = createTaskEvent({ status: 'pending', creator_platform: 'claude-code' });
      expect(matchesFilter(event, { status: 'pending', platform: 'claude-code' })).toBe(true);
      expect(matchesFilter(event, { status: 'pending', platform: 'cursor' })).toBe(false);
      expect(matchesFilter(event, { status: 'in_progress', platform: 'claude-code' })).toBe(false);
    });

    it('should combine type filter with status filter', () => {
      const event = createTaskEvent({ status: 'pending' });
      expect(matchesFilter(event, { types: ['task.created'], status: 'pending' })).toBe(true);
      expect(matchesFilter(event, { types: ['task.claimed'], status: 'pending' })).toBe(false);
    });

    it('should pass agent events through when no task-specific filters', () => {
      const agentEvent: A2AEvent<AgentEventData> = {
        id: 'agent-event-1',
        type: 'agent.registered',
        timestamp: Date.now(),
        data: {
          agentId: 'agent-1',
          platform: 'claude-code',
          skills: ['typescript'],
        },
      };
      expect(matchesFilter(agentEvent, {})).toBe(true);
      expect(matchesFilter(agentEvent, { types: ['agent.registered'] })).toBe(true);
    });

    it('should filter out agent events when type filter excludes them', () => {
      const agentEvent: A2AEvent<AgentEventData> = {
        id: 'agent-event-1',
        type: 'agent.registered',
        timestamp: Date.now(),
        data: {
          agentId: 'agent-1',
          platform: 'claude-code',
          skills: ['typescript'],
        },
      };
      expect(matchesFilter(agentEvent, { types: ['task.created'] })).toBe(false);
    });

    it('should not apply task-specific filters to agent events', () => {
      const agentEvent: A2AEvent<AgentEventData> = {
        id: 'agent-event-1',
        type: 'agent.registered',
        timestamp: Date.now(),
        data: {
          agentId: 'agent-1',
          platform: 'claude-code',
          skills: ['typescript'],
        },
      };
      // Agent events should pass through even when status filter is set
      // because status is a task-specific filter
      expect(matchesFilter(agentEvent, { status: 'pending' })).toBe(true);
    });

    it('should handle malformed JSON in metadata gracefully', () => {
      const event: A2AEvent<TaskEventData> = {
        id: 'test-1',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Test',
          status: 'pending',
          owner: null,
          creator_platform: 'claude-code',
          metadata: 'not-valid-json',
        },
      };
      // Should not throw, should pass through (no skills filter applied)
      expect(matchesFilter(event, { skills: ['typescript'] })).toBe(true);
    });
  });

  describe('formatSSE', () => {
    it('should format event as SSE message', () => {
      const event: A2AEvent<TaskEventData> = {
        id: 'test-123',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Test Task',
          status: 'pending',
          owner: null,
          creator_platform: 'claude-code',
        },
      };

      const formatted = formatSSE(event);

      expect(formatted).toContain('id: test-123');
      expect(formatted).toContain('event: task.created');
      expect(formatted).toContain('data: {');
      expect(formatted).toContain('"taskId":"task-1"');
      expect(formatted.endsWith('\n\n')).toBe(true);
    });

    it('should properly escape JSON in data field', () => {
      const event: A2AEvent<TaskEventData> = {
        id: 'test-escape',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-1',
          subject: 'Test "quoted" task',
          status: 'pending',
          owner: null,
          creator_platform: 'claude-code',
        },
      };

      const formatted = formatSSE(event);

      expect(formatted).toContain('Test \\"quoted\\" task');
    });
  });
});
