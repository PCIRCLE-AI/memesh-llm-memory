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

    it('should allow different agents to have tasks simultaneously (per-agent limit)', async () => {
      // This tests IMPORTANT-2 fix: per-agent limit, not system-wide
      await delegator.addTask('task-1', 'task for agent 1', 'high', 'agent-1');
      await delegator.addTask('task-2', 'task for agent 2', 'high', 'agent-2');

      const pendingAgent1 = await delegator.getPendingTasks('agent-1');
      const pendingAgent2 = await delegator.getPendingTasks('agent-2');

      expect(pendingAgent1).toHaveLength(1);
      expect(pendingAgent2).toHaveLength(1);
      expect(pendingAgent1[0].taskId).toBe('task-1');
      expect(pendingAgent2[0].taskId).toBe('task-2');
    });

    it('should enforce per-agent task limit correctly', async () => {
      await delegator.addTask('task-1', 'task 1', 'high', 'agent-1');
      await delegator.addTask('task-2', 'task 2', 'high', 'agent-2');

      // agent-1 already has a task, should reject
      await expect(
        delegator.addTask('task-3', 'task 3', 'high', 'agent-1')
      ).rejects.toThrow('Agent already processing a task (Phase 1.0 limitation)');

      // agent-2 already has a task, should reject
      await expect(
        delegator.addTask('task-4', 'task 4', 'high', 'agent-2')
      ).rejects.toThrow('Agent already processing a task (Phase 1.0 limitation)');
    });

    it('should log task addition with agent ID', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[MCPTaskDelegator] Task added to delegation queue',
        { taskId: 'task-1', agentId: 'agent-1' }
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
      // Mock TaskQueue.updateTaskStatus
      mockQueue.updateTaskStatus = vi.fn().mockReturnValue(true);
    });

    it('should timeout tasks older than configured timeout', async () => {
      // Set timeout to minimum allowed value (5000ms) - values below this are clamped by getTaskTimeout()
      process.env.MEMESH_A2A_TASK_TIMEOUT = '5000';

      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      // Directly manipulate createdAt to simulate a task older than the timeout
      // This is deterministic and avoids flaky timing-dependent tests
      const taskInfo = delegator['pendingTasks'].get('task-1')!;
      taskInfo.createdAt = Date.now() - 6000; // 6s ago, exceeds 5s timeout

      await delegator.checkTimeouts();

      expect(mockQueue.updateTaskStatus).toHaveBeenCalledWith('task-1', {
        state: 'TIMEOUT',
        metadata: { error: expect.stringContaining('Task timeout detected') }
      });

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(0);

      // Cleanup
      delete process.env.MEMESH_A2A_TASK_TIMEOUT;
    });

    it('should not timeout recent tasks', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      await delegator.checkTimeouts();

      expect(mockQueue.updateTaskStatus).not.toHaveBeenCalled();

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(1);
    });

    it('should handle concurrent timeout checks safely (race condition fix)', async () => {
      // This tests CRITICAL-2 fix: collect-then-process pattern
      process.env.MEMESH_A2A_TASK_TIMEOUT = '5000';

      // Add multiple tasks for different agents
      await delegator.addTask('task-1', 'test 1', 'high', 'agent-1');
      await delegator.addTask('task-2', 'test 2', 'high', 'agent-2');

      // Directly manipulate createdAt to simulate tasks older than the timeout
      const task1 = delegator['pendingTasks'].get('task-1')!;
      const task2 = delegator['pendingTasks'].get('task-2')!;
      task1.createdAt = Date.now() - 6000;
      task2.createdAt = Date.now() - 6000;

      // Run concurrent timeout checks
      await Promise.all([
        delegator.checkTimeouts(),
        delegator.checkTimeouts(),
        delegator.checkTimeouts()
      ]);

      // Both tasks should be timed out
      expect(mockQueue.updateTaskStatus).toHaveBeenCalledWith('task-1', expect.any(Object));
      expect(mockQueue.updateTaskStatus).toHaveBeenCalledWith('task-2', expect.any(Object));

      // All tasks should be removed
      const pending1 = await delegator.getPendingTasks('agent-1');
      const pending2 = await delegator.getPendingTasks('agent-2');
      expect(pending1).toHaveLength(0);
      expect(pending2).toHaveLength(0);

      delete process.env.MEMESH_A2A_TASK_TIMEOUT;
    });

    it('should maintain transaction safety when DB update fails', async () => {
      // This tests IMPORTANT-3 fix: transaction safety
      process.env.MEMESH_A2A_TASK_TIMEOUT = '5000';

      // Mock updateTaskStatus to fail
      mockQueue.updateTaskStatus = vi.fn().mockReturnValue(false);

      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      // Directly manipulate createdAt to simulate a task older than the timeout
      const taskInfo = delegator['pendingTasks'].get('task-1')!;
      taskInfo.createdAt = Date.now() - 6000;

      await delegator.checkTimeouts();

      // Task should remain in pending queue since DB update failed
      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[MCPTaskDelegator] Failed to update timeout status for task',
        { taskId: 'task-1' }
      );

      delete process.env.MEMESH_A2A_TASK_TIMEOUT;
    });

    it('should handle exceptions during timeout processing gracefully', async () => {
      // This tests IMPORTANT-3 fix: error handling
      process.env.MEMESH_A2A_TASK_TIMEOUT = '5000';

      // Mock updateTaskStatus to throw exception
      mockQueue.updateTaskStatus = vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      // Directly manipulate createdAt to simulate a task older than the timeout
      const taskInfo = delegator['pendingTasks'].get('task-1')!;
      taskInfo.createdAt = Date.now() - 6000;

      // Should not throw, should handle gracefully
      await expect(delegator.checkTimeouts()).resolves.not.toThrow();

      // Task should remain in pending queue for retry
      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(1);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[MCPTaskDelegator] Error processing timeout',
        expect.objectContaining({
          taskId: 'task-1',
          error: 'Database connection failed'
        })
      );

      delete process.env.MEMESH_A2A_TASK_TIMEOUT;
    });
  });
});
