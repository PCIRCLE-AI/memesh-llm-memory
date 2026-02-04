/**
 * A2AClient Retry Mechanism Tests
 *
 * Tests retry behavior with exponential backoff for A2A HTTP operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AClient } from '../../../src/a2a/client/A2AClient.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

/**
 * Helper to create a mock Response with proper headers for validateContentType
 * @param options - Response options
 * @returns Mock Response object
 */
function createMockResponse(options: {
  ok: boolean;
  status: number;
  data?: unknown;
  contentType?: string;
}) {
  return {
    ok: options.ok,
    status: options.status,
    url: 'http://localhost:3000/test',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return options.contentType ?? 'application/json';
        }
        return null;
      },
    },
    json: async () => options.data,
  };
}

describe('A2AClient - Retry Mechanism', () => {
  let client: A2AClient;
  const mockRegistry = {
    get: vi.fn().mockReturnValue({
      agentId: 'agent-b',
      baseUrl: 'http://localhost:3000',
    }),
    getInstance: vi.fn(),
  };

  beforeEach(() => {
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';
    // Configure aggressive retry for faster tests
    process.env.A2A_RETRY_MAX_ATTEMPTS = '3';
    process.env.A2A_RETRY_INITIAL_DELAY_MS = '10'; // 10ms for faster tests
    process.env.A2A_RETRY_TIMEOUT_MS = '5000';

    client = new A2AClient();
    (client as any).registry = mockRegistry;
    mockFetch.mockClear();
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
    delete process.env.A2A_RETRY_MAX_ATTEMPTS;
    delete process.env.A2A_RETRY_INITIAL_DELAY_MS;
    delete process.env.A2A_RETRY_TIMEOUT_MS;
    vi.clearAllTimers();
  });

  describe('Retry on 5xx errors', () => {
    it('should retry on 500 Internal Server Error', async () => {
      // First 2 attempts fail with 500, 3rd succeeds
      mockFetch
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 500,
          data: {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Server error' },
          },
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 500,
          data: {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Server error' },
          },
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: { taskId: 'task-123', status: 'PENDING' },
          },
        }));

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test task',
        priority: 'high',
      });

      expect(result.taskId).toBe('task-123');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 503 Service Unavailable', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 503,
          data: {
            success: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Service down' },
          },
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: { taskId: 'task-456', status: 'PENDING' },
          },
        }));

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test task',
        priority: 'normal',
      });

      expect(result.taskId).toBe('task-456');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 502 Bad Gateway', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 502,
          data: {
            success: false,
            error: { code: 'BAD_GATEWAY', message: 'Gateway error' },
          },
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: { taskId: 'task-789', status: 'PENDING' },
          },
        }));

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test',
        priority: 'low',
      });

      expect(result.taskId).toBe('task-789');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry on 429 Rate Limit', () => {
    it('should retry on 429 Too Many Requests', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 429,
          data: {
            success: false,
            error: { code: 'RATE_LIMIT', message: 'Too many requests' },
          },
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: { taskId: 'task-rate-limit', status: 'PENDING' },
          },
        }));

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test',
        priority: 'normal',
      });

      expect(result.taskId).toBe('task-rate-limit');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Do NOT retry on 4xx client errors', () => {
    it('should NOT retry on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 401,
        data: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        },
      }));

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow();

      // Should only attempt once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 403 Forbidden', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 403,
        data: {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        },
      }));

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 404,
        data: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        },
      }));

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 400,
        data: {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid request' },
        },
      }));

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry exhaustion', () => {
    it('should throw error after max retries exhausted', async () => {
      // All attempts fail
      mockFetch.mockResolvedValue(createMockResponse({
        ok: false,
        status: 503,
        data: {
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Service down' },
        },
      }));

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow();

      // Should attempt 4 times: initial + 3 retries
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Network errors', () => {
    it('should retry on network timeout', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: { taskId: 'task-network', status: 'PENDING' },
          },
        }));

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test',
        priority: 'normal',
      });

      expect(result.taskId).toBe('task-network');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on connection refused', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: { taskId: 'task-conn', status: 'PENDING' },
          },
        }));

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test',
        priority: 'normal',
      });

      expect(result.taskId).toBe('task-conn');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTask retry behavior', () => {
    it('should retry getTask on 500 error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 500,
          data: {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Server error' },
          },
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: {
              id: 'task-123',
              state: 'COMPLETED',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:01:00Z',
              messages: [],
              artifacts: [],
            },
          },
        }));

      const task = await client.getTask('agent-b', 'task-123');

      expect(task.id).toBe('task-123');
      expect(task.state).toBe('COMPLETED');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry getTask on 404', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 404,
        data: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Task not found' },
        },
      }));

      await expect(client.getTask('agent-b', 'task-404')).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom retry configuration', () => {
    it('should respect custom maxRetries', async () => {
      const customClient = new A2AClient({ maxRetries: 1 });
      (customClient as any).registry = mockRegistry;

      mockFetch.mockResolvedValue(createMockResponse({
        ok: false,
        status: 503,
        data: {
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Down' },
        },
      }));

      await expect(
        customClient.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow();

      // Should attempt 2 times: initial + 1 retry
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Local errors should NOT retry', () => {
    it('should NOT retry on AGENT_NOT_FOUND (local validation error)', async () => {
      // Mock registry to return null (agent not found)
      mockRegistry.get.mockReturnValueOnce(null);

      await expect(
        client.sendMessage('unknown-agent', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow(/Agent not found/);

      // Should NOT retry local validation errors
      // fetch should NEVER be called because error happens before HTTP request
      expect(mockFetch).toHaveBeenCalledTimes(0);
    });

    it('should NOT retry on AUTH_TOKEN_NOT_CONFIGURED (local error)', async () => {
      // Remove token to trigger local validation error
      delete process.env.MEMESH_A2A_TOKEN;

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow(/MEMESH_A2A_TOKEN/);

      // Should NOT retry local validation errors
      expect(mockFetch).toHaveBeenCalledTimes(0);

      // Restore token for other tests
      process.env.MEMESH_A2A_TOKEN = 'test-token-123';
    });

    it('should NOT retry on errors without HTTP status code', async () => {
      // Mock a generic error without status (simulates Zod validation error)
      mockFetch.mockRejectedValueOnce(new Error('Validation failed: invalid schema'));

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test',
          priority: 'normal',
        })
      ).rejects.toThrow();

      // Should attempt only once (no retry on local errors)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors with standard error codes', async () => {
      // Network errors (ETIMEDOUT, ECONNREFUSED) should still retry
      // These are real network issues, not local validation errors
      mockFetch
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          data: {
            success: true,
            data: { taskId: 'task-network-retry', status: 'PENDING' },
          },
        }));

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test',
        priority: 'normal',
      });

      expect(result.taskId).toBe('task-network-retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
