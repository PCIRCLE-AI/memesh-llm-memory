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
});
