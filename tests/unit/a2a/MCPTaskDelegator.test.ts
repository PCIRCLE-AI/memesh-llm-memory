import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPTaskDelegator } from '../../../src/a2a/delegator/MCPTaskDelegator.js';
import type { TaskQueue } from '../../../src/a2a/storage/TaskQueue.js';
import type { Logger } from '../../../src/utils/logger.js';

describe('MCPTaskDelegator', () => {
  let delegator: MCPTaskDelegator;
  let mockQueue: TaskQueue;
  let mockLogger: Logger;

  beforeEach(() => {
    mockQueue = {} as TaskQueue;
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;
    delegator = new MCPTaskDelegator(mockQueue, mockLogger);
  });

  describe('addTask', () => {
    it('should add task to pending queue', async () => {
      await delegator.addTask('task-1', 'test task', 'high', 'agent-1');

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        taskId: 'task-1',
        task: 'test task',
        priority: 'high',
        agentId: 'agent-1',
        status: 'PENDING'
      });
      expect(pending[0].createdAt).toBeGreaterThan(0);
    });

    it('should throw error when agent already has a task (Phase 1.0)', async () => {
      await delegator.addTask('task-1', 'task 1', 'high', 'agent-1');

      await expect(
        delegator.addTask('task-2', 'task 2', 'high', 'agent-1')
      ).rejects.toThrow('Agent already processing a task (Phase 1.0 limitation)');
    });

    it('should log task addition', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task added to delegation queue: task-1')
      );
    });
  });

  describe('removeTask', () => {
    it('should remove task from pending queue', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');
      await delegator.removeTask('task-1');

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(0);
    });

    it('should not throw if task not found', async () => {
      await expect(
        delegator.removeTask('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('markTaskInProgress', () => {
    it('should update task status to IN_PROGRESS', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');
      await delegator.markTaskInProgress('task-1');

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(0); // IN_PROGRESS tasks not returned

      // Verify task exists but with different status
      const allTasks = Array.from(delegator['pendingTasks'].values());
      expect(allTasks[0].status).toBe('IN_PROGRESS');
    });
  });

  describe('checkTimeouts', () => {
    beforeEach(() => {
      // Mock TaskQueue.updateTask
      mockQueue.updateTask = vi.fn().mockResolvedValue(undefined);
    });

    it('should timeout tasks older than configured timeout', async () => {
      // Set timeout to 1ms for testing
      process.env.MEMESH_A2A_TASK_TIMEOUT = '1';

      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      // Wait 10ms
      await new Promise(resolve => setTimeout(resolve, 10));

      await delegator.checkTimeouts();

      expect(mockQueue.updateTask).toHaveBeenCalledWith('task-1', {
        status: 'TIMEOUT',
        error: expect.stringContaining('Task execution timeout'),
        completedAt: expect.any(Number)
      });

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(0);

      // Cleanup
      delete process.env.MEMESH_A2A_TASK_TIMEOUT;
    });

    it('should not timeout recent tasks', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      await delegator.checkTimeouts();

      expect(mockQueue.updateTask).not.toHaveBeenCalled();

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(1);
    });
  });
});
