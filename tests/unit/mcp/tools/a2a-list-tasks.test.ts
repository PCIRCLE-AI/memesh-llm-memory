import { describe, it, expect, beforeEach, vi } from 'vitest';
import { a2aListTasks } from '../../../../src/mcp/tools/a2a-list-tasks.js';
import type { MCPTaskDelegator } from '../../../../src/a2a/delegator/MCPTaskDelegator.js';

describe('a2a-list-tasks MCP tool', () => {
  let mockDelegator: MCPTaskDelegator;

  beforeEach(() => {
    mockDelegator = {
      getPendingTasks: vi.fn().mockResolvedValue([
        {
          taskId: 'task-1',
          task: 'test task 1',
          priority: 'high',
          agentId: 'agent-1',
          createdAt: Date.now(),
          status: 'PENDING'
        },
        {
          taskId: 'task-2',
          task: 'test task 2',
          priority: 'medium',
          agentId: 'agent-1',
          createdAt: Date.now(),
          status: 'PENDING'
        }
      ])
    } as any;
  });

  it('should return pending tasks for agent', async () => {
    const result = await a2aListTasks(
      { agentId: 'agent-1' },
      mockDelegator
    );

    expect(mockDelegator.getPendingTasks).toHaveBeenCalledWith('agent-1');

    const tasks = JSON.parse(result.content[0].text);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].taskId).toBe('task-1');
    expect(tasks[1].taskId).toBe('task-2');
  });

  it('should return empty array if no pending tasks', async () => {
    mockDelegator.getPendingTasks = vi.fn().mockResolvedValue([]);

    const result = await a2aListTasks(
      { agentId: 'agent-1' },
      mockDelegator
    );

    const tasks = JSON.parse(result.content[0].text);
    expect(tasks).toHaveLength(0);
  });
});
