/**
 * Task Scheduler Tests
 *
 * Tests for task scheduling logic, queue management, and resource-aware dispatch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskScheduler } from '../TaskScheduler.js';
import { ResourceMonitor } from '../ResourceMonitor.js';
import { BackgroundTask, DEFAULT_EXECUTION_CONFIG } from '../types.js';

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;
  let resourceMonitor: ResourceMonitor;

  beforeEach(() => {
    resourceMonitor = new ResourceMonitor();

    // Mock canRunBackgroundTask to always allow execution by default
    vi.spyOn(resourceMonitor, 'canRunBackgroundTask').mockReturnValue({
      canExecute: true,
      resources: {
        cpu: { usage: 0.3, limit: 0.7, available: true },
        memory: {
          total: 16000,
          used: 4000,
          free: 12000,
          available: 12000,
          usagePercent: 25,
          limit: 8192,
        },
        concurrentAgents: { current: 0, max: 6, available: true },
        activeBackgroundAgents: 0,
      },
    });

    scheduler = new TaskScheduler(resourceMonitor);
  });

  describe('enqueue', () => {
    it('should enqueue task', () => {
      const task: BackgroundTask = {
        taskId: 'task-1',
        status: 'queued',
        task: async () => 'result',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(task);

      expect(scheduler.size()).toBe(1);
    });

    it('should maintain priority order', () => {
      const lowTask: BackgroundTask = {
        taskId: 'low',
        status: 'queued',
        task: async () => 'low',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'low' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      const highTask: BackgroundTask = {
        taskId: 'high',
        status: 'queued',
        task: async () => 'high',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(lowTask);
      scheduler.enqueue(highTask);

      const next = scheduler.peek();
      expect(next?.taskId).toBe('high');
    });
  });

  describe('getNextTask', () => {
    it('should return undefined when queue is empty', () => {
      const next = scheduler.getNextTask();
      expect(next).toBeUndefined();
    });

    it('should return task when resources available', () => {
      const task: BackgroundTask = {
        taskId: 'task-1',
        status: 'queued',
        task: async () => 'result',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(task);

      const next = scheduler.getNextTask();
      expect(next?.taskId).toBe('task-1');
      expect(scheduler.size()).toBe(0);
    });

    it('should return undefined when resources unavailable', () => {
      // Override mock to deny execution
      vi.spyOn(resourceMonitor, 'canRunBackgroundTask').mockReturnValueOnce({
        canExecute: false,
        reason: 'Max concurrent background agents reached',
        suggestion: 'Wait for running tasks to complete',
        resources: {
          cpu: { usage: 0.5, limit: 0.7, available: true },
          memory: { usage: 0.4, limit: 0.8, available: true },
          concurrentAgents: { current: 5, max: 5, available: false },
        },
      });

      const task: BackgroundTask = {
        taskId: 'task-1',
        status: 'queued',
        task: async () => 'result',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(task);

      const next = scheduler.getNextTask();
      expect(next).toBeUndefined();
      expect(scheduler.size()).toBe(1); // Task remains in queue
    });

    it('should return highest priority task first', () => {
      const tasks = [
        {
          taskId: 'low-1',
          status: 'queued' as const,
          task: async () => 'low',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'low' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
        {
          taskId: 'medium-1',
          status: 'queued' as const,
          task: async () => 'medium',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
        {
          taskId: 'high-1',
          status: 'queued' as const,
          task: async () => 'high',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
      ];

      tasks.forEach(task => scheduler.enqueue(task));

      const next = scheduler.getNextTask();
      expect(next?.taskId).toBe('high-1');
    });
  });

  describe('peek', () => {
    it('should return next task without removing it', () => {
      const task: BackgroundTask = {
        taskId: 'task-1',
        status: 'queued',
        task: async () => 'result',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(task);

      const peeked = scheduler.peek();
      expect(peeked?.taskId).toBe('task-1');
      expect(scheduler.size()).toBe(1); // Not removed
    });

    it('should return undefined when queue is empty', () => {
      const peeked = scheduler.peek();
      expect(peeked).toBeUndefined();
    });
  });

  describe('removeTask', () => {
    it('should remove task from queue', () => {
      const task: BackgroundTask = {
        taskId: 'task-1',
        status: 'queued',
        task: async () => 'result',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(task);
      expect(scheduler.size()).toBe(1);

      const removed = scheduler.removeTask('task-1');
      expect(removed).toBe(true);
      expect(scheduler.size()).toBe(0);
    });

    it('should return false for non-existent task', () => {
      const removed = scheduler.removeTask('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return true when queue is empty', () => {
      expect(scheduler.isEmpty()).toBe(true);
    });

    it('should return false when queue has tasks', () => {
      const task: BackgroundTask = {
        taskId: 'task-1',
        status: 'queued',
        task: async () => 'result',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(task);
      expect(scheduler.isEmpty()).toBe(false);
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(scheduler.size()).toBe(0);
    });

    it('should return correct size', () => {
      const tasks = [1, 2, 3].map(i => ({
        taskId: `task-${i}`,
        status: 'queued' as const,
        task: async () => `result-${i}`,
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' as const },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      }));

      tasks.forEach(task => scheduler.enqueue(task));
      expect(scheduler.size()).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', () => {
      const tasks = [
        {
          taskId: 'high-1',
          status: 'queued' as const,
          task: async () => 'high',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
        {
          taskId: 'high-2',
          status: 'queued' as const,
          task: async () => 'high',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
        {
          taskId: 'medium-1',
          status: 'queued' as const,
          task: async () => 'medium',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
        {
          taskId: 'low-1',
          status: 'queued' as const,
          task: async () => 'low',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'low' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
      ];

      tasks.forEach(task => scheduler.enqueue(task));

      const stats = scheduler.getStats();
      expect(stats.total).toBe(4);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks ordered by priority', () => {
      const tasks = [
        {
          taskId: 'low-1',
          status: 'queued' as const,
          task: async () => 'low',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'low' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
        {
          taskId: 'high-1',
          status: 'queued' as const,
          task: async () => 'high',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'high' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
        {
          taskId: 'medium-1',
          status: 'queued' as const,
          task: async () => 'medium',
          config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' as const },
          startTime: new Date(),
          progress: { progress: 0, currentStage: 'queued' },
        },
      ];

      tasks.forEach(task => scheduler.enqueue(task));

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(3);
      expect(allTasks[0].taskId).toBe('high-1');
      expect(allTasks[1].taskId).toBe('medium-1');
      expect(allTasks[2].taskId).toBe('low-1');
    });
  });

  describe('findTask', () => {
    it('should find task by ID', () => {
      const task: BackgroundTask = {
        taskId: 'task-1',
        status: 'queued',
        task: async () => 'result',
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      };

      scheduler.enqueue(task);

      const found = scheduler.findTask('task-1');
      expect(found?.taskId).toBe('task-1');
    });

    it('should return undefined for non-existent task', () => {
      const found = scheduler.findTask('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all tasks', () => {
      const tasks = [1, 2, 3].map(i => ({
        taskId: `task-${i}`,
        status: 'queued' as const,
        task: async () => `result-${i}`,
        config: { ...DEFAULT_EXECUTION_CONFIG, priority: 'medium' as const },
        startTime: new Date(),
        progress: { progress: 0, currentStage: 'queued' },
      }));

      tasks.forEach(task => scheduler.enqueue(task));
      expect(scheduler.size()).toBe(3);

      scheduler.clear();
      expect(scheduler.size()).toBe(0);
      expect(scheduler.isEmpty()).toBe(true);
    });
  });
});
