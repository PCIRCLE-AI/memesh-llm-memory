import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AClient } from '../../../src/a2a/client/A2AClient.js';
import { AgentRegistry } from '../../../src/a2a/storage/AgentRegistry.js';

/**
 * Test suite for A2AClient.updateTaskState()
 *
 * ✅ FIX ISSUE-8: Add comprehensive tests for updateTaskState method
 *
 * Coverage:
 * - Success path: Update to COMPLETED with result
 * - Failure path: Update to FAILED with error
 * - HTTP errors with consistent error handling
 * - Edge cases (empty result/error, JSON parsing errors)
 *
 * Note: Security validations are performed server-side, not client-side
 */
describe('A2AClient - updateTaskState', () => {
  let client: A2AClient;
  let registry: AgentRegistry;
  const mockAgentId = 'test-agent-123';
  const mockTaskId = 'task-456';

  beforeEach(() => {
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';
    registry = AgentRegistry.getInstance();
    registry.register({
      agentId: mockAgentId,
      baseUrl: 'http://localhost:3000',
      port: 3000,
      status: 'active',
      lastHeartbeat: new Date().toISOString(),
    });
    client = new A2AClient();
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
    vi.restoreAllMocks();
  });

  describe('Success path', () => {
    it('should update state to COMPLETED with result', async () => {
      const mockResult = {
        answer: 42,
        calculation: '2 + 2',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            taskId: mockTaskId,
            state: 'COMPLETED',
            updatedAt: '2026-02-05T10:00:00.000Z',
          },
        }),
      } as Response);

      await client.updateTaskState(mockTaskId, 'COMPLETED', {
        result: mockResult,
      });

      // Verify HTTP method is PATCH (not POST)
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/a2a/tasks/${mockTaskId}/state`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
          body: JSON.stringify({
            state: 'COMPLETED',
            result: mockResult,
          }),
        })
      );
    });

    it('should update state to FAILED with error', async () => {
      const mockError = 'Task execution failed due to timeout';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            taskId: mockTaskId,
            state: 'FAILED',
            updatedAt: '2026-02-05T10:00:00.000Z',
          },
        }),
      } as Response);

      await client.updateTaskState(mockTaskId, 'FAILED', {
        error: mockError,
      });

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/a2a/tasks/${mockTaskId}/state`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            state: 'FAILED',
            error: mockError,
          }),
        })
      );
    });

    it('should update state without result or error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            taskId: mockTaskId,
            state: 'WORKING',
            updatedAt: '2026-02-05T10:00:00.000Z',
          },
        }),
      } as Response);

      await client.updateTaskState(mockTaskId, 'WORKING');

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/a2a/tasks/${mockTaskId}/state`,
        expect.objectContaining({
          body: JSON.stringify({
            state: 'WORKING',
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should wrap HTTP 400 error with consistent error format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Cannot transition from COMPLETED to WORKING',
        }),
      } as Response);

      await expect(
        client.updateTaskState(mockTaskId, 'WORKING')
      ).rejects.toThrow(/Failed to update task.*WORKING.*HTTP error 400/);
    });

    it('should wrap HTTP 404 error with consistent error format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Task not found',
        }),
      } as Response);

      await expect(
        client.updateTaskState(mockTaskId, 'COMPLETED')
      ).rejects.toThrow(/Failed to update task.*COMPLETED.*HTTP error 404/);
    });

    it('should wrap HTTP 500 error with consistent error format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Database connection failed',
        }),
      } as Response);

      await expect(
        client.updateTaskState(mockTaskId, 'COMPLETED')
      ).rejects.toThrow(/Failed to update task.*COMPLETED.*HTTP error 500/);
    });

    it('should handle JSON parsing error gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      // Should still throw error even if JSON parsing fails
      await expect(
        client.updateTaskState(mockTaskId, 'COMPLETED')
      ).rejects.toThrow(/Failed to update task/);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined result/error gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            taskId: mockTaskId,
            state: 'COMPLETED',
            updatedAt: '2026-02-05T10:00:00.000Z',
          },
        }),
      } as Response);

      await client.updateTaskState(mockTaskId, 'COMPLETED', {
        result: undefined,
      });

      const call = (fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.result).toBeUndefined();
    });

    it('should handle empty result object', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            taskId: mockTaskId,
            state: 'COMPLETED',
            updatedAt: '2026-02-05T10:00:00.000Z',
          },
        }),
      } as Response);

      await client.updateTaskState(mockTaskId, 'COMPLETED', {
        result: {},
      });

      const call = (fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.result).toEqual({});
    });

    it('should send both result and error when provided (though semantically incorrect)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            taskId: mockTaskId,
            state: 'COMPLETED',
            updatedAt: '2026-02-05T10:00:00.000Z',
          },
        }),
      } as Response);

      // This is semantically incorrect but client doesn't validate
      await client.updateTaskState(mockTaskId, 'COMPLETED', {
        result: { data: 'test' },
        error: 'some error',
      });

      const call = (fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.result).toEqual({ data: 'test' });
      expect(body.error).toBe('some error');
    });
  });
});
