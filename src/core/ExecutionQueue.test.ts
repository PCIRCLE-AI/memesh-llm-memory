/**
 * Unit tests for ExecutionQueue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionQueue } from './ExecutionQueue.js';
import { BackgroundTask } from './types.js';

describe('ExecutionQueue', () => {
  let queue: ExecutionQueue;

  beforeEach(() => {
    queue = new ExecutionQueue();
  });

  const createMockTask = (taskId: string, priority: 'high' | 'medium' | 'low'): BackgroundTask => ({
    taskId,
    status: 'queued',
    task: { description: `Task ${taskId}` },
    config: {
      mode: 'background',
      priority,
      resourceLimits: {
        maxCPU: 50,
        maxMemory: 1024,
        maxDuration: 300,
      },
    },
    startTime: new Date(),
  });

  describe('enqueue and dequeue', () => {
    it('should enqueue and dequeue a task', () => {
      const task = createMockTask('task-1', 'medium');

      queue.enqueue(task);
      expect(queue.size()).toBe(1);

      const dequeued = queue.dequeue();
      expect(dequeued).toEqual(task);
      expect(queue.size()).toBe(0);
    });

    it('should return undefined when dequeuing from empty queue', () => {
      const dequeued = queue.dequeue();
      expect(dequeued).toBeUndefined();
    });

    it('should respect priority order (high > medium > low)', () => {
      const lowTask = createMockTask('low-1', 'low');
      const mediumTask = createMockTask('medium-1', 'medium');
      const highTask = createMockTask('high-1', 'high');

      // Enqueue in reverse priority order
      queue.enqueue(lowTask);
      queue.enqueue(mediumTask);
      queue.enqueue(highTask);

      // Should dequeue in priority order
      expect(queue.dequeue()?.taskId).toBe('high-1');
      expect(queue.dequeue()?.taskId).toBe('medium-1');
      expect(queue.dequeue()?.taskId).toBe('low-1');
    });

    it('should respect FIFO within same priority', () => {
      const task1 = createMockTask('task-1', 'medium');
      const task2 = createMockTask('task-2', 'medium');
      const task3 = createMockTask('task-3', 'medium');

      queue.enqueue(task1);
      queue.enqueue(task2);
      queue.enqueue(task3);

      expect(queue.dequeue()?.taskId).toBe('task-1');
      expect(queue.dequeue()?.taskId).toBe('task-2');
      expect(queue.dequeue()?.taskId).toBe('task-3');
    });
  });

  describe('peek', () => {
    it('should peek at next task without removing it', () => {
      const task = createMockTask('task-1', 'high');

      queue.enqueue(task);
      expect(queue.size()).toBe(1);

      const peeked = queue.peek();
      expect(peeked).toEqual(task);
      expect(queue.size()).toBe(1); // Should not be removed
    });

    it('should return undefined when peeking at empty queue', () => {
      const peeked = queue.peek();
      expect(peeked).toBeUndefined();
    });

    it('should peek at highest priority task', () => {
      queue.enqueue(createMockTask('low-1', 'low'));
      queue.enqueue(createMockTask('high-1', 'high'));
      queue.enqueue(createMockTask('medium-1', 'medium'));

      const peeked = queue.peek();
      expect(peeked?.taskId).toBe('high-1');
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should return correct size', () => {
      queue.enqueue(createMockTask('task-1', 'high'));
      queue.enqueue(createMockTask('task-2', 'medium'));
      queue.enqueue(createMockTask('task-3', 'low'));

      expect(queue.size()).toBe(3);
      expect(queue.isEmpty()).toBe(false);
    });

    it('should return size by priority', () => {
      queue.enqueue(createMockTask('high-1', 'high'));
      queue.enqueue(createMockTask('high-2', 'high'));
      queue.enqueue(createMockTask('medium-1', 'medium'));
      queue.enqueue(createMockTask('low-1', 'low'));

      expect(queue.sizeByPriority('high')).toBe(2);
      expect(queue.sizeByPriority('medium')).toBe(1);
      expect(queue.sizeByPriority('low')).toBe(1);
    });
  });

  describe('remove', () => {
    it('should remove a task by ID', () => {
      queue.enqueue(createMockTask('task-1', 'high'));
      queue.enqueue(createMockTask('task-2', 'medium'));
      queue.enqueue(createMockTask('task-3', 'low'));

      expect(queue.size()).toBe(3);

      const removed = queue.remove('task-2');
      expect(removed).toBe(true);
      expect(queue.size()).toBe(2);

      // Verify task-2 is gone
      expect(queue.findTask('task-2')).toBeUndefined();
    });

    it('should return false when removing non-existent task', () => {
      queue.enqueue(createMockTask('task-1', 'high'));

      const removed = queue.remove('non-existent');
      expect(removed).toBe(false);
      expect(queue.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all tasks', () => {
      queue.enqueue(createMockTask('task-1', 'high'));
      queue.enqueue(createMockTask('task-2', 'medium'));
      queue.enqueue(createMockTask('task-3', 'low'));

      expect(queue.size()).toBe(3);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks in priority order', () => {
      queue.enqueue(createMockTask('low-1', 'low'));
      queue.enqueue(createMockTask('high-1', 'high'));
      queue.enqueue(createMockTask('medium-1', 'medium'));
      queue.enqueue(createMockTask('high-2', 'high'));

      const allTasks = queue.getAllTasks();

      expect(allTasks.length).toBe(4);
      // Should be ordered by priority
      expect(allTasks[0].taskId).toBe('high-1');
      expect(allTasks[1].taskId).toBe('high-2');
      expect(allTasks[2].taskId).toBe('medium-1');
      expect(allTasks[3].taskId).toBe('low-1');
    });
  });

  describe('findTask', () => {
    it('should find a task by ID', () => {
      const task = createMockTask('task-1', 'medium');
      queue.enqueue(task);

      const found = queue.findTask('task-1');
      expect(found).toEqual(task);
    });

    it('should return undefined for non-existent task', () => {
      queue.enqueue(createMockTask('task-1', 'medium'));

      const found = queue.findTask('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      queue.enqueue(createMockTask('high-1', 'high'));
      queue.enqueue(createMockTask('high-2', 'high'));
      queue.enqueue(createMockTask('medium-1', 'medium'));
      queue.enqueue(createMockTask('low-1', 'low'));

      const stats = queue.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed priority operations', () => {
      // Add tasks of different priorities
      queue.enqueue(createMockTask('low-1', 'low'));
      queue.enqueue(createMockTask('high-1', 'high'));
      queue.enqueue(createMockTask('medium-1', 'medium'));
      queue.enqueue(createMockTask('high-2', 'high'));
      queue.enqueue(createMockTask('low-2', 'low'));

      expect(queue.size()).toBe(5);

      // Dequeue should get high priority first
      expect(queue.dequeue()?.taskId).toBe('high-1');
      expect(queue.dequeue()?.taskId).toBe('high-2');

      // Add another high priority task
      queue.enqueue(createMockTask('high-3', 'high'));

      // Should get the new high priority task next
      expect(queue.dequeue()?.taskId).toBe('high-3');

      // Then medium
      expect(queue.dequeue()?.taskId).toBe('medium-1');

      // Then low (FIFO)
      expect(queue.dequeue()?.taskId).toBe('low-1');
      expect(queue.dequeue()?.taskId).toBe('low-2');

      expect(queue.isEmpty()).toBe(true);
    });
  });
});
