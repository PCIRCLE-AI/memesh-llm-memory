import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AClient } from '../../../src/a2a/client/A2AClient.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

/**
 * Helper to create a mock Response with proper headers
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

describe('A2AClient', () => {
  let client: A2AClient;

  beforeEach(() => {
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';
    client = new A2AClient();
    mockFetch.mockClear();
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
  });

  describe('sendMessage', () => {
    it('should include Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: { taskId: 'task-123', status: 'PENDING' }
        }
      }));

      // Mock registry to return a valid agent
      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        }),
        getInstance: vi.fn()
      };
      (client as any).registry = mockRegistry;

      await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test task',
        priority: 'high'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/a2a/send-message',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });

    it('should throw error if token not configured', async () => {
      delete process.env.MEMESH_A2A_TOKEN;

      // Mock registry to return a valid agent
      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'task',
          priority: 'high'
        })
      ).rejects.toThrow(/MEMESH_A2A_TOKEN not configured|Failed to send message/);
    });

    it('should throw error on 401 response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: false,
        status: 401,
        data: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
        }
      }));

      // Mock registry to return a valid agent
      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'task',
          priority: 'high'
        })
      ).rejects.toThrow('Authentication failed - invalid A2A token');
    });
  });

  describe('getTask', () => {
    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: { taskId: 'task-123', status: 'COMPLETED' }
        }
      }));

      // Mock registry to return a valid agent
      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      await client.getTask('agent-b', 'task-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/a2a/tasks/task-123',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });
  });

  describe('listTasks', () => {
    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: []
        }
      }));

      // Mock registry to return a valid agent
      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      await client.listTasks('agent-b');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/a2a/tasks?'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });
  });

  describe('cancelTask', () => {
    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: { taskId: 'task-123', status: 'CANCELLED' }
        }
      }));

      // Mock registry to return a valid agent
      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      await client.cancelTask('agent-b', 'task-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/a2a/tasks/task-123/cancel',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });
  });

  describe('getAgentCard', () => {
    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            agentId: 'agent-b',
            name: 'Agent B',
            capabilities: []
          }
        }
      }));

      // Mock registry to return a valid agent
      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      await client.getAgentCard('agent-b');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/a2a/agent-card',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });
  });

  describe('Content-Type validation', () => {
    it('should accept application/json content type', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        contentType: 'application/json',
        data: {
          success: true,
          data: { taskId: 'task-123', status: 'PENDING' }
        }
      }));

      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test task',
        priority: 'high'
      });

      expect(result).toEqual({ taskId: 'task-123', status: 'PENDING' });
    });

    it('should accept application/json with charset', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        contentType: 'application/json; charset=utf-8',
        data: {
          success: true,
          data: { taskId: 'task-123', status: 'PENDING' }
        }
      }));

      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test task',
        priority: 'high'
      });

      expect(result).toEqual({ taskId: 'task-123', status: 'PENDING' });
    });

    it('should throw error on wrong Content-Type', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        status: 200,
        contentType: 'text/html',
        data: '<html>Error page</html>'
      }));

      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      await expect(
        client.sendMessage('agent-b', {
          sourceAgentId: 'agent-a',
          task: 'test task',
          priority: 'high'
        })
      ).rejects.toThrow(/Unexpected Content-Type: text\/html/);
    });

    it('should warn but not fail on missing Content-Type header', async () => {
      // Create response with null content-type (simulating missing header)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        url: 'http://localhost:3000/test',
        headers: {
          get: () => null // Missing Content-Type
        },
        json: async () => ({
          success: true,
          data: { taskId: 'task-123', status: 'PENDING' }
        })
      });

      const mockRegistry = {
        get: vi.fn().mockReturnValue({
          agentId: 'agent-b',
          baseUrl: 'http://localhost:3000'
        })
      };
      (client as any).registry = mockRegistry;

      // Should not throw, just warn
      const result = await client.sendMessage('agent-b', {
        sourceAgentId: 'agent-a',
        task: 'test task',
        priority: 'high'
      });

      expect(result).toEqual({ taskId: 'task-123', status: 'PENDING' });
    });
  });
});
