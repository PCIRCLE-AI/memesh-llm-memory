import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskExecutor } from '../../../src/a2a/executor/TaskExecutor.js';
import type { MCPTaskDelegator } from '../../../src/a2a/delegator/MCPTaskDelegator.js';
import type { TaskQueue } from '../../../src/a2a/storage/TaskQueue.js';
import type { Logger } from '../../../src/utils/logger.js';

describe('TaskExecutor (Phase 1.0)', () => {
  let executor: TaskExecutor;
  let mockDelegator: MCPTaskDelegator;
  let mockQueue: TaskQueue;
  let mockLogger: Logger;

  beforeEach(() => {
    mockDelegator = {
      addTask: vi.fn().mockResolvedValue(undefined)
    } as any;

    mockQueue = {} as TaskQueue;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    executor = new TaskExecutor(mockQueue, mockLogger, mockDelegator);
  });

  describe('executeTask', () => {
    it('should delegate task to MCPTaskDelegator', async () => {
      await executor.executeTask('task-1', 'test task', 'agent-1');

      expect(mockDelegator.addTask).toHaveBeenCalledWith(
        'task-1',
        'test task',
        'medium', // default priority
        'agent-1'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task delegated to MCP Client: task-1')
      );
    });

    it('should not call generateEchoResponse (Phase 0.5 removed)', () => {
      // Verify old method doesn't exist
      expect((executor as any).generateEchoResponse).toBeUndefined();
    });

    it('should throw error if delegation fails', async () => {
      mockDelegator.addTask = vi.fn().mockRejectedValue(
        new Error('Agent busy')
      );

      await expect(
        executor.executeTask('task-1', 'test', 'agent-1')
      ).rejects.toThrow('Agent busy');
    });
  });
});
