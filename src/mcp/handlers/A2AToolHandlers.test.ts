/**
 * A2A Tool Handlers Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { A2AToolHandlers } from './A2AToolHandlers.js';
import { A2AClient } from '../../a2a/client/A2AClient.js';
import { AgentRegistry } from '../../a2a/storage/AgentRegistry.js';
import type { Task, TaskStatus } from '../../a2a/types/index.js';

describe('A2AToolHandlers', () => {
  let handlers: A2AToolHandlers;
  let mockClient: any;
  let mockRegistry: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      sendMessage: vi.fn(),
      getTask: vi.fn(),
      listTasks: vi.fn(),
      listAvailableAgents: vi.fn(),
    } as unknown as A2AClient;

    // Create mock registry
    mockRegistry = {
      listActive: vi.fn(),
      get: vi.fn(),
    } as unknown as AgentRegistry;

    // Create handlers with mocked dependencies
    handlers = new A2AToolHandlers(mockClient, mockRegistry);
  });

  describe('handleA2ASendTask', () => {
    it('should send task to target agent successfully', async () => {
      const mockSendResponse = {
        taskId: 'task-123',
        status: 'SUBMITTED',
      };

      const mockTask: Task = {
        id: 'task-123',
        state: 'SUBMITTED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        name: 'Build React component',
        description: 'Build a React component',
        priority: 'normal',
        messages: [],
        artifacts: [],
      };

      mockClient.sendMessage.mockResolvedValue(mockSendResponse);
      mockClient.getTask.mockResolvedValue(mockTask);

      const args = {
        targetAgentId: 'agent-1',
        taskDescription: 'Build a React component',
        priority: 'normal' as const,
      };

      const result = await handlers.handleA2ASendTask(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      if (result.content[0].type === 'text') {
        const text = result.content[0].text;
        expect(text).toContain('✅ Task sent to agent: agent-1');
        expect(text).toContain('Task ID: task-123');
        expect(text).toContain('State: SUBMITTED');
      }

      expect(mockClient.sendMessage).toHaveBeenCalledWith('agent-1', {
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Build a React component',
            },
          ],
        },
      });

      expect(mockClient.getTask).toHaveBeenCalledWith('agent-1', 'task-123');
    });

    it('should handle send task error', async () => {
      mockClient.sendMessage.mockRejectedValue(new Error('Agent not found: agent-1'));

      const args = {
        targetAgentId: 'agent-1',
        taskDescription: 'Build a React component',
      };

      await expect(handlers.handleA2ASendTask(args)).rejects.toThrow('Agent not found: agent-1');
    });

    it('should handle validation error', async () => {
      const args = {
        targetAgentId: '',
        taskDescription: 'Build a React component',
      };

      await expect(handlers.handleA2ASendTask(args)).rejects.toThrow();
    });
  });

  describe('handleA2AGetTask', () => {
    it('should get task from target agent successfully', async () => {
      const mockTask: Task = {
        id: 'task-123',
        state: 'WORKING',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
        name: 'Build React component',
        description: 'Build a React component',
        priority: 'normal',
        messages: [
          {
            id: 'msg-1',
            taskId: 'task-123',
            role: 'user',
            parts: [{ type: 'text', text: 'Build a React component' }],
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        artifacts: [],
      };

      mockClient.getTask.mockResolvedValue(mockTask);

      const args = {
        targetAgentId: 'agent-1',
        taskId: 'task-123',
      };

      const result = await handlers.handleA2AGetTask(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      if (result.content[0].type === 'text') {
        const text = result.content[0].text;
        expect(text).toContain('Task ID: task-123');
        expect(text).toContain('State: WORKING');
        expect(text).toContain('Messages: 1');
      }

      expect(mockClient.getTask).toHaveBeenCalledWith('agent-1', 'task-123');
    });

    it('should handle get task error', async () => {
      mockClient.getTask.mockRejectedValue(new Error('Task not found: task-123'));

      const args = {
        targetAgentId: 'agent-1',
        taskId: 'task-123',
      };

      await expect(handlers.handleA2AGetTask(args)).rejects.toThrow('Task not found: task-123');
    });
  });

  describe('handleA2AListTasks', () => {
    it('should list all tasks when no filter provided', async () => {
      const mockTasks: TaskStatus[] = [
        {
          id: 'task-1',
          state: 'WORKING',
          name: 'Task 1',
          priority: 'normal',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:01:00Z',
          messageCount: 2,
          artifactCount: 0,
        },
        {
          id: 'task-2',
          state: 'COMPLETED',
          name: 'Task 2',
          priority: 'high',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:05:00Z',
          messageCount: 5,
          artifactCount: 2,
        },
      ];

      mockClient.listTasks.mockResolvedValue(mockTasks);

      const args = {};

      const result = await handlers.handleA2AListTasks(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      if (result.content[0].type === 'text') {
        const text = result.content[0].text;
        expect(text).toContain('📋 Own Tasks (2 total)');
        expect(text).toContain('task-1');
        expect(text).toContain('task-2');
        expect(text).toContain('WORKING');
        expect(text).toContain('COMPLETED');
      }

      expect(mockClient.listTasks).toHaveBeenCalledWith('self', {});
    });

    it('should list tasks with state filter', async () => {
      const mockTasks: TaskStatus[] = [
        {
          id: 'task-1',
          state: 'WORKING',
          name: 'Task 1',
          priority: 'normal',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:01:00Z',
          messageCount: 2,
          artifactCount: 0,
        },
      ];

      mockClient.listTasks.mockResolvedValue(mockTasks);

      const args = {
        state: 'WORKING' as const,
      };

      const result = await handlers.handleA2AListTasks(args);

      expect(result.content).toHaveLength(1);
      expect(mockClient.listTasks).toHaveBeenCalledWith('self', { status: 'WORKING' });
    });

    it('should handle empty task list', async () => {
      mockClient.listTasks.mockResolvedValue([]);

      const args = {};

      const result = await handlers.handleA2AListTasks(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('No tasks found');
      }
    });
  });

  describe('handleA2AListAgents', () => {
    it('should list all active agents when no filter provided', async () => {
      mockRegistry.listActive.mockReturnValue([
        {
          agentId: 'agent-1',
          baseUrl: 'http://localhost:3001',
          port: 3001,
          status: 'active',
          lastHeartbeat: '2024-01-01T00:00:00Z',
        },
        {
          agentId: 'agent-2',
          baseUrl: 'http://localhost:3002',
          port: 3002,
          status: 'active',
          lastHeartbeat: '2024-01-01T00:00:00Z',
        },
      ]);

      const args = {};

      const result = await handlers.handleA2AListAgents(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      if (result.content[0].type === 'text') {
        const text = result.content[0].text;
        expect(text).toContain('🤖 Available A2A Agents (2 total)');
        expect(text).toContain('agent-1');
        expect(text).toContain('agent-2');
        expect(text).toContain('http://localhost:3001');
        expect(text).toContain('http://localhost:3002');
      }
    });

    it('should filter by status', async () => {
      mockRegistry.listActive.mockReturnValue([
        {
          agentId: 'agent-1',
          baseUrl: 'http://localhost:3001',
          port: 3001,
          status: 'active',
          lastHeartbeat: '2024-01-01T00:00:00Z',
        },
      ]);

      const args = {
        status: 'active' as const,
      };

      const result = await handlers.handleA2AListAgents(args);

      expect(result.content).toHaveLength(1);
      expect(mockRegistry.listActive).toHaveBeenCalled();
    });

    it('should handle empty agent list', async () => {
      mockRegistry.listActive.mockReturnValue([]);

      const args = {};

      const result = await handlers.handleA2AListAgents(args);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('No agents available');
      }
    });
  });
});
