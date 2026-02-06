/**
 * @fileoverview Tests for TaskBoard event integration with A2AEventEmitter
 *
 * Tests that TaskBoard emits appropriate events when task lifecycle
 * operations are performed (create, claim, release, complete, cancel, delete).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskBoard } from '../TaskBoard.js';
import { A2AEventEmitter } from '../../events/A2AEventEmitter.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TaskBoard Event Integration', () => {
  let taskBoard: TaskBoard;
  let eventEmitter: A2AEventEmitter;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(os.tmpdir(), `test-taskboard-events-${Date.now()}.db`);
    eventEmitter = new A2AEventEmitter();
    taskBoard = new TaskBoard(testDbPath, eventEmitter);
  });

  afterEach(() => {
    taskBoard.close();
    eventEmitter.dispose();
    try { fs.unlinkSync(testDbPath); } catch { /* ignore */ }
    try { fs.unlinkSync(testDbPath + '-wal'); } catch { /* ignore */ }
    try { fs.unlinkSync(testDbPath + '-shm'); } catch { /* ignore */ }
  });

  describe('task.created event', () => {
    it('should emit task.created when task is created', () => {
      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      const taskId = taskBoard.createTask({
        subject: 'Test task',
        status: 'pending',
        creator_platform: 'claude-code',
      });

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.type).toBe('task.created');
      expect(event.data.taskId).toBe(taskId);
      expect(event.data.subject).toBe('Test task');
      expect(event.data.status).toBe('pending');
      expect(event.data.creator_platform).toBe('claude-code');
      expect(event.data.owner).toBeNull();
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should include owner in task.created event when provided', () => {
      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      taskBoard.createTask({
        subject: 'Owned task',
        status: 'in_progress',
        creator_platform: 'test',
        owner: 'agent-1',
      });

      const event = callback.mock.calls[0][0];
      expect(event.data.owner).toBe('agent-1');
    });
  });

  describe('task.claimed event', () => {
    it('should emit task.claimed when task is claimed', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      taskBoard.claimTask(taskId, 'agent-1');

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.type).toBe('task.claimed');
      expect(event.data.taskId).toBe(taskId);
      expect(event.data.owner).toBe('agent-1');
      expect(event.data.actor).toBe('agent-1');
      expect(event.data.status).toBe('in_progress');
    });
  });

  describe('task.released event', () => {
    it('should emit task.released when task is released', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.claimTask(taskId, 'agent-1');

      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      taskBoard.releaseTask(taskId);

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.type).toBe('task.released');
      expect(event.data.taskId).toBe(taskId);
      expect(event.data.status).toBe('pending');
      expect(event.data.owner).toBeNull();
    });
  });

  describe('task.completed event', () => {
    it('should emit task.completed when task is completed', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });
      taskBoard.claimTask(taskId, 'agent-1');

      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      taskBoard.completeTask(taskId, 'agent-1');

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.type).toBe('task.completed');
      expect(event.data.taskId).toBe(taskId);
      expect(event.data.status).toBe('completed');
      expect(event.data.actor).toBe('agent-1');
    });

    it('should throw when completing non-in_progress task', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      expect(() => {
        taskBoard.completeTask(taskId, 'agent-1');
      }).toThrow(/not in in_progress status/);
    });

    it('should throw when completing non-existent task', () => {
      expect(() => {
        taskBoard.completeTask('12345678-1234-4567-8901-234567890123', 'agent-1');
      }).toThrow('Task not found');
    });
  });

  describe('task.cancelled event', () => {
    it('should emit task.cancelled when task is cancelled', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      taskBoard.cancelTask(taskId, 'agent-1', 'Not needed');

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.type).toBe('task.cancelled');
      expect(event.data.taskId).toBe(taskId);
      expect(event.data.status).toBe('cancelled');
      expect(event.data.actor).toBe('agent-1');
    });
  });

  describe('task.deleted event', () => {
    it('should emit task.deleted when task is deleted', () => {
      const taskId = taskBoard.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      taskBoard.deleteTask(taskId);

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.type).toBe('task.deleted');
      expect(event.data.taskId).toBe(taskId);
    });
  });

  describe('no emitter provided', () => {
    it('should work without an emitter (no events emitted)', () => {
      const noEmitterDbPath = testDbPath + '-no-emitter';
      const boardWithoutEmitter = new TaskBoard(noEmitterDbPath);

      // Should not throw
      const taskId = boardWithoutEmitter.createTask({
        subject: 'Test',
        status: 'pending',
        creator_platform: 'test',
      });

      expect(taskId).toBeTruthy();

      // All operations should work without emitter
      boardWithoutEmitter.claimTask(taskId, 'agent-1');
      boardWithoutEmitter.releaseTask(taskId);
      boardWithoutEmitter.claimTask(taskId, 'agent-2');
      boardWithoutEmitter.completeTask(taskId, 'agent-2');

      const taskId2 = boardWithoutEmitter.createTask({
        subject: 'Test 2',
        status: 'pending',
        creator_platform: 'test',
      });
      boardWithoutEmitter.cancelTask(taskId2, 'agent-1');

      const taskId3 = boardWithoutEmitter.createTask({
        subject: 'Test 3',
        status: 'pending',
        creator_platform: 'test',
      });
      boardWithoutEmitter.deleteTask(taskId3);

      boardWithoutEmitter.close();
      try { fs.unlinkSync(noEmitterDbPath); } catch { /* ignore */ }
      try { fs.unlinkSync(noEmitterDbPath + '-wal'); } catch { /* ignore */ }
      try { fs.unlinkSync(noEmitterDbPath + '-shm'); } catch { /* ignore */ }
    });
  });

  describe('event data structure', () => {
    it('should include all required TaskEventData fields', () => {
      const callback = vi.fn();
      eventEmitter.subscribe(callback);

      const taskId = taskBoard.createTask({
        subject: 'Full Data Task',
        status: 'pending',
        creator_platform: 'test-platform',
        owner: 'initial-owner',
      });

      const event = callback.mock.calls[0][0];
      expect(event).toMatchObject({
        id: expect.any(String),
        type: 'task.created',
        timestamp: expect.any(Number),
        data: {
          taskId: taskId,
          subject: 'Full Data Task',
          status: 'pending',
          owner: 'initial-owner',
          creator_platform: 'test-platform',
        },
      });
    });
  });
});
