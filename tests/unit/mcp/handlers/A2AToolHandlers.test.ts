/**
 * A2AToolHandlers Test Suite
 *
 * ✅ FIX MAJOR-18: Add test coverage for A2A tool routes
 *
 * Tests cover:
 * - a2a-send-task (handleA2ASendTask)
 * - a2a-get-task (handleA2AGetTask)
 * - a2a-list-agents (handleA2AListAgents)
 * - Input validation
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { A2AToolHandlers } from '../../../../src/mcp/handlers/A2AToolHandlers.js';
import { ValidationError } from '../../../../src/errors/index.js';
import type { A2AClient } from '../../../../src/a2a/client/A2AClient.js';
import type { AgentRegistry } from '../../../../src/core/AgentRegistry.js';

describe('A2AToolHandlers', () => {
  let handlers: A2AToolHandlers;
  let mockClient: A2AClient;
  let mockRegistry: AgentRegistry;

  beforeEach(() => {
    // Mock A2AClient
    mockClient = {
      sendMessage: vi.fn().mockResolvedValue({
        taskId: 'task-123',
        state: 'SUBMITTED',
      }),
      getTask: vi.fn().mockResolvedValue({
        id: 'task-123',
        state: 'WORKING',
        name: 'Test Task',
        description: 'Test task description',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            role: 'user',
            parts: [
              {
                type: 'text',
                text: 'Test message',
              },
            ],
          },
        ],
        artifacts: [],
      }),
      listTasks: vi.fn().mockResolvedValue([
        {
          id: 'task-1',
          state: 'SUBMITTED',
          name: 'Task 1',
          priority: 'high',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          state: 'WORKING',
          name: 'Task 2',
          priority: 'medium',
          createdAt: new Date().toISOString(),
        },
      ]),
    } as unknown as A2AClient;

    // Mock AgentRegistry
    mockRegistry = {
      listActive: vi.fn().mockReturnValue([
        {
          agentId: 'agent-1',
          baseUrl: 'http://localhost:3000',
          port: 3000,
          status: 'active',
          lastHeartbeat: new Date().toISOString(),
        },
        {
          agentId: 'agent-2',
          baseUrl: 'http://localhost:3001',
          port: 3001,
          status: 'inactive',
          lastHeartbeat: new Date().toISOString(),
        },
      ]),
    } as unknown as AgentRegistry;

    handlers = new A2AToolHandlers(mockClient, mockRegistry);
  });

  describe('handleA2ASendTask', () => {
    it('should send task successfully with valid input', async () => {
      const args = {
        targetAgentId: 'agent-test',
        taskDescription: 'Build a React component',
        metadata: { priority: 'high' },
      };

      const result = await handlers.handleA2ASendTask(args);

      expect(mockClient.sendMessage).toHaveBeenCalledWith('agent-test', {
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

      expect(mockClient.getTask).toHaveBeenCalledWith('agent-test', 'task-123');
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Task sent to agent: agent-test');
      expect(result.content[0].text).toContain('task-123');
    });

    it('should validate required fields', async () => {
      const invalidArgs = {
        taskDescription: 'Test task',
        // missing targetAgentId
      };

      await expect(handlers.handleA2ASendTask(invalidArgs)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle client errors gracefully', async () => {
      mockClient.sendMessage = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const args = {
        targetAgentId: 'agent-test',
        taskDescription: 'Test task',
      };

      await expect(handlers.handleA2ASendTask(args)).rejects.toThrow(
        'Failed to send task to agent agent-test: Network error'
      );
    });
  });

  describe('handleA2AGetTask', () => {
    it('should get task details successfully', async () => {
      const args = {
        targetAgentId: 'agent-test',
        taskId: 'task-123',
      };

      const result = await handlers.handleA2AGetTask(args);

      expect(mockClient.getTask).toHaveBeenCalledWith('agent-test', 'task-123');
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('task-123');
      expect(result.content[0].text).toContain('WORKING');
    });

    it('should validate required fields', async () => {
      const invalidArgs = {
        targetAgentId: 'agent-test',
        // missing taskId
      };

      await expect(handlers.handleA2AGetTask(invalidArgs)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle not found errors', async () => {
      mockClient.getTask = vi
        .fn()
        .mockRejectedValue(new Error('Task not found'));

      const args = {
        targetAgentId: 'agent-test',
        taskId: 'non-existent',
      };

      await expect(handlers.handleA2AGetTask(args)).rejects.toThrow(
        'Failed to get task non-existent from agent agent-test: Task not found'
      );
    });
  });

  describe('handleA2AListAgents', () => {
    it('should list all agents when status is "all"', async () => {
      const args = {
        status: 'all',
      };

      const result = await handlers.handleA2AListAgents(args);

      expect(mockRegistry.listActive).toHaveBeenCalled();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('agent-1');
      expect(result.content[0].text).toContain('agent-2');
    });

    it('should filter agents by status when provided', async () => {
      const args = {
        status: 'active',
      };

      const result = await handlers.handleA2AListAgents(args);

      expect(mockRegistry.listActive).toHaveBeenCalled();
      expect(result.content[0].text).toContain('agent-1');
      expect(result.content[0].text).not.toContain('agent-2'); // inactive agent filtered out
    });

    it('should default to showing all agents when status not provided', async () => {
      const args = {};

      const result = await handlers.handleA2AListAgents(args);

      expect(mockRegistry.listActive).toHaveBeenCalled();
      expect(result.content[0].text).toContain('agent-1');
      expect(result.content[0].text).toContain('agent-2');
    });

    it('should handle registry errors gracefully', async () => {
      mockRegistry.listActive = vi
        .fn()
        .mockImplementation(() => {
          throw new Error('Registry unavailable');
        });

      const args = {};

      await expect(handlers.handleA2AListAgents(args)).rejects.toThrow(
        'Failed to list agents: Registry unavailable'
      );
    });
  });

  describe('Input validation', () => {
    it('should reject null args', async () => {
      await expect(handlers.handleA2ASendTask(null)).rejects.toThrow(
        ValidationError
      );
      await expect(handlers.handleA2AGetTask(null)).rejects.toThrow(
        ValidationError
      );
    });

    it('should reject undefined args', async () => {
      await expect(handlers.handleA2ASendTask(undefined)).rejects.toThrow(
        ValidationError
      );
      await expect(handlers.handleA2AGetTask(undefined)).rejects.toThrow(
        ValidationError
      );
    });

    it('should reject args with wrong types', async () => {
      const invalidArgs = {
        targetAgentId: 123, // should be string
        taskDescription: true, // should be string
      };

      await expect(handlers.handleA2ASendTask(invalidArgs)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
