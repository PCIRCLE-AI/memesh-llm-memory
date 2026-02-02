import { describe, it, expect, beforeEach, vi } from 'vitest';
import { a2aReportResult } from '../../../../src/mcp/tools/a2a-report-result.js';
import type { TaskQueue } from '../../../../src/a2a/storage/TaskQueue.js';
import type { MCPTaskDelegator } from '../../../../src/a2a/delegator/MCPTaskDelegator.js';

describe('a2a-report-result MCP tool', () => {
  let mockTaskQueue: TaskQueue;
  let mockDelegator: MCPTaskDelegator;

  beforeEach(() => {
    mockTaskQueue = {
      updateTaskStatus: vi.fn().mockReturnValue(true)
    } as any;

    mockDelegator = {
      removeTask: vi.fn().mockResolvedValue(undefined)
    } as any;
  });

  it('should update task status to COMPLETED on success', async () => {
    const result = await a2aReportResult(
      {
        taskId: 'task-123',
        result: 'Task completed successfully',
        success: true
      },
      mockTaskQueue,
      mockDelegator
    );

    expect(mockTaskQueue.updateTaskStatus).toHaveBeenCalledWith('task-123', {
      state: 'COMPLETED',
      metadata: {
        result: 'Task completed successfully',
        error: null,
        completedAt: expect.any(Number)
      }
    });

    expect(mockDelegator.removeTask).toHaveBeenCalledWith('task-123');

    expect(result.content[0].text).toContain('task-123');
    expect(result.content[0].text).toContain('COMPLETED');
  });

  it('should update task status to FAILED on failure', async () => {
    const result = await a2aReportResult(
      {
        taskId: 'task-456',
        result: '',
        success: false,
        error: 'Command not found'
      },
      mockTaskQueue,
      mockDelegator
    );

    expect(mockTaskQueue.updateTaskStatus).toHaveBeenCalledWith('task-456', {
      state: 'FAILED',
      metadata: {
        result: null,
        error: 'Command not found',
        completedAt: expect.any(Number)
      }
    });

    expect(mockDelegator.removeTask).toHaveBeenCalledWith('task-456');

    expect(result.content[0].text).toContain('FAILED');
  });

  it('should use default error message if not provided', async () => {
    await a2aReportResult(
      {
        taskId: 'task-789',
        result: '',
        success: false
      },
      mockTaskQueue,
      mockDelegator
    );

    expect(mockTaskQueue.updateTaskStatus).toHaveBeenCalledWith('task-789', {
      state: 'FAILED',
      metadata: {
        result: null,
        error: 'Task execution failed',
        completedAt: expect.any(Number)
      }
    });
  });
});
