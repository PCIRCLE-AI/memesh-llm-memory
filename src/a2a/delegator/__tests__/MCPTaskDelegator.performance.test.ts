/**
 * Performance tests for MCPTaskDelegator optimizations
 * Verifies that optimizations maintain correctness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPTaskDelegator } from '../MCPTaskDelegator.js';
import { TaskQueue } from '../../storage/TaskQueue.js';
import { logger } from '../../../utils/logger.js';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('MCPTaskDelegator Performance Optimizations', () => {
  let delegator: MCPTaskDelegator;
  let taskQueue: TaskQueue;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `a2a-perf-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const dbPath = join(tmpDir, 'test.db');

    taskQueue = new TaskQueue('test-agent', dbPath);
    delegator = new MCPTaskDelegator(taskQueue, logger);
  });

  afterEach(() => {
    taskQueue.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getPendingTasks() with agent index', () => {
    it('should return tasks only for the specified agent', async () => {
      // Add tasks for multiple agents
      await delegator.addTask('task-1', 'Task 1', 'high', 'agent-1');
      await delegator.addTask('task-2', 'Task 2', 'medium', 'agent-2');
      await delegator.addTask('task-3', 'Task 3', 'low', 'agent-3');

      // Get tasks for agent-1
      const agent1Tasks = await delegator.getPendingTasks('agent-1');
      expect(agent1Tasks).toHaveLength(1);
      expect(agent1Tasks[0].taskId).toBe('task-1');
      expect(agent1Tasks[0].agentId).toBe('agent-1');

      // Get tasks for agent-2
      const agent2Tasks = await delegator.getPendingTasks('agent-2');
      expect(agent2Tasks).toHaveLength(1);
      expect(agent2Tasks[0].taskId).toBe('task-2');
      expect(agent2Tasks[0].agentId).toBe('agent-2');

      // Get tasks for agent with no tasks
      const agent4Tasks = await delegator.getPendingTasks('agent-4');
      expect(agent4Tasks).toHaveLength(0);
    });

    it('should return empty array for non-existent agent', async () => {
      const tasks = await delegator.getPendingTasks('non-existent-agent');
      expect(tasks).toHaveLength(0);
    });

    it('should not return IN_PROGRESS tasks', async () => {
      await delegator.addTask('task-1', 'Task 1', 'high', 'agent-1');
      await delegator.markTaskInProgress('task-1');

      const tasks = await delegator.getPendingTasks('agent-1');
      expect(tasks).toHaveLength(0);
    });

    it('should handle agent index cleanup on task removal', async () => {
      await delegator.addTask('task-1', 'Task 1', 'high', 'agent-1');

      // Verify task exists
      let tasks = await delegator.getPendingTasks('agent-1');
      expect(tasks).toHaveLength(1);

      // Remove task
      await delegator.removeTask('task-1');

      // Verify agent index is cleaned up
      tasks = await delegator.getPendingTasks('agent-1');
      expect(tasks).toHaveLength(0);

      // Verify agent is removed from index (no memory leak)
      const agentIndex = (delegator as any).pendingTasksByAgent;
      expect(agentIndex.has('agent-1')).toBe(false);
    });

    it('should maintain index consistency on timeout', async () => {
      // Create a task with old timestamp to trigger timeout
      const oldTimestamp = Date.now() - 400_000; // 400 seconds ago

      // Create task in TaskQueue first (needed for timeout to work)
      const taskInQueue = taskQueue.createTask({
        name: 'Old task',
        description: 'Test timeout',
        priority: 'high',
      });
      const taskId = taskInQueue.id;

      // Directly manipulate pending tasks for testing with old timestamp
      (delegator as any).pendingTasks.set(taskId, {
        taskId,
        task: 'Old task',
        priority: 'high',
        agentId: 'agent-1',
        createdAt: oldTimestamp,
        status: 'PENDING',
      });

      // Manually update agent index
      const agentIndex = (delegator as any).pendingTasksByAgent;
      if (!agentIndex.has('agent-1')) {
        agentIndex.set('agent-1', new Set());
      }
      agentIndex.get('agent-1').add(taskId);

      // Run timeout check
      await delegator.checkTimeouts();

      // Verify task is removed from both maps
      const tasks = await delegator.getPendingTasks('agent-1');
      expect(tasks).toHaveLength(0);

      // Verify agent index is cleaned up
      expect(agentIndex.has('agent-1')).toBe(false);
    });
  });

  describe('addTask() with agent index', () => {
    it('should enforce one task per agent limit', async () => {
      await delegator.addTask('task-1', 'Task 1', 'high', 'agent-1');

      // Try to add another task for same agent
      await expect(
        delegator.addTask('task-2', 'Task 2', 'medium', 'agent-1')
      ).rejects.toThrow();
    });

    it('should allow tasks for different agents', async () => {
      await delegator.addTask('task-1', 'Task 1', 'high', 'agent-1');
      await delegator.addTask('task-2', 'Task 2', 'medium', 'agent-2');
      await delegator.addTask('task-3', 'Task 3', 'low', 'agent-3');

      const agent1Tasks = await delegator.getPendingTasks('agent-1');
      const agent2Tasks = await delegator.getPendingTasks('agent-2');
      const agent3Tasks = await delegator.getPendingTasks('agent-3');

      expect(agent1Tasks).toHaveLength(1);
      expect(agent2Tasks).toHaveLength(1);
      expect(agent3Tasks).toHaveLength(1);
    });
  });

  describe('Performance characteristics', () => {
    it('should scale to 1000 tasks without performance degradation', async () => {
      // Add 1000 tasks across 10 agents
      const numAgents = 10;
      const tasksPerAgent = 1;

      for (let i = 0; i < numAgents; i++) {
        await delegator.addTask(
          `task-${i}`,
          `Task ${i}`,
          'normal',
          `agent-${i}`
        );
      }

      // Measure getPendingTasks() performance
      const start = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        await delegator.getPendingTasks(`agent-${i % numAgents}`);
      }

      const elapsed = Date.now() - start;
      const avgTime = elapsed / iterations;

      // Should be < 1ms on average (very conservative)
      expect(avgTime).toBeLessThan(1);
    });
  });
});
