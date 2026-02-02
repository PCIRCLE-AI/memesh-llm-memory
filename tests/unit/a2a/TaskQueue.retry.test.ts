/**
 * TaskQueue Retry Mechanism Tests
 *
 * Tests SQLite busy timeout and concurrency handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskQueue } from '../../../src/a2a/storage/TaskQueue.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TaskQueue - Retry Mechanism', () => {
  let tempDir: string;
  let queue1: TaskQueue;
  let queue2: TaskQueue;
  const agentId = 'test-agent';

  beforeEach(() => {
    // Create temporary directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'taskqueue-retry-test-'));

    // Configure short busy timeout for faster tests
    process.env.DB_BUSY_TIMEOUT_MS = '1000';

    const dbPath = join(tempDir, 'test.db');
    queue1 = new TaskQueue(agentId, dbPath);
    queue2 = new TaskQueue(agentId, dbPath);
  });

  afterEach(() => {
    queue1.close();
    queue2.close();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DB_BUSY_TIMEOUT_MS;
  });

  describe('WAL mode and busy timeout', () => {
    it('should enable WAL mode for better concurrency', () => {
      const walMode = (queue1 as any).db.pragma('journal_mode', { simple: true });
      expect(walMode).toBe('wal');
    });

    it('should configure busy timeout from environment', () => {
      const busyTimeout = (queue1 as any).db.pragma('busy_timeout', { simple: true });
      // Should be 1000ms from beforeEach
      expect(busyTimeout).toBe(1000);
    });
  });

  describe('Concurrent writes', () => {
    it('should handle concurrent task creation from multiple connections', () => {
      // Create tasks concurrently from different queue instances
      const task1 = queue1.createTask({
        name: 'Task 1',
        description: 'First concurrent task',
        priority: 'normal',
      });

      const task2 = queue2.createTask({
        name: 'Task 2',
        description: 'Second concurrent task',
        priority: 'high',
      });

      expect(task1.id).toBeTruthy();
      expect(task2.id).toBeTruthy();
      expect(task1.id).not.toBe(task2.id);

      // Both tasks should be retrievable
      const retrieved1 = queue1.getTask(task1.id);
      const retrieved2 = queue2.getTask(task2.id);

      expect(retrieved1?.name).toBe('Task 1');
      expect(retrieved2?.name).toBe('Task 2');
    });

    it('should handle concurrent updates to different tasks', () => {
      const task1 = queue1.createTask({
        name: 'Task 1',
        priority: 'normal',
      });

      const task2 = queue2.createTask({
        name: 'Task 2',
        priority: 'normal',
      });

      // Update concurrently
      const updated1 = queue1.updateTaskStatus(task1.id, { state: 'WORKING' });
      const updated2 = queue2.updateTaskStatus(task2.id, { state: 'COMPLETED' });

      expect(updated1).toBe(true);
      expect(updated2).toBe(true);

      const retrieved1 = queue1.getTask(task1.id);
      const retrieved2 = queue2.getTask(task2.id);

      expect(retrieved1?.state).toBe('WORKING');
      expect(retrieved2?.state).toBe('COMPLETED');
    });

    it('should handle concurrent message additions', () => {
      const task = queue1.createTask({
        name: 'Test Task',
        priority: 'normal',
      });

      // Add messages concurrently from different connections
      const message1 = queue1.addMessage({
        taskId: task.id,
        role: 'user',
        parts: [{ type: 'text', text: 'Message 1' }],
      });

      const message2 = queue2.addMessage({
        taskId: task.id,
        role: 'assistant',
        parts: [{ type: 'text', text: 'Message 2' }],
      });

      expect(message1.id).toBeTruthy();
      expect(message2.id).toBeTruthy();
      expect(message1.id).not.toBe(message2.id);

      // Both messages should be in the task
      const messages = queue1.getMessages(task.id);
      expect(messages).toHaveLength(2);
      expect(messages.map((m) => m.id)).toContain(message1.id);
      expect(messages.map((m) => m.id)).toContain(message2.id);
    });
  });

  describe('Stress test - high concurrency', () => {
    it('should handle rapid concurrent operations without errors', () => {
      const taskCount = 20;
      const tasks: string[] = [];

      // Create multiple tasks rapidly
      for (let i = 0; i < taskCount; i++) {
        const queue = i % 2 === 0 ? queue1 : queue2;
        const task = queue.createTask({
          name: `Task ${i}`,
          priority: i % 3 === 0 ? 'high' : 'normal',
        });
        tasks.push(task.id);
      }

      expect(tasks).toHaveLength(taskCount);

      // Verify all tasks were created
      const allTasks = queue1.listTasks();
      expect(allTasks).toHaveLength(taskCount);

      // Update all tasks concurrently
      tasks.forEach((taskId, i) => {
        const queue = i % 2 === 0 ? queue1 : queue2;
        const updated = queue.updateTaskStatus(taskId, {
          state: i % 2 === 0 ? 'WORKING' : 'COMPLETED',
        });
        expect(updated).toBe(true);
      });

      // Verify updates
      const working = queue1.listTasks({ state: 'WORKING' });
      const completed = queue1.listTasks({ state: 'COMPLETED' });

      expect(working.length + completed.length).toBe(taskCount);
    });
  });

  describe('Default busy timeout', () => {
    it('should use default 5000ms timeout when env var not set', () => {
      delete process.env.DB_BUSY_TIMEOUT_MS;

      const tempDbPath = join(tempDir, 'default-timeout.db');
      const queueDefault = new TaskQueue('default-agent', tempDbPath);

      const timeout = (queueDefault as any).db.pragma('busy_timeout', { simple: true });
      expect(timeout).toBe(5000);

      queueDefault.close();
    });
  });

  describe('Task operations resilience', () => {
    it('should successfully update task even with concurrent reads', () => {
      const task = queue1.createTask({
        name: 'Test Task',
        priority: 'normal',
      });

      // Start concurrent reads
      for (let i = 0; i < 10; i++) {
        const retrieved = queue2.getTask(task.id);
        expect(retrieved?.id).toBe(task.id);
      }

      // Update should succeed despite concurrent reads
      const updated = queue1.updateTaskStatus(task.id, {
        state: 'COMPLETED',
        name: 'Updated Task',
      });

      expect(updated).toBe(true);

      const final = queue2.getTask(task.id);
      expect(final?.state).toBe('COMPLETED');
      expect(final?.name).toBe('Updated Task');
    });
  });
});
